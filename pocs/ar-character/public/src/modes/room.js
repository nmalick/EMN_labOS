import * as THREE from 'three';
import { Character } from '../character.js';

/**
 * Room mode — real WebXR augmented reality.
 *
 * Here the opposite of Road mode is true: the device is (roughly) still in a
 * rigid world, so ARCore's visual-inertial tracking works and we can genuinely
 * anchor the character to your floor. Hit-test finds the surface, an anchor
 * keeps it there while you walk around it.
 *
 * Requires immersive-ar with hit-test — Android Chrome and headset browsers.
 * iOS Safari exposes no handheld AR session, which the launch probe reports
 * before you get here.
 */

// The character keeps station in front of you rather than wandering freely.
// A portrait phone shows only about +/-18 degrees horizontally, so anything
// that strays more than ~0.5m at conversational range is simply off-screen.
const FOLLOW_DEADZONE = 0.45;  // metres of slack before it bothers moving
const FOLLOW_SPEED_MAX = 1.3;  // metres per second when catching up
const TARGET_FILL = 0.52;      // fraction of screen height it should occupy
const FIT_RANGE = [1.9, 4.0];  // clamp on the derived standing distance

export class RoomMode {
  constructor({ canvas, hud, hint, onStatus, onExit }) {
    this.canvas = canvas;
    this.hud = hud;
    this.hint = hint;
    this.onStatus = onStatus ?? (() => {});
    this.onExit = onExit ?? (() => {});

    this.session = null;
    this.hitTestSource = null;
    this.viewerSpace = null;
    this.placed = false;

    this.floorY = 0;
    this.clock = new THREE.Clock();
    this._fps = 0;
  }

  async start() {
    this.onStatus('loading character');
    this._buildScene();
    this.character = await Character.load('./assets/character.glb', { targetHeight: 1.6 });
    this.character.root.visible = false;
    this.scene.add(this.character.root);

    this.onStatus('starting AR session');
    this.session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      // Requested but not required — the session still starts without them.
      // dom-overlay matters most: without it NO DOM is composited into the AR
      // view, so the hint, the readout and every button are invisible and the
      // only way out is the system back gesture.
      optionalFeatures: ['local-floor', 'anchors', 'plane-detection', 'light-estimation', 'dom-overlay'],
      domOverlay: { root: document.getElementById('ar-overlay') ?? document.body },
    });

    await this.renderer.xr.setSession(this.session);

    this.viewerSpace = await this.session.requestReferenceSpace('viewer');
    this.hitTestSource = await this.session.requestHitTestSource({ space: this.viewerSpace });

    this.session.addEventListener('select', () => this._onSelect());

    // A tap on an overlay button also fires a session-level select, which would
    // place the character underneath the UI. Cancel select for those taps.
    this._onBeforeSelect = (e) => {
      if (e.target.closest?.('.ctl, .hud')) e.preventDefault();
    };
    document.body.addEventListener('beforexrselect', this._onBeforeSelect);

    this.overlayGranted = this.session.domOverlayState?.type != null;
    this.session.addEventListener('end', () => { this.onExit(); });

    this.hint?.classList.remove('hidden');
    this.renderer.setAnimationLoop((t, frame) => this._frame(t, frame));
    this.onStatus(null);
  }

  async stop() {
    this.renderer?.setAnimationLoop(null);
    this.hint?.classList.add('hidden');
    if (this._onBeforeSelect) {
      document.body.removeEventListener('beforexrselect', this._onBeforeSelect);
      this._onBeforeSelect = null;
    }
    this.hitTestSource?.cancel?.();
    this.hitTestSource = null;
    try { await this.session?.end(); } catch { /* already ending */ }
    this.session = null;
    this.character?.dispose();
    this.renderer?.dispose();
  }

  // Inside a WebXR session the UA owns the camera; there is no torch hook.
  get torchAvailable() { return false; }

  emote(name = 'Wave') {
    // Never a dead button: before placement, this places the character (which
    // waves on arrival) rather than silently doing nothing.
    if (!this.placed) { this._onSelect(); return; }
    this.character?.trigger(name);
  }

  // --- scene ---------------------------------------------------------------

  _buildScene() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.xr.enabled = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 40);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8f80, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(1, 5, 1.5);
    this.scene.add(key);

    // Placement reticle.
    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.095, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.95 }),
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    // Cheap contact shadow so the character reads as touching the floor.
    this.contact = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false,
      }),
    );
    this.contact.visible = false;
    this.scene.add(this.contact);
  }

  // --- interaction ---------------------------------------------------------

  _onSelect() {
    this.taps = (this.taps ?? 0) + 1;

    // A surface is preferred, but not required. Requiring it meant that on a
    // floor ARCore could not lock onto, every tap was silently discarded and
    // nothing on screen explained why.
    const p = this.reticle.visible
      ? new THREE.Vector3().setFromMatrixPosition(this.reticle.matrix)
      : this._inFrontOfCamera();

    if (!this.placed) {
      this.placed = true;
      this.floorY = p.y;
      this.character.root.position.copy(p);
      this.character.root.visible = true;
      this.contact.visible = true;
      this.reticle.visible = false;
      this.hint?.classList.add('hidden');
      this.character.trigger('Wave');
    } else {
      // Tapping again snaps it to where you pointed; follow takes over from there.
      this.floorY = p.y;
      this.character.root.position.copy(p);
    }
  }

  /**
   * A point ~1.5m ahead of where you are looking, on the floor.
   * With a local-floor reference space y=0 IS the floor; with plain `local`
   * the origin sits at roughly head height where the session began, so drop
   * by a typical hold height instead.
   */
  /** Camera world position and its forward direction flattened to the floor. */
  _camBasis() {
    const cam = this.renderer.xr.getCamera?.() ?? this.camera;
    const pos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);

    const fwd = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(cam.matrixWorld));
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();

    return { cam, pos, fwd };
  }

  /**
   * How far away the character has to stand to actually fit on screen.
   *
   * Scale in AR is fixed — a 1.6m character is 1.6m — so the only thing that
   * controls apparent size is distance, and the right distance depends on the
   * device's FOV and how high you are holding the phone. Hardcoding it put the
   * feet 43 degrees below centre on a 35-degree half-FOV: literally off-screen.
   *
   * Two constraints, take the stricter:
   *   fill  the whole body should occupy about TARGET_FILL of screen height
   *   feet  the feet must sit inside the lower half-FOV, with margin
   */
  _fitDistance(camY, floorY) {
    // Vertical FOV straight from the projection matrix — in XR this is set by
    // the device, not by our PerspectiveCamera's nominal 70 degrees.
    const { cam } = this._camBasis();
    const m = (cam.isArrayCamera ? cam.cameras?.[0] ?? cam : cam).projectionMatrix.elements[5];
    const vFov = m > 0 ? 2 * Math.atan(1 / m) : THREE.MathUtils.degToRad(70);

    const h = this.character?.height ?? 1.6;
    const eye = Math.max(0.2, camY - floorY);

    const dFill = (h / 2) / Math.tan((vFov * TARGET_FILL) / 2);
    const dFeet = eye / Math.tan(vFov * 0.5 * 0.85);

    return THREE.MathUtils.clamp(Math.max(dFill, dFeet), ...FIT_RANGE);
  }

  _floorY(camY) {
    return this.session?.enabledFeatures?.includes('local-floor') ? 0 : camY - 1.35;
  }

  /** The spot it should be standing in: straight ahead, at the fit distance. */
  _stationPoint() {
    const { pos, fwd } = this._camBasis();
    const floorY = this.placed ? this.floorY : this._floorY(pos.y);
    const d = this._fitDistance(pos.y, floorY);
    return new THREE.Vector3(pos.x + fwd.x * d, floorY, pos.z + fwd.z * d);
  }

  _inFrontOfCamera() {
    return this._stationPoint();
  }

  // --- frame ---------------------------------------------------------------

  _frame(time, frame) {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this._fps = this._fps * 0.9 + (dt > 0 ? (1 / dt) * 0.1 : 0);

    if (frame && !this.placed) {
      this._searching = this.reticle.visible ? 0 : (this._searching ?? 0) + dt;
      this._updateReticle(frame);
    }
    if (this.placed) this._follow(dt);

    this.character.update(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.hud) {
      this.hud.speed.textContent = this.placed ? this.character.speed.toFixed(2) : '—';
      this.hud.state.textContent = this.placed
        ? this.character.state
        : `placing · taps ${this.taps ?? 0}`;
      this.hud.obs.textContent = this.placed ? 'anchored' : (this.reticle.visible ? 'surface' : 'searching');
      this.hud.fps.textContent = this._fps.toFixed(0);
    }
  }

  _setHint(text) {
    if (!this.hint || this.hint.textContent === text) return;
    this.hint.textContent = text;
  }

  _updateReticle(frame) {
    const refSpace = this.renderer.xr.getReferenceSpace();
    const hits = frame.getHitTestResults(this.hitTestSource);

    if (hits.length) {
      const pose = hits[0].getPose(refSpace);
      if (pose) {
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(pose.transform.matrix);
        this._setHint('Tap to place');
        return;
      }
    }

    this.reticle.visible = false;
    // ARCore needs parallax before it can find a surface, so the honest
    // instruction while searching is "move", not "point".
    this._setHint(this._searching > 4
      ? 'No floor found — tap anyway to place it in front of you'
      : 'Move your phone slowly to scan the floor');
  }

  /**
   * Keep station in front of the camera.
   *
   * Still real AR — it walks the floor and stays anchored to it. But its target
   * is wherever you are looking rather than a random point, so panning or
   * walking makes it follow you instead of sliding out of frame. A deadzone
   * stops it shuffling every time you breathe.
   */
  _follow(dt) {
    const root = this.character.root;
    this.contact.position.set(root.position.x, root.position.y + 0.005, root.position.z);

    const station = this._stationPoint();
    const to = station.clone().sub(root.position);
    to.y = 0;
    const dist = to.length();

    const { pos: camPos } = this._camBasis();

    if (dist <= FOLLOW_DEADZONE) {
      // Settled: stand still and turn to face you.
      this.character.setLocomotion(0);
      this._turnTowards(camPos.x - root.position.x, camPos.z - root.position.z, dt, 2.5);
      return;
    }

    // Catch up faster the further behind it is, so a quick pan does not lose it.
    const over = dist - FOLLOW_DEADZONE;
    const speed = Math.min(FOLLOW_SPEED_MAX, 0.35 + over * 1.1);

    to.normalize();
    root.position.addScaledVector(to, Math.min(speed * dt, dist - FOLLOW_DEADZONE * 0.5));
    root.position.y = this.floorY;

    this._turnTowards(to.x, to.z, dt, 3.5);
    this.character.setLocomotion(THREE.MathUtils.clamp(speed / FOLLOW_SPEED_MAX, 0, 1) * 0.85);
  }

  /** Yaw toward a horizontal direction, rate-limited so it pivots. */
  _turnTowards(dx, dz, dt, rate) {
    if (Math.abs(dx) < 1e-5 && Math.abs(dz) < 1e-5) return;
    const root = this.character.root;
    const want = Math.atan2(dx, dz);
    const delta = Math.atan2(Math.sin(want - root.rotation.y), Math.cos(want - root.rotation.y));
    root.rotation.y += THREE.MathUtils.clamp(delta, -rate * dt, rate * dt);
  }

}
