/**
 * Device capability probe.
 *
 * Runs before either mode boots so we fail loudly on the launch screen rather
 * than halfway into an AR session. Nothing here requests permission — it only
 * reports what the platform exposes.
 */

const SECURE_HINT = 'needs https (or localhost)';

export async function probe() {
  const caps = {
    secure: isSecureContext,
    webgl2: hasWebGL2(),
    webgpu: 'gpu' in navigator,
    camera: !!navigator.mediaDevices?.getUserMedia,
    geolocation: 'geolocation' in navigator,
    orientation: 'DeviceOrientationEvent' in window,
    // iOS 13+ gates the sensors behind an explicit, gesture-initiated grant.
    orientationNeedsGrant:
      typeof window.DeviceOrientationEvent?.requestPermission === 'function',
    xr: 'xr' in navigator,
    immersiveAR: false,
  };

  if (caps.xr) {
    try {
      caps.immersiveAR = await navigator.xr.isSessionSupported('immersive-ar');
    } catch {
      caps.immersiveAR = false;
    }
  }

  // A mode is only offered when everything it hard-requires is present.
  caps.roadReady = caps.secure && caps.camera && caps.webgl2;
  // Stage is deliberately the low-requirement mode: camera and a canvas, no
  // tracking of any kind, so it runs anywhere Road does — iPhone included.
  caps.stageReady = caps.roadReady;
  caps.roomReady = caps.secure && caps.immersiveAR && caps.webgl2;

  caps.stageBlocker = !caps.secure ? SECURE_HINT
    : !caps.camera ? 'no camera API'
    : !caps.webgl2 ? 'no WebGL2'
    : null;

  caps.roadBlocker = !caps.secure ? SECURE_HINT
    : !caps.camera ? 'no camera API'
    : !caps.webgl2 ? 'no WebGL2'
    : null;

  caps.roomBlocker = !caps.secure ? SECURE_HINT
    : !caps.xr ? 'no WebXR — expected on iOS Safari'
    : !caps.immersiveAR ? 'device has no immersive-ar session'
    : !caps.webgl2 ? 'no WebGL2'
    : null;

  return caps;
}

function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/** Rows for the collapsible capability list on the launch screen. */
export function probeRows(c) {
  const yn = (v, good = 'yes', bad = 'no') => ({
    text: v ? good : bad,
    cls: v ? 'ok' : 'bad',
  });

  return [
    ['secure context', yn(c.secure, 'https', 'insecure')],
    ['WebGL2', yn(c.webgl2)],
    ['camera (getUserMedia)', yn(c.camera)],
    ['WebXR immersive-ar', c.immersiveAR
      ? { text: 'supported', cls: 'ok' }
      : { text: c.xr ? 'unsupported' : 'no WebXR', cls: 'warn' }],
    ['device orientation', c.orientation
      ? { text: c.orientationNeedsGrant ? 'needs grant' : 'yes', cls: 'ok' }
      : { text: 'no', cls: 'warn' }],
    ['geolocation speed', yn(c.geolocation, 'yes', 'no')],
    ['WebGPU (ML tier 2)', c.webgpu
      ? { text: 'available', cls: 'ok' }
      : { text: 'absent — CPU fallback', cls: 'warn' }],
  ];
}
