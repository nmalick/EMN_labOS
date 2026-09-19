import * as THREE from 'three';
import { Character } from '../character.js';
import { FlowEstimator } from '../perception/flow.js';
import { ObstacleTracker } from '../perception/obstacles.js';
import { Torch } from '../torch.js';

/**
 * Road mode — character composited over the live camera feed.
 *
 * No WebXR, no SLAM. Pose tracking cannot work from a moving vehicle: visual-
 * inertial odometry assumes one rigid world and a car gives it two (the still
 * interior, the landscape tearing past), so it attributes vehicle motion to
 * drift and overcorrects. We don't need it either — a character that keeps pace
 * with the car is camera-relative by definition. World-anchoring it would fling
 * it out of frame in the first second.
 *
 * So: the camera never translates. It only rotates, from the device gyro. The
 * character stands on an implied ground plane a fixed distance away and runs on
 * the spot; the real scenery scrolling past supplies all the sense of speed.
 */

const CAMERA_HEIGHT = 1.2;   // phone height in a car seat, metres
const CHAR_DISTANCE = 7.0;   // metres out from the camera
const RECENTER_TAU = 1.35;   // seconds for the character to drift back to centre
const VAULT_COOLDOWN = 1.6;  // seconds between parkour moves
const COAST_TAU = 0.45;      // seconds to coast when the feed goes untrackable
const VAULT_MIN_STRENGTH = 0.45; // ignore weak edges — vault real structures only

export class RoadMode {
  constructor({ video, canvas, hud, onStatus }) {
    this.video = video;
    this.canvas = canvas;
    this.hud = hud;
    this.onStatus = onStatus ?? (() => {});

    this.stream = null;
    this.torch = null;
    this.running = false;
    this.clock = new THREE.Clock();

    this.flow = new FlowEstimator();
    this.obstacles = new ObstacleTracker({ flowWidth: 64 });

    this.orientation = null;     // {alpha,beta,gamma} radians
    this.screenAngle = 0;
    this.gpsSpeed = null;        // m/s when the device reports it
    this._geoWatch = null;

    this.anchorYaw = 0;          // world yaw the character sits at
    this.cooldown = 0;
    this._fps = 0;

    this._onOrient = (e) => this._readOrientation(e);
    this._onScreen = () => this._readScreenAngle();
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

    this.onStatus('starting sensors');
    await this._startOrientation();
    this._startGeolocation();

    this.onStatus('loading character');
    this._buildScene();
    this.character = await Character.load('./assets/character.glb', { targetHeight: 1.75 });
    this.scene.add(this.character.root);

    this._readScreenAngle();
    window.addEventListener('orientationchange', this._onScreen);
    window.addEventListener('resize', this._onScreen);

    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this._frame());
    this.onStatus(null);
  }

  stop() {
    this.running = false;
    this.renderer?.setAnimationLoop(null);

    window.removeEventListener('deviceorientation', this._onOrient);
    window.removeEventListener('orientationchange', this._onScreen);
    window.removeEventListener('resize', this._onScreen);
    if (this._geoWatch != null) navigator.geolocation.clearWatch(this._geoWatch);

    this.torch?.off();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
    this.video.classList.add('hidden');

    this.character?.dispose();
    this.renderer?.dispose();
  }

  /** Fire an emote on demand (the wave button). */
  emote(name = 'Wave') { this.character?.trigger(name); }

  get torchAvailable() { return !!this.torch?.available; }
  async toggleTorch() { return this.torch ? this.torch.toggle() : false; }

  // --- scene ---------------------------------------------------------------

  _buildScene() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setClearAlpha(0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();

    // Roughly a phone rear camera. Not calibrated — it only has to look right.
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 200);
    this.camera.position.set(0, CAMERA_HEIGHT, 0);

    // Outdoor daylight: bright sky bounce plus a key from high and to the side.
    this.scene.add(new THREE.HemisphereLight(0xdceaff, 0x55503f, 2.4));
    const key = new THREE.DirectionalLight(0xfff4e0, 2.0);
    key.position.set(3, 8, 2);
    this.scene.add(key);

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }

  // --- sensors -------------------------------------------------------------

  async _startOrientation() {
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) return;

    // iOS 13+ requires an explicit grant, from a user gesture, over https.
    if (typeof DOE.requestPermission === 'function') {
      try {
        if (await DOE.requestPermission() !== 'granted') return;
      } catch { return; }
    }
    window.addEventListener('deviceorientation', this._onOrient);
  }

  _readOrientation(e) {
    if (e.alpha == null && e.beta == null && e.gamma == null) return;
    const rad = Math.PI / 180;
    this.orientation = {
      alpha: (e.alpha ?? 0) * rad,
      beta: (e.beta ?? 0) * rad,
      gamma: (e.gamma ?? 0) * rad,
    };
  }

  _readScreenAngle() {
    const deg = screen.orientation?.angle ?? window.orientation ?? 0;
    this.screenAngle = deg * (Math.PI / 180);
  }

  _startGeolocation() {
    if (!navigator.geolocation) return;
    this._geoWatch = navigator.geolocation.watchPosition(
      (pos) => { this.gpsSpeed = pos.coords.speed; },   // m/s, may be null
      () => { this.gpsSpeed = null; },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 },
    );
  }

  // --- frame ---------------------------------------------------------------

  _frame() {
    if (!this.running) return;

    const dt = Math.min(this.clock.getDelta(), 0.1);
    this._fps = this._fps * 0.9 + (dt > 0 ? (1 / dt) * 0.1 : 0);

    this._applyOrientation();

    const flow = this.flow.update(this.video);
    const tracks = this.obstacles.update(this.video, flow, dt);

    this._driveGait(flow, dt);
    this._placeCharacter(flow, dt);
    this._maybeVault(dt);

    this.character.update(dt);
    this.renderer.render(this.scene, this.camera);

    this._paintHud(flow, tracks);
  }

  /** Camera orientation straight from the gyro. */
  _applyOrientation() {
    if (!this.orientation) {
      // No sensor grant: a slow drift so it doesn't read as a frozen sticker.
      this.camera.rotation.set(0, Math.sin(performance.now() / 9000) * 0.05, 0);
      return;
    }

    const { alpha, beta, gamma } = this.orientation;
    const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
    const q = new THREE.Quaternion().setFromEuler(euler);
    // Device frame -> three.js camera frame (screen out of the back, -PI/2 about x).
    q.multiply(new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2));
    // Undo the screen rotation so landscape behaves.
    q.multiply(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1), -this.screenAngle,
    ));
    this.camera.quaternion.copy(q);
  }

  /** Optical flow drives the gait; GPS refines it when the device reports it. */
  _driveGait(flow, dt) {
    let speed = flow.speed01;

    if (this.gpsSpeed != null && this.gpsSpeed >= 0) {
      // ~14 m/s (50 km/h) reads as a full sprint. Blend rather than replace:
      // GPS is smooth but lags, flow is responsive but noisy.
      const gps01 = THREE.MathUtils.clamp(this.gpsSpeed / 14, 0, 1);
      speed = speed * 0.55 + gps01 * 0.45;
    }

    // Untrackable frames (tunnel, glare, wipers) shouldn't slam the character
    // to a standstill — coast instead. Time-based, not per-frame, or the coast
    // is four times shorter on a 120Hz phone than a 30Hz one.
    if (flow.confidence < 0.2) {
      speed = this.character.speed * Math.exp(-dt / COAST_TAU);
    }

    this.character.setLocomotion(speed);
  }

  /**
   * Character sits on the ground plane at a fixed distance, at a yaw that
   * trails the camera and springs back to centre. That lag is what sells it as
   * an object out in the world rather than a decal on the glass.
   */
  _placeCharacter(flow, dt) {
    const camYaw = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ').y;

    const k = 1 - Math.exp(-dt / RECENTER_TAU);
    let delta = camYaw - this.anchorYaw;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));  // shortest way round
    this.anchorYaw += delta * k;

    const root = this.character.root;
    root.position.set(
      Math.sin(this.anchorYaw) * CHAR_DISTANCE,
      0,
      -Math.cos(this.anchorYaw) * CHAR_DISTANCE,
    );

    // Face along the direction of travel, so it runs with the scenery not at it.
    const facing = flow.direction >= 0 ? 1 : -1;
    const targetYaw = this.anchorYaw + facing * Math.PI * 0.5;
    root.rotation.y += THREE.MathUtils.clamp(
      shortestAngle(targetYaw - root.rotation.y), -2.5 * dt, 2.5 * dt,
    );
  }

  /** Fire a parkour move timed to an obstacle's predicted arrival. */
  _maybeVault(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown > 0 || this.character.oneShot) return;
    if (this.character.speed < 0.15) return;   // not moving — nothing to vault

    const charX = this._characterScreenX();
    const hit = this.obstacles.approaching(charX);
    if (!hit || hit.track.used) return;

    // Roadsides are full of weak vertical edges — fence wire, lane markings,
    // foliage. Vaulting every one of them reads as a twitch, not a stunt.
    if (hit.track.strength < VAULT_MIN_STRENGTH) return;

    // Pick the move, then fire early by its wind-up so the apex lands on the
    // obstacle rather than after it.
    const move = this.character.speed > 0.5 && this.character.has('WalkJump')
      ? 'WalkJump' : 'Jump';
    const windup = this.character.duration(move) * 0.35;

    if (hit.eta <= windup) {
      hit.track.used = true;
      this.cooldown = VAULT_COOLDOWN;
      this.character.trigger(move);
    }
  }

  _characterScreenX() {
    const p = this.character.root.position.clone();
    p.y += this.character.height * 0.5;
    p.project(this.camera);
    return (p.x + 1) / 2;
  }

  _paintHud(flow, tracks) {
    if (!this.hud) return;
    this.hud.speed.textContent = this.gpsSpeed != null
      ? `${(this.gpsSpeed * 3.6).toFixed(0)} km/h`
      : flow.speed01.toFixed(2);
    this.hud.state.textContent = this.character.state;
    this.hud.obs.textContent = String(tracks.length);
    this.hud.fps.textContent = this._fps.toFixed(0);
  }
}

function shortestAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
