import { probe, probeRows } from './probe.js';

/**
 * Bootstrap: probe the device, offer only the modes it can actually run, then
 * hand off to Road or Room. Modes are imported lazily so a device that can only
 * do one of them never downloads the other.
 */

const $ = (id) => document.getElementById(id);

const ui = {
  launch: $('launch'),
  stage: $('stage'),
  video: $('feed'),
  canvas: $('gl'),
  hint: $('reticle-hint'),
  toast: $('toast'),
  boot: $('boot'),
  bootMsg: $('boot-msg'),
  hudEl: $('hud'),
  torchBtn: $('btn-torch'),
  hud: {
    speed: $('hud-speed'),
    state: $('hud-state'),
    obs: $('hud-obs'),
    fps: $('hud-fps'),
  },
};

let active = null;

init();

async function init() {
  const caps = await probe();
  renderProbe(caps);

  wireMode($('pick-stage'), caps.stageReady, caps.stageBlocker, () => enter('stage'));
  wireMode($('pick-road'), caps.roadReady, caps.roadBlocker, () => enter('road'));
  wireMode($('pick-room'), caps.roomReady, caps.roomBlocker, () => enter('room'));

  $('btn-back').addEventListener('click', exit);
  $('btn-hud').addEventListener('click', () => ui.hudEl.classList.toggle('hidden'));
  $('btn-wave').addEventListener('click', () => active?.emote('Wave'));
  ui.torchBtn.addEventListener('click', toggleTorch);
}

function wireMode(btn, ready, blocker, onPick) {
  const state = btn.querySelector('[data-state]');
  btn.disabled = !ready;
  state.textContent = ready ? 'ready' : blocker;
  state.className = `mode-state ${ready ? 'ok' : 'bad'}`;
  if (ready) btn.addEventListener('click', onPick);
}

function renderProbe(caps) {
  $('probe-list').innerHTML = probeRows(caps)
    .map(([k, v]) => `<li><span class="k">${k}</span><span class="v ${v.cls}">${v.text}</span></li>`)
    .join('');
}

async function enter(mode) {
  ui.launch.classList.add('hidden');
  ui.stage.classList.remove('hidden');
  ui.hudEl.classList.remove('hidden');
  status('starting');

  try {
    if (mode === 'stage') {
      const { StageMode } = await import('./modes/stage.js');
      active = new StageMode({
        video: ui.video,
        canvas: ui.canvas,
        hud: ui.hud,
        hint: ui.hint,
        onStatus: status,
      });
    } else if (mode === 'road') {
      const { RoadMode } = await import('./modes/road.js');
      active = new RoadMode({
        video: ui.video,
        canvas: ui.canvas,
        hud: ui.hud,
        onStatus: status,
      });
    } else {
      const { RoomMode } = await import('./modes/room.js');
      active = new RoomMode({
        canvas: ui.canvas,
        hud: ui.hud,
        hint: ui.hint,
        onStatus: status,
        onExit: exit,
      });
    }
    await active.start();
    // Handle for the headless smoke test / console debugging.
    window.__ar = active;

    // Torch is only possible where we own the camera track, and only on
    // devices that actually expose the capability. Offer it nowhere else.
    ui.torchBtn.classList.toggle('hidden', !active.torchAvailable);
    ui.torchBtn.setAttribute('aria-pressed', 'false');
  } catch (err) {
    console.error(err);
    status(null);
    fail(err, mode);
  }
}

async function exit() {
  try { await active?.stop(); } catch (e) { console.warn(e); }
  active = null;
  ui.toast.classList.add('hidden');
  ui.hudEl.classList.add('hidden');
  ui.torchBtn.classList.add('hidden');
  ui.torchBtn.setAttribute('aria-pressed', 'false');
  ui.stage.classList.add('hidden');
  ui.launch.classList.remove('hidden');
}

async function toggleTorch() {
  if (!active?.toggleTorch) return;
  const on = await active.toggleTorch();
  ui.torchBtn.setAttribute('aria-pressed', String(on));
  // A device can advertise torch and then refuse it; hide rather than lie.
  if (!active.torchAvailable) ui.torchBtn.classList.add('hidden');
}

function status(msg) {
  if (!msg) { ui.boot.classList.add('hidden'); return; }
  ui.bootMsg.textContent = msg;
  ui.boot.classList.remove('hidden');
}

function fail(err, mode) {
  const name = err?.name ?? '';
  let title = 'Could not start';
  let body = err?.message ?? String(err);

  if (name === 'NotAllowedError') {
    title = 'Permission denied';
    body = mode === 'road'
      ? 'Camera access was refused. Allow it in your browser settings for this site, then try again.'
      : 'The AR session was refused. Allow camera access for this site, then try again.';
  } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    title = 'No usable camera';
    body = 'No rear-facing camera was available on this device.';
  } else if (name === 'NotReadableError') {
    title = 'Camera busy';
    body = 'Another app is using the camera. Close it and try again.';
  }

  ui.toast.innerHTML = `<span class="t-title"></span><span class="t-body"></span>`;
  ui.toast.querySelector('.t-title').textContent = title;
  ui.toast.querySelector('.t-body').textContent = body;
  ui.toast.classList.remove('hidden');
}
