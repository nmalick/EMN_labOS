---
title: AR character prototype — platform survey and architecture decision
type: research
project: ar-character
status: ACCEPTED
owner: Malick
created: 2026-09-19
updated: 2026-09-19
last_verified: 2026-09-19
ttl_days: 120
confidence: confirmed
---

# AR character prototype — platform survey

Research behind `pocs/ar-character`. Two findings reversed the design mid-survey; both are
recorded here because the reasoning is not recoverable from the code.

> **TTL note:** this surveys platform capabilities, which move. The iOS Safari and 8th Wall
> facts in particular should be re-checked before being relied on again.

## Requirement

Display an animated character in the user's real surroundings through the phone camera.
Two situations, established through scoping: standing in a room, and pointed out the window
of a moving car with the character keeping pace.

## Finding 1 — iPhone Safari exposes no handheld WebXR AR

Safari 18 shipped WebXR across Apple's ecosystem, but on Vision Pro it is `immersive-vr`
only: the WebXR Augmented Reality Module is not enabled, and iPhone Safari exposes no
passthrough AR session at all. Android Chrome has had WebXR with `hit-test` via ARCore
since Chrome 79.

This is the fork that decides everything for room-scale AR. Paths considered:

| Path | Platforms | Verdict |
|---|---|---|
| three.js + WebXR hit-test | Android Chrome, headset browsers | **Chosen** for Room mode |
| 8th Wall (open-sourced Feb 2026, MIT + binary-licensed SLAM engine, free, no account) | iOS + Android | Rejected — only needed if iOS room-scale AR were in scope |
| AR Quick Look + animated USDZ | iPhone | Rejected — no custom logic; auto glTF→USDZ conversion drops animation |
| Unity AR Foundation / Reality Composer | Native iOS + Android | Rejected — no shareable link, app install |

Confirmed available on Android Chrome and used: `hit-test`, `plane-detection` (ARCore-backed,
horizontal and vertical), `anchors`, `depth-sensing`.

## Finding 2 — the car case cannot use tracking, and does not want it

Visual-inertial odometry assumes a single rigid, stationary world. A moving car presents two
contradictory reference frames at once: the still interior and the landscape tearing past.
When VIO locks onto a reference point that does not move with the vehicle, it attributes the
vehicle's motion to tracking drift and **overcorrects**, producing erratic behaviour. Handling
moving platforms requires major modification of the SLAM pipeline and is not supported by
ARCore or ARKit.

The reversal: **this constraint is not a loss.** A character that keeps pace with a moving car
is camera-relative *by definition*. World-anchoring it to the roadside would fling it out of
frame within a second. SLAM was never a missing ingredient — it was the wrong tool.

Consequences:
- Road mode drops WebXR entirely: `getUserMedia` behind a transparent three.js canvas.
- The expensive part of the original room-scale plan (floor-plane locomotion, keeping feet
  planted against a drifting plane estimate) disappears — the character runs on the spot and
  the real scenery supplies the motion.
- **Road mode therefore works on iPhone**, since it touches no WebXR. Only Room mode is
  Android/headset-only.

## Finding 3 — parkour needs prediction, not a faster detector

Reacting to roadside structures was scoped in knowing it had no scene understanding. The
naive implementation is timed guesswork and desyncs constantly. The resolution is to split
detection from timing:

- **Detect** at ~12 Hz (slow, approximate, replaceable).
- **Extrapolate** every track each frame using the optical-flow velocity field, which is
  available at full framerate.
- **Predict** time-to-cross and fire the move early by exactly its wind-up duration.

A slow detector then still produces frame-accurate cues. Optical flow is cheap enough to run
every frame — pyramidal Lucas-Kanade on GPU reaches 30fps comfortably, and the sparse block
matching used here is lighter still.

Tier 1 detector (built): vertical-structure detection by classical CV. Tier 2 (not built):
an ONNX / transformers.js segmentation model behind the same interface. Transformers.js v3
supports WebGPU, which is enabled by default in Chrome 121+ on Android, with a WASM fallback
that must be budgeted for.

## Asset pipeline

Ready Player Me avatars ship a Mixamo-compatible rig; Meshy's auto-rigger emits Mixamo bone
conventions. Either way: model → Mixamo animation → GLB, which carries geometry, rig and
animation in one file.

The prototype ships `RobotExpressive` from three.js as a placeholder, chosen because it
already contains `Idle`, `Walking`, `Running`, `Jump` and `WalkJump`.

## Open questions

- Parkour timing is unvalidated against real road footage. The pipeline runs; whether vaults
  land convincingly is untested, and `VAULT_MIN_STRENGTH` / `VAULT_COOLDOWN` are the dials.
- No occlusion in Road mode. Would need tier 2 segmentation.
- Window glass reflections degrade both flow and detection.

## Sources

- [three.js `webxr_ar_hittest` example](https://github.com/mrdoob/three.js/blob/dev/examples/webxr_ar_hittest.html)
- [Create an immersive AR session using WebXR — Google ARCore](https://developers.google.com/ar/develop/webxr/hello-webxr)
- [WebXR compared to ARCore — Google for Developers](https://developers.google.com/ar/develop/webxr/arcore-comparison)
- [WebXR Plane Detection API — Chrome Status](https://chromestatus.com/feature/5732397976911872)
- [WebXR Depth Sensing Module — W3C](https://www.w3.org/TR/webxr-depth-sensing-1/)
- [WebXR Browser Support in 2026: What Works, What Breaks](https://www.testmuai.com/learning-hub/webxr-compatible-browsers/)
- [Benchmarking Egocentric Visual-Inertial SLAM at City Scale (arXiv 2509.26639)](https://arxiv.org/pdf/2509.26639) — moving-platform VIO failure
- [CloudAR: A Cloud-based Framework for Mobile Augmented Reality (arXiv 1805.03060)](https://arxiv.org/pdf/1805.03060) — VIO cannot track moving objects
- [Methods and systems for exploiting per-pixel motion conflicts in AR (US 10636190)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10636190) — dual reference frames
- [Dense Realtime GPU Optical Flow — Brown CSCI1290](https://cs.brown.edu/courses/csci1290/2011/results/final/psastras/)
- [Transformers.js + ONNX Runtime WebGPU](https://medium.com/@GenerationAI/transformers-js-onnx-runtime-webgpu-46c3e58d547c)
- [8th Wall is now open source](https://www.8thwall.com/blog/post/208587408737/8th-wall-open-source) · [8thwall/8thwall](https://github.com/8thwall/8thwall)
- [Mixamo Animations — Ready Player Me docs](https://docs.readyplayer.me/ready-player-me/integration-guides/unity/animations/loading-mixamo-animations)
- [Animation in AR Mode — google/model-viewer #3042](https://github.com/google/model-viewer/discussions/3042) — USDZ animation caveat
- [three.js Animation System](https://threejs.org/manual/en/animation-system.html) — crossfade phase sync
