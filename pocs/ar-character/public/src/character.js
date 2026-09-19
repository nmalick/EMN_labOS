import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * The character, its clips, and the state machine that drives them.
 *
 * Shared verbatim by both modes — Road and Room differ in how the character is
 * placed and what drives it, never in how it animates.
 *
 * Two kinds of clip:
 *   locomotion  Idle / Walking / Running — looped, mutually exclusive, selected
 *               by a single 0..1 speed value and crossfaded phase-synced.
 *   one-shot    Jump / WalkJump / Wave / ... — played once over the top, then
 *               released back to whatever locomotion state was current.
 */

const LOCOMOTION = ['Idle', 'Walking', 'Running'];

// Speed (0..1) at or above which each locomotion clip takes over.
const GAIT_THRESHOLD = { Idle: 0.0, Walking: 0.12, Running: 0.55 };

// Playback rate is nudged around 1.0 so feet roughly match perceived speed
// instead of sliding. Bounded so it never looks like fast-forward.
const RATE_RANGE = { Walking: [0.75, 1.5], Running: [0.85, 1.7] };

export class Character {
  constructor(gltf, { targetHeight = 1.7 } = {}) {
    this.root = new THREE.Group();

    this.model = gltf.scene;
    this.model.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
    });

    // Normalize to a known height in metres so placement maths is model-agnostic.
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    this.model.scale.setScalar(scale);

    // Re-measure post-scale and sit the feet exactly on the group origin.
    const scaled = new THREE.Box3().setFromObject(this.model);
    this.model.position.y -= scaled.min.y;
    this.height = targetHeight;

    this.root.add(this.model);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = new Map();
    this.actions = new Map();
    for (const clip of gltf.animations) {
      this.clips.set(clip.name, clip);
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }

    this.gait = 'Idle';
    this.speed = 0;
    this.oneShot = null;
    this._onOneShotEnd = null;

    const idle = this.actions.get('Idle');
    if (idle) idle.play();

    this.mixer.addEventListener('finished', (e) => this._finish(e));
  }

  static async load(url, opts) {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new Character(gltf, opts);
  }

  has(name) { return this.actions.has(name); }

  duration(name) { return this.clips.get(name)?.duration ?? 0; }

  /** Current animation state, for the HUD. */
  get state() { return this.oneShot ?? this.gait; }

  /**
   * Drive locomotion from a single normalized speed.
   * Picks the gait, crossfades phase-synced, and scales playback rate.
   */
  setLocomotion(speed01) {
    this.speed = THREE.MathUtils.clamp(speed01, 0, 1);

    let next = 'Idle';
    for (const name of LOCOMOTION) {
      if (this.has(name) && this.speed >= GAIT_THRESHOLD[name]) next = name;
    }

    if (next !== this.gait) this._crossfade(this.gait, next, 0.28);
    this.gait = next;

    const range = RATE_RANGE[next];
    if (range) {
      // Map the speed band this gait owns onto its allowed rate band.
      const lo = GAIT_THRESHOLD[next];
      const hi = next === 'Running' ? 1 : GAIT_THRESHOLD.Running;
      const t = hi > lo ? THREE.MathUtils.clamp((this.speed - lo) / (hi - lo), 0, 1) : 0;
      const action = this.actions.get(next);
      if (action) action.timeScale = THREE.MathUtils.lerp(range[0], range[1], t);
    }
  }

  /**
   * Play a one-shot over the current gait. Resolves when it finishes.
   * Ignored if the same one-shot is already running.
   */
  trigger(name, { fade = 0.15 } = {}) {
    if (!this.has(name) || this.oneShot === name) return Promise.resolve(false);

    const action = this.actions.get(name);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = 1;
    action.fadeIn(fade).play();

    const prev = this.actions.get(this.gait);
    if (prev) prev.fadeOut(fade);

    this.oneShot = name;
    return new Promise((resolve) => { this._onOneShotEnd = resolve; });
  }

  update(dt) { this.mixer.update(dt); }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
  }

  // --- internals -----------------------------------------------------------

  _crossfade(from, to, dur) {
    const a = this.actions.get(from);
    const b = this.actions.get(to);
    if (!b) return;

    b.enabled = true;
    b.setEffectiveTimeScale(1);
    b.setEffectiveWeight(1);
    b.setLoop(THREE.LoopRepeat, Infinity);

    // Phase-sync: enter the new cycle at the same fraction the old one is at,
    // otherwise the legs snap to a different pose mid-blend.
    if (a && a.getClip().duration > 0) {
      const phase = (a.time % a.getClip().duration) / a.getClip().duration;
      b.time = phase * b.getClip().duration;
      a.crossFadeTo(b.play(), dur, false);
    } else {
      b.reset().fadeIn(dur).play();
    }
  }

  _finish(e) {
    const finished = [...this.actions.entries()].find(([, a]) => a === e.action);
    if (!finished || finished[0] !== this.oneShot) return;

    e.action.fadeOut(0.18);
    const back = this.actions.get(this.gait);
    if (back) back.reset().setEffectiveWeight(1).fadeIn(0.18).play();

    this.oneShot = null;
    this._onOneShotEnd?.(true);
    this._onOneShotEnd = null;
  }
}
