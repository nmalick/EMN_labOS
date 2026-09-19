import * as THREE from 'three';
import { Character } from '../character.js';
import { Torch } from '../torch.js';

/**
 * Stage mode — a bounded patch of floor, locked to the screen.
 *
 * Room mode tries to anchor the character to YOUR world, which means it lives
 * or dies by ARCore's tracking: if hit-test cannot lock your floor, nothing
 * works, and once anchored the character happily sits behind you.
 *
 * Stage mode gives that up on purpose. The camera never moves, so the visible
 * frame IS the stage. The character walks a floor rectangle computed from the
 * actual frustum, so by construction it cannot leave the screen — no tracking,
 * no hit-test, no session, nothing to fail. It moves with the phone rather than
 * staying put in the room, which is the honest trade for always working.
 *
 * Needs only getUserMedia, so unlike Room mode this also runs on iPhone.
 */

// Apparent size is chosen FIRST, and the geometry is derived from it.
//
// The earlier version did the reverse: it assumed the phone was 1.4m above a
// floor and solved for a distance that kept the feet in frame. That forced the
// character out to 3-5m no matter what you were pointing at, so held a metre
// from a worktop it read as the wrong size — because the assumption, not the
// maths, was wrong. Stage mode is a stage, not a room, so there is no real
// floor to be faithful to.
const FILL_DEFAULT = 0.45;     // fraction of screen height the body occupies
const FILL_RANGE = [0.15, 0.75];   // 0.75/0.90 + HEAD_MARGIN = FEET_MAX
const FEET_AT = 0.74;          // where the feet sit, as a fraction down the screen
const FEET_MAX = 0.92;         // ...but they give way when the body needs the room
const HEAD_MARGIN = 0.06;      // keep this much clear above the head
const SAFE_H = 0.70;           // horizontal margin — keeps it off the edges
// Walkable depth, as a multiple of the set distance. Kept tight on purpose:
// the character's apparent size varies as 1/depth, so a wide band makes the
// size you pinched drift away as it walks. +/-11% is not noticeable.
const DEPTH_SPAN = [0.90, 1.12];
const EDGE_PAD = 0.30;         // metres reserved for the character's own width
const WALK_SPEED = 0.55;
const PAUSE_RANGE = [1.2, 3.2];
const FILL_STORE = 'ar-character.stage.fill';

export class StageMode {
  constructor({ video, canvas, hud, hint, onStatus }) {
    this.video = video;
    this.canvas = canvas;
    this.hud = hud;
    this.hint = hint;
    this.onStatus = onStatus ?? (() => {});

    this.stream = null;
    this.torch = null;
    this.running = false;
    this.clock = new THREE.Clock();

    this.target = new THREE.Vector3();
    this.pause = 0.8;

    let stored = NaN;
    try { stored = parseFloat(localStorage.getItem(FILL_STORE)); } catch { /* private mode */ }
    this.fill = Number.isFinite(stored) ? stored : FILL_DEFAULT;
    this.pinch = null;
    this._fps = 0;

    this.pointers = new Map();

    this._onResize = () => this._resize();
    this._onDown = (e) => this._down(e);
    this._onMove = (e) => this._move(e);
    this._onUp = (e) => this._up(e);
  }

  async start() {
    this.onStatus('requesting camera');
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    this.video.srcObject = this.stream;
    this.video.classList.remove('hidden');
    await this.video.play();

    this.torch = new Torch(this.stream);

    this.onStatus('loading character');
    this._buildScene();
    this.character = await Character.load('./assets/character.glb', { targetHeight: 1.6 });
    this.scene.add(this.character.root);

    this._computeBounds();
    this.character.root.position.set(0, 0, -this.bounds.distance);
    this._pickTarget();

    addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onDown);
    this.canvas.addEventListener('pointermove', this._onMove);
    this.canvas.addEventListener('pointerup', this._onUp);
    this.canvas.addEventListener('pointercancel', this._onUp);

    // Pinch is not discoverable, so say it once.
    if (this.hint) {
      this.hint.textContent = 'Pinch to resize · tap to move';
      this.hint.classList.remove('hidden');
      this._hintTimer = setTimeout(() => this.hint.classList.add('hidden'), 4500);
    }

    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this._frame());
    this.onStatus(null);
  }

  async stop() {
    this.running = false;
    this.renderer?.setAnimationLoop(null);
    removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('pointerdown', this._onDown);
    this.canvas.removeEventListener('pointermove', this._onMove);
    this.canvas.removeEventListener('pointerup', this._onUp);
    this.canvas.removeEventListener('pointercancel', this._onUp);
    clearTimeout(this._hintTimer);
    this.hint?.classList.add('hidden');

    await this.torch?.off();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
    this.video.classList.add('hidden');

    this.character?.dispose();
    this.renderer?.dispose();
  }

  emote(name = 'Wave') { this.character?.trigger(name); }

  get torchAvailable() { return !!this.torch?.available; }
  async toggleTorch() { return this.torch ? this.torch.toggle() : false; }

  // --- scene ---------------------------------------------------------------

  _buildScene() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, alpha: true, antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setClearAlpha(0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();

    // Fixed. Never rotated — that is what makes the frame a stage.
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 60);
    this.camera.position.set(0, 1, 0);   // replaced by _computeBounds()

    this.scene.add(new THREE.HemisphereLight(0xf2f6ff, 0x6b6357, 2.3));
    const key = new THREE.DirectionalLight(0xfff6e8, 1.6);
    key.position.set(2, 6, 1);
    this.scene.add(key);

    this.contact = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false,
      }),
    );
    this.scene.add(this.contact);
  }

  /**
   * Geometry from the chosen apparent size.
   *
   *   distance    so the body subtends `fill` of the vertical FOV
   *   cameraY     so the feet land at FEET_AT down the screen, which keeps the
   *               framing identical at every size
   *   width       tapers with depth, because the frustum does
   */
  _computeBounds() {
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const h = this.character?.height ?? 1.6;

    // Fraction of screen HEIGHT, not of the FOV angle. Screen position is
    // tan-based, so solving `body subtends vFov*fill degrees` is a different
    // (and wrong) quantity: it undershot by a few percent at every size.
    //   screenFrac = h / (2 * d * tan(vFov/2))   =>   d = h / (2 * F * tan(vFov/2))
    const d = h / (2 * this.fill * Math.tan(vFov / 2));

    // Feet sit at FEET_AT, except when the body is too tall to fit above that
    // — then they drop far enough to keep the head on screen. Small and medium
    // sizes therefore keep identical framing; only large ones shift down.
    //
    // Budget for the NEAR end of the walk band, not the nominal distance: the
    // character grows by 1/DEPTH_SPAN[0] as it walks toward you, and sizing the
    // margin off nominal let the head clip the top once it did.
    const worstFill = this.fill / DEPTH_SPAN[0];
    const feetAt = Math.min(FEET_MAX, Math.max(FEET_AT, worstFill + HEAD_MARGIN));
    const ndcDown = (feetAt - 0.5) * 2;
    const camY = d * Math.tan(Math.atan(ndcDown * Math.tan(vFov / 2)));
    this.camera.position.y = Math.max(0.15, camY);

    this.bounds = {
      distance: d,
      zNear: d * DEPTH_SPAN[0],
      zFar: d * DEPTH_SPAN[1],
      halfAt: (z) => Math.max(0.08, z * Math.tan(hFov / 2) * SAFE_H - EDGE_PAD),
    };
  }

  /** Change apparent size, keeping the character in view and on the floor. */
  setFill(fill) {
    this.fill = THREE.MathUtils.clamp(fill, ...FILL_RANGE);
    try { localStorage.setItem(FILL_STORE, String(this.fill)); } catch { /* private mode */ }

    const before = this.bounds?.distance ?? 1;
    this._computeBounds();

    // Scale the character's position with the new distance so it does not jump
    // sideways or teleport out of the walkable band when you pinch.
    const k = this.bounds.distance / before;
    const root = this.character?.root;
    if (root) {
      root.position.x *= k;
      root.position.z *= k;
      this._clamp(root.position);
    }
    this.target.multiplyScalar(k);
    this._clamp(this.target);
  }

  _resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this._computeBounds();
    this._clamp(this.character.root.position);
    this._clamp(this.target);
  }

  /** Pull a point back inside the visible floor rectangle. */
  _clamp(p) {
    const z = THREE.MathUtils.clamp(-p.z, this.bounds.zNear, this.bounds.zFar);
    const half = this.bounds.halfAt(z);
    p.z = -z;
    p.x = THREE.MathUtils.clamp(p.x, -half, half);
    p.y = 0;
    return p;
  }

  // --- interaction ---------------------------------------------------------

  _down(e) {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.canvas.setPointerCapture?.(e.pointerId);

    if (this.pointers.size === 2) {
      this.pinch = { span: this._span(), fill: this.fill };
      this._moved = true;   // a pinch is never also a tap
    } else if (this.pointers.size === 1) {
      this._downAt = { x: e.clientX, y: e.clientY };
      this._moved = false;
    }
  }

  _move(e) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pinch && this.pointers.size >= 2) {
      const span = this._span();
      if (span > 0 && this.pinch.span > 0) {
        this.setFill(this.pinch.fill * (span / this.pinch.span));
      }
      return;
    }

    // A drag is not a tap.
    if (this._downAt) {
      const dx = e.clientX - this._downAt.x;
      const dy = e.clientY - this._downAt.y;
      if (dx * dx + dy * dy > 144) this._moved = true;
    }
  }

  _up(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;

    if (this.pointers.size === 0 && !this._moved && this._downAt) {
      this._tap({ clientX: this._downAt.x, clientY: this._downAt.y });
    }
    if (this.pointers.size === 0) this._downAt = null;
  }

  /** Distance between the two active pointers. */
  _span() {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Tap the floor to send it there. */
  _tap(e) {
    const ndc = new THREE.Vector2(
      (e.clientX / innerWidth) * 2 - 1,
      -(e.clientY / innerHeight) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);

    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return;

    this.target.copy(this._clamp(hit));
    this.pause = 0;
  }

  _pickTarget() {
    const z = THREE.MathUtils.randFloat(this.bounds.zNear, this.bounds.zFar);
    const half = this.bounds.halfAt(z);
    this.target.set(THREE.MathUtils.randFloat(-half, half), 0, -z);
  }

  // --- frame ---------------------------------------------------------------

  _frame() {
    if (!this.running) return;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this._fps = this._fps * 0.9 + (dt > 0 ? (1 / dt) * 0.1 : 0);

    this._walk(dt);
    this.character.update(dt);
    this.renderer.render(this.scene, this.camera);
    this._paintHud();
  }

  _walk(dt) {
    const root = this.character.root;
    this.contact.position.set(root.position.x, 0.004, root.position.z);

    if (this.pause > 0) {
      this.pause -= dt;
      this.character.setLocomotion(0);
      // Idle facing the viewer, so it reads as present rather than parked.
      this._turn(-root.position.x, -root.position.z, dt, 2.2);
      if (this.pause <= 0) this._pickTarget();
      return;
    }

    const to = this.target.clone().sub(root.position);
    to.y = 0;
    const dist = to.length();

    if (dist < 0.1) {
      this.pause = THREE.MathUtils.randFloat(...PAUSE_RANGE);
      this.character.setLocomotion(0);
      return;
    }

    to.normalize();
    root.position.addScaledVector(to, Math.min(WALK_SPEED * dt, dist));
    this._clamp(root.position);

    this._turn(to.x, to.z, dt, 3.2);
    this.character.setLocomotion(THREE.MathUtils.clamp(dist / 0.5, 0, 1) * 0.4);
  }

  _turn(dx, dz, dt, rate) {
    if (Math.abs(dx) < 1e-5 && Math.abs(dz) < 1e-5) return;
    const root = this.character.root;
    const want = Math.atan2(dx, dz);
    const d = Math.atan2(Math.sin(want - root.rotation.y), Math.cos(want - root.rotation.y));
    root.rotation.y += THREE.MathUtils.clamp(d, -rate * dt, rate * dt);
  }

  _paintHud() {
    if (!this.hud) return;
    const p = this.character.root.position;
    this.hud.speed.textContent = this.character.speed.toFixed(2);
    this.hud.state.textContent = this.character.state;
    this.hud.obs.textContent = `${Math.round(this.fill * 100)}% · ${(-p.z).toFixed(1)}m`;
    this.hud.fps.textContent = this._fps.toFixed(0);
  }
}
