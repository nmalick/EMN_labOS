/**
 * Sparse optical flow over the camera feed.
 *
 * Why this exists: out of a car window there is no usable pose tracking (VIO
 * needs a rigid world and gets two contradictory ones — the still car interior
 * and the landscape tearing past). But we don't need pose. We need to know how
 * fast the scene is sliding and in which direction. That is cheap, robust, and
 * enough to drive both the run cycle and the parkour timing.
 *
 * Method: block matching by sum-of-absolute-differences on a downscaled
 * greyscale frame. Search is wide horizontally and narrow vertically because
 * vehicle motion past a side window is overwhelmingly horizontal. Per-block
 * results are reduced by median, which discards the blocks that landed on sky,
 * road blur, or the window frame.
 */

const W = 64;          // probe resolution — small on purpose
const H = 48;
const BLOCK = 8;
const SEARCH_X = 8;    // +/- px horizontal
const SEARCH_Y = 3;    // +/- px vertical
const MARGIN = SEARCH_X + 1;

export class FlowEstimator {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    this.prev = null;
    this.curr = new Uint8Array(W * H);

    this.dx = 0;            // smoothed px/frame at probe resolution
    this.dy = 0;
    this.confidence = 0;    // 0..1, fraction of blocks that agreed
    this.speed01 = 0;       // self-calibrating normalized magnitude

    this._peak = 1.2;       // decaying running max for normalization
    this._samples = [];
  }

  /**
   * @param {HTMLVideoElement} video
   * @returns {{dx:number, dy:number, confidence:number, speed01:number}}
   */
  update(video) {
    if (!video.videoWidth) return this._result();

    this.ctx.drawImage(video, 0, 0, W, H);
    const rgba = this.ctx.getImageData(0, 0, W, H).data;

    // Luma, integer weights (BT.601-ish) to stay off the float path.
    const g = this.curr;
    for (let i = 0, p = 0; i < g.length; i++, p += 4) {
      g[i] = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
    }

    if (!this.prev) {
      this.prev = new Uint8Array(g);
      return this._result();
    }

    const offsets = this._matchBlocks(this.prev, g);
    this.prev.set(g);

    if (offsets.length >= 3) {
      const mx = median(offsets.map((o) => o.dx));
      const my = median(offsets.map((o) => o.dy));

      // Agreement: share of blocks within 2px of the median. Low agreement
      // means the frame is untrackable (tunnel, blown highlights, wipers).
      const agree = offsets.filter((o) => Math.abs(o.dx - mx) <= 2).length;
      this.confidence = agree / offsets.length;

      const a = 0.35; // EMA — responsive but not jittery
      this.dx = this.dx * (1 - a) + mx * a;
      this.dy = this.dy * (1 - a) + my * a;
    } else {
      this.confidence = 0;
    }

    this._normalize();
    return this._result();
  }

  reset() {
    this.prev = null;
    this.dx = this.dy = this.speed01 = this.confidence = 0;
  }

  // --- internals -----------------------------------------------------------

  _matchBlocks(prev, curr) {
    const out = [];

    for (let by = MARGIN; by + BLOCK + MARGIN < H; by += BLOCK * 2) {
      for (let bx = MARGIN; bx + BLOCK + MARGIN < W; bx += BLOCK) {
        // Skip flat blocks — featureless sky matches everything equally and
        // would poison the median with noise.
        if (variance(curr, bx, by) < 24) continue;

        let best = Infinity, bdx = 0, bdy = 0;

        for (let oy = -SEARCH_Y; oy <= SEARCH_Y; oy++) {
          for (let ox = -SEARCH_X; ox <= SEARCH_X; ox++) {
            let sad = 0;
            for (let y = 0; y < BLOCK; y++) {
              const cr = (by + y) * W + bx;
              const pr = (by + y + oy) * W + bx + ox;
              for (let x = 0; x < BLOCK; x++) {
                sad += Math.abs(curr[cr + x] - prev[pr + x]);
              }
            }
            if (sad < best) { best = sad; bdx = ox; bdy = oy; }
          }
        }

        // Reject weak matches; 18/px averaged is already a poor fit.
        if (best / (BLOCK * BLOCK) < 18) out.push({ dx: bdx, dy: bdy });
      }
    }

    return out;
  }

  _normalize() {
    const mag = Math.abs(this.dx);

    // Track a decaying peak so the run cycle calibrates to the actual journey
    // rather than to a guessed highway constant.
    this._peak = Math.max(mag, this._peak * 0.995);
    this._peak = Math.max(this._peak, 1.0);

    const raw = mag / this._peak;
    // Deadzone: below this it is sensor noise at a red light, not motion.
    this.speed01 = raw < 0.08 ? 0 : (raw - 0.08) / 0.92;
  }

  _result() {
    return {
      dx: this.dx,
      dy: this.dy,
      confidence: this.confidence,
      speed01: this.speed01,
      // Sign tells us which way the world slides, so the character can face
      // into the direction of travel.
      direction: this.dx === 0 ? 0 : Math.sign(this.dx),
    };
  }
}

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function variance(g, bx, by) {
  let sum = 0, sq = 0;
  for (let y = 0; y < BLOCK; y++) {
    const r = (by + y) * W + bx;
    for (let x = 0; x < BLOCK; x++) {
      const v = g[r + x];
      sum += v; sq += v * v;
    }
  }
  const n = BLOCK * BLOCK;
  return sq / n - (sum / n) ** 2;
}
