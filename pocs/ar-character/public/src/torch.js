/**
 * Camera torch (flashlight) control.
 *
 * Only possible when we own the camera track ourselves — i.e. the getUserMedia
 * modes. Inside a WebXR session the UA owns the camera and there is no torch
 * hook, so Room mode cannot offer this.
 *
 * Support is uneven: it is a MediaTrackCapability, present on most Android
 * Chrome builds and absent on iOS Safari. Always ask before offering it.
 */
export class Torch {
  constructor(stream) {
    this.track = stream?.getVideoTracks?.()[0] ?? null;
    this.on = false;

    const caps = this.track?.getCapabilities?.();
    this.available = !!caps && 'torch' in caps && !!caps.torch;
  }

  /** @returns {Promise<boolean>} the resulting state */
  async toggle(force) {
    if (!this.available || !this.track) return false;

    const next = force ?? !this.on;
    try {
      await this.track.applyConstraints({ advanced: [{ torch: next }] });
      this.on = next;
    } catch {
      // Some devices advertise torch then refuse it, usually because another
      // app holds the camera. Treat it as unavailable rather than retrying.
      this.available = false;
      this.on = false;
    }
    return this.on;
  }

  async off() {
    if (this.on) await this.toggle(false);
  }
}
