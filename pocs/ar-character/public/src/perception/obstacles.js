/**
 * Roadside obstacle detection, tracking and arrival prediction.
 *
 * The problem parkour has to solve: a detector good enough to recognise a pole
 * runs at maybe 5-15 Hz, but a vault has to land on a specific frame or the
 * illusion dies. So detection and timing are split:
 *
 *   detect      find candidate obstacles — slow, approximate, replaceable
 *   track       associate detections across frames into persistent objects
 *   extrapolate move every track forward each frame using the optical-flow
 *               velocity, which is available at full framerate
 *   predict     time-to-cross the character, so a move fires with exactly
 *               enough lead for its wind-up
 *
 * That means the detector can be slow and still produce frame-accurate cues.
 *
 * Tier 1 (here): vertical-structure detector. Out of a car window, the strong
 * persistent vertical edges are poles, posts, sign stanchions, guardrail
 * uprights and tree trunks — exactly the things worth vaulting. It is classical
 * CV, costs nothing, and needs no model download.
 *
 * Tier 2 (not built): swap in a segmentation or detection model behind the same
 * `detect(video) -> [{x, strength}]` interface. Nothing else changes.
 */

const DW = 96;   // detector probe width
const DH = 64;

// Rows to inspect: skip the top (sky) and bottom (road blur / door card).
const BAND_TOP = Math.round(DH * 0.25);
const BAND_BOTTOM = Math.round(DH * 0.80);

const EDGE_THRESHOLD = 26;   // mean gradient per row to count as a structure
const NMS_RADIUS = 4;        // columns suppressed either side of a peak
const MATCH_TOLERANCE = 0.06; // normalized x
const CONFIRM_HITS = 2;      // detections before a track is actionable
const MAX_MISSES = 8;

export class VerticalStructureDetector {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = DW;
    this.canvas.height = DH;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.gray = new Uint8Array(DW * DH);
    this.energy = new Float32Array(DW);
  }

  /** @returns {Array<{x:number, strength:number}>} normalized x, 0..1 */
  detect(video) {
    if (!video.videoWidth) return [];

    this.ctx.drawImage(video, 0, 0, DW, DH);
    const rgba = this.ctx.getImageData(0, 0, DW, DH).data;

    const g = this.gray;
    for (let i = 0, p = 0; i < g.length; i++, p += 4) {
      g[i] = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
    }

    // Column energy = vertical consistency of horizontal gradient. A pole
    // yields a tall column of strong |dx|; foliage yields scattered noise that
    // averages low.
    const e = this.energy;
    const rows = BAND_BOTTOM - BAND_TOP;
    for (let x = 1; x < DW - 1; x++) {
      let sum = 0;
      for (let y = BAND_TOP; y < BAND_BOTTOM; y++) {
        const r = y * DW;
        sum += Math.abs(g[r + x + 1] - g[r + x - 1]);
      }
      e[x] = sum / rows;
    }
    e[0] = e[DW - 1] = 0;

    // Non-maximum suppression so one pole produces one detection.
    const peaks = [];
    for (let x = 1; x < DW - 1; x++) {
      if (e[x] < EDGE_THRESHOLD) continue;
      let isPeak = true;
      for (let k = -NMS_RADIUS; k <= NMS_RADIUS && isPeak; k++) {
        const j = x + k;
        if (j > 0 && j < DW && e[j] > e[x]) isPeak = false;
      }
      if (isPeak) {
        peaks.push({
          x: x / DW,
          strength: Math.min(1, e[x] / (EDGE_THRESHOLD * 3)),
        });
      }
    }

    return peaks;
  }
}

export class ObstacleTracker {
  /**
   * @param {{detector?:object, detectHz?:number, flowWidth?:number}} opts
   */
  constructor({ detector = new VerticalStructureDetector(), detectHz = 12, flowWidth = 64 } = {}) {
    this.detector = detector;
    this.detectInterval = 1 / detectHz;
    this.flowWidth = flowWidth;

    this.tracks = [];
    this._sinceDetect = Infinity;
    this._nextId = 1;
  }

  /**
   * @param {HTMLVideoElement} video
   * @param {{dx:number, confidence:number}} flow  from FlowEstimator
   * @param {number} dt  seconds
   */
  update(video, flow, dt) {
    // Normalized screen-x velocity per second, straight from optical flow.
    const vx = dt > 0 ? (flow.dx / this.flowWidth) / dt : 0;

    // Extrapolate every frame — this is what buys frame-accurate timing.
    for (const t of this.tracks) {
      t.x += vx * dt;
      t.vx = vx;
      t.age += dt;
    }

    // Drop anything that has left the frame or gone stale.
    this.tracks = this.tracks.filter(
      (t) => t.x > -0.25 && t.x < 1.25 && t.misses < MAX_MISSES,
    );

    this._sinceDetect += dt;
    if (this._sinceDetect >= this.detectInterval && flow.confidence > 0.25) {
      this._sinceDetect = 0;
      this._associate(this.detector.detect(video), vx);
    }

    return this.tracks;
  }

  /**
   * Nearest confirmed track approaching `x01`, with its arrival time.
   * @returns {{track:object, eta:number}|null}
   */
  approaching(x01) {
    let best = null;

    for (const t of this.tracks) {
      if (t.hits < CONFIRM_HITS || Math.abs(t.vx) < 1e-4) continue;

      const eta = (x01 - t.x) / t.vx;
      // Must be ahead of us in time, and close enough to be worth reacting to.
      if (eta <= 0 || eta > 3) continue;
      if (!best || eta < best.eta) best = { track: t, eta };
    }

    return best;
  }

  reset() {
    this.tracks = [];
    this._sinceDetect = Infinity;
  }

  // --- internals -----------------------------------------------------------

  _associate(detections, vx) {
    const claimed = new Set();

    for (const t of this.tracks) {
      let bestIdx = -1, bestDist = MATCH_TOLERANCE;
      detections.forEach((d, i) => {
        if (claimed.has(i)) return;
        const dist = Math.abs(d.x - t.x);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });

      if (bestIdx >= 0) {
        claimed.add(bestIdx);
        const d = detections[bestIdx];
        // Nudge toward the observation rather than snapping — the extrapolated
        // position is usually the more trustworthy of the two.
        t.x = t.x * 0.6 + d.x * 0.4;
        t.strength = t.strength * 0.7 + d.strength * 0.3;
        t.hits++;
        t.misses = 0;
      } else {
        t.misses++;
      }
    }

    detections.forEach((d, i) => {
      if (claimed.has(i)) return;
      this.tracks.push({
        id: this._nextId++,
        x: d.x,
        vx,
        strength: d.strength,
        hits: 1,
        misses: 0,
        age: 0,
        used: false,   // set once a move has been fired for this obstacle
      });
    });
  }
}
