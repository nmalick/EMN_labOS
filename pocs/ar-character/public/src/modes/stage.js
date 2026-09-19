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

const CAM_HEIGHT = 1.4;        // where the phone is, metres above the floor
const SAFE_V = 0.80;           // fraction of the vertical half-FOV we will use
const SAFE_H = 0.70;           // and horizontal — keeps it off the edges
const DEPTH_SPAN = 1.8;        // far bound as a multiple of the near bound
const EDGE_PAD = 0.30;         // metres reserved for the character's own width
const WALK_SPEED = 0.55;
const PAUSE_RANGE = [1.2, 3.2];

export class StageMode {
  constructor({ video, canvas, hud, onStatus }) {
    this.video = video;
    this.canvas = canvas;
    this.hud = hud;
    this.onStatus = onStatus ?? (() => {});

    this.stream = null;
    this.torch = null;
    this.running = false;
    this.clock = new THREE.Clock();

    this.target = new THREE.Vector3();
    this.pause = 0.8;
    this._fps = 0;

    this._onResize = () => this._resize();
    this._onTap = (e) => this._tap(e);
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
    this.character.root.position.set(0, 0, -this.bounds.zNear * 1.15);
    this._pickTarget();

    addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onTap);

    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this._frame());
    this.onStatus(null);
  }

  async stop() {
    this.running = false;
    this.renderer?.setAnimationLoop(null);
    removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('pointerdown', this._onTap);

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
    this.camera.position.set(0, CAM_HEIGHT, 0);

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
   * The floor rectangle that is actually on screen.
   *
   * Near bound: close enough and the feet fall below the bottom edge, so it is
   * set by whichever of feet or head leaves the frustum first. Width tapers
   * with depth because the frustum does.
   */
  _computeBounds() {
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const h = this.character?.height ?? 1.6;

    const vLimit = Math.tan((vFov / 2) * SAFE_V);
    const zFeet = CAM_HEIGHT / vLimit;
    const zHead = h > CAM_HEIGHT ? (h - CAM_HEIGHT) / vLimit : 0;

    const zNear = Math.max(zFeet, zHead, 1.2);
    this.bounds = {
      zNear,
      zFar: zNear * DEPTH_SPAN,
      halfAt: (z) => Math.max(0.1, z * Math.tan(hFov / 2) * SAFE_H - EDGE_PAD),
    };
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
    this.hud.obs.textContent = `${(-p.z).toFixed(1)}m`;
    this.hud.fps.textContent = this._fps.toFixed(0);
  }
}
