# ar-character

An animated character composited into your real surroundings through the phone camera.
Three modes, because these are not the same problem.

| Mode | Situation | Technique |
|---|---|---|
| **Stage** | Anywhere, no tracking at all | Camera feed + a floor rectangle computed from the frustum; the character cannot leave the screen |
| **Road** | Phone pointed out a car window | Camera feed + screen-composited character, driven by optical flow |
| **Room** | Standing in a room | WebXR `immersive-ar` with hit-test, world anchoring, camera-following |

## Why two engines

Room mode uses real AR: the device is roughly still in a rigid world, ARCore's
visual-inertial tracking works, and the character can genuinely be anchored to your floor.

Road mode cannot use any of that. Visual-inertial odometry assumes **one** rigid world,
and a moving car presents two contradictory ones — the still interior and the landscape
tearing past. VIO attributes the vehicle's motion to tracking drift and overcorrects, which
is why AR in a moving vehicle jitters and slides. There is no flag that fixes this;
handling moving platforms requires surgery on the SLAM pipeline that neither ARCore nor
ARKit does.

We don't need it anyway. **A character that keeps pace with the car is camera-relative by
definition.** World-anchoring it to the roadside would fling it out of frame in the first
second. So Road mode drops tracking entirely: the camera only rotates (from the gyro),
the character stands on an implied ground plane and runs on the spot, and the real scenery
scrolling past supplies all the sense of speed.

A consequence worth noting: because Road mode touches no WebXR, **it works on iPhone too.**
Only Room mode is Android/headset-only.

## How the parkour works

The hard part is timing. A detector good enough to recognise a pole runs at ~10 Hz, but a
vault has to land on a specific frame. So detection and timing are separated:

```
detect       vertical-structure detector finds candidate obstacles     ~12 Hz
track        detections associate into persistent objects
extrapolate  every track advances each frame by the optical-flow       every frame
             velocity, which is available at full framerate
predict      time-to-cross the character -> fire the move early by
             exactly its wind-up duration
```

That is what lets a slow, cheap detector produce frame-accurate cues.

The tier-1 detector is classical CV: columns with high, vertically-consistent horizontal
gradient. Out of a car window those are poles, posts, sign stanchions, guardrail uprights
and tree trunks — exactly what is worth vaulting. No model download, no WebGPU requirement.

**Tier 2 is not built.** Swapping in an ONNX or transformers.js segmentation model behind
the same `detect(video) -> [{x, strength}]` interface is the upgrade path, and nothing
else has to change.

## Run it

```bash
npm install
npm run dev          # http://localhost:8080
npm test             # headless smoke test (see below)
```

Both modes need **HTTPS** — `getUserMedia`, WebXR and the motion sensors all require a
secure context. `localhost` is exempt, so desktop dev works over plain http, but testing on
your phone means deploying. Vercel is configured (`vercel.json`); `vercel deploy` is enough.

The launch screen probes the device first and only offers modes it can actually run, so a
missing capability shows up there rather than halfway into a session.

## Testing

`npm test` drives the real app in headless Chromium with a synthetic camera and asserts the
pipeline runs end to end: modules resolve, the GLB loads, the animation state machine ticks,
optical flow produces values, obstacles track, frames render, and — an invariant that cost a
debugging round — the character never vaults while stationary.

**What it cannot tell you** is whether the AR *looks* right. Only a phone can. The test
exists to catch the failures that would otherwise waste a trip to the car.

## Layout

```
public/
  index.html              launch screen + stage
  src/
    main.js               probe, mode routing, lazy-loads the chosen mode
    probe.js              device capability detection
    character.js          GLB + animation state machine   (shared by all modes)
    torch.js              flashlight, where the camera track is ours
    modes/stage.js        bounded floor rectangle, screen-locked
    modes/road.js         camera composite, gyro, gait, parkour
    modes/room.js         WebXR hit-test, placement, camera-following
    perception/flow.js    sparse optical flow (block matching)
    perception/obstacles.js  detection + tracking + arrival prediction
  assets/character.glb    RobotExpressive (three.js, CC0)
  vendor/three/           pinned three.js — no runtime CDN dependency
```

Everything is vendored. No build step, no bundler, no network calls at runtime.

## Stage mode, and why it exists

Room mode is real AR, and it lives or dies by ARCore's tracking: if hit-test cannot lock
your floor, nothing happens, and once anchored the character will happily stand behind you.

Stage mode gives all that up deliberately. The camera never moves, so **the visible frame IS
the stage**. The character walks a floor rectangle derived from the actual view frustum —
near bound set by whichever of feet or head leaves the view first, width tapering with depth
because the frustum does — so by construction it cannot walk off screen. No session, no
hit-test, no tracking, nothing to fail.

The trade is honest: it moves with the phone instead of staying put in the room. That is the
price of always working. Tap anywhere to send it to that spot.

Because it needs only `getUserMedia`, Stage also runs on iPhone.

### Sizing

Apparent size is chosen **first**, and the geometry is derived from it — not the other way
round. The earlier version assumed the phone was 1.4m above a floor and solved for a distance
that kept the feet in frame; that forced the character out to 3-5m regardless of what you
were pointing at, so held a metre from a worktop it read as plainly the wrong size. The
assumption was wrong, not the arithmetic. Stage mode is a stage, so there is no real floor to
be faithful to.

**Pinch to resize** (15%-75% of screen height); the choice persists in `localStorage`. From
the chosen fill it derives the distance — `d = h / (2 * F * tan(vFov/2))`, a screen-fraction
not an angular one — and the camera height, so the feet land at a consistent spot. Sizes that
would not fit push the feet lower instead of clipping the head, and the margin is budgeted
against the *near* end of the walk band, since the character grows as it walks toward you.

## Torch

Modes that own the camera track (Stage, Road) expose a flashlight button, via the `torch`
MediaTrackCapability. It is absent on iOS Safari and on some Android builds, and some devices
advertise it then refuse it — so the button is shown only after the capability is confirmed,
and hides itself if applying the constraint fails. Room mode cannot offer it at all: inside a
WebXR session the UA owns the camera and there is no torch hook.

## Framing in Room mode

Scale in AR is fixed — a 1.6m character is 1.6m — so the only lever on apparent size is
**distance**, and the right distance depends on the device's FOV and how high you hold the
phone. Hardcoding it does not survive contact: at 1.5m the feet sit 43 degrees below centre
against a 35-degree half-FOV, i.e. off the bottom of the screen, with the body filling 72%
of the height.

So the standing distance is derived at runtime from the vertical FOV read out of the XR
projection matrix (device-set, not our nominal 70 degrees), taking the stricter of two
constraints: the body should fill about half the screen height, and the feet must sit inside
the lower half-FOV with margin.

The character also keeps station in front of you rather than wandering. A portrait phone
shows only about **+/-18 degrees horizontally**, so a 1.2m wander radius at conversational
range swings more than twice the visible width — it leaves frame almost immediately. It now
walks to wherever you are looking, with a deadzone so it is not constantly shuffling, and
turns to face you once settled. Still real AR: it walks the floor and stays anchored to it.

## Known limits

- **Parkour timing is unvalidated on real road footage.** The pipeline is proven to run;
  whether vaults land convincingly against real roadside structures is the open question,
  and the thresholds in `road.js` (`VAULT_MIN_STRENGTH`, `VAULT_COOLDOWN`) are the dials.
- **Window glass reflections** degrade both flow and detection. Roll the window down.
- **No occlusion.** The character draws over everything. WebXR `depth-sensing` would fix
  this in Room mode; Road mode would need a segmentation model (tier 2).
- The character is a placeholder — `RobotExpressive` from three.js, chosen because it ships
  `Idle`, `Walking`, `Running`, `Jump` and `WalkJump` already rigged.

## Safety

Passenger seat only. Never operate this while driving.
