/**
 * Headless smoke test.
 *
 * Boots the real app in Chromium with a synthetic camera, enters Road mode, and
 * asserts the whole pipeline runs: modules resolve, the GLB loads, the animation
 * state machine ticks, optical flow produces values and frames actually render.
 *
 * It cannot validate that AR *looks* right — only a phone can do that. It exists
 * to catch the failures that would otherwise waste a trip to the car.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 8137;
const URL = `http://localhost:${PORT}/`;

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? ' PASS' : ' FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

(async () => {
  const server = spawn('node', [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 700));

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--enable-unsafe-swiftshader',
      '--use-gl=swiftshader',
      '--no-sandbox',
    ],
  });

  const ctx = await browser.newContext({
    permissions: ['camera', 'geolocation'],
    viewport: { width: 414, height: 896 },
    isMobile: true,
    hasTouch: true,
  });

  const errors = [];
  const failedRequests = [];
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => failedRequests.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.url()} -> ${r.status()}`); });

  try {
    await page.goto(URL, { waitUntil: 'networkidle' });

    // --- launch screen -----------------------------------------------------
    // The list lives inside a collapsed <details>, so assert on presence not visibility.
    await page.waitForFunction(
      () => document.querySelectorAll('#probe-list li').length > 0, null, { timeout: 10000 });
    const probeRows = await page.$$eval('#probe-list li', (ls) =>
      ls.map((l) => [l.querySelector('.k').textContent, l.querySelector('.v').textContent]));
    check('capability probe renders', probeRows.length >= 6, `${probeRows.length} rows`);
    console.log(probeRows.map(([k, v]) => `         ${k}: ${v}`).join('\n'));

    const roadEnabled = await page.$eval('#pick-road', (b) => !b.disabled);
    check('Road mode offered', roadEnabled);

    const roomState = await page.$eval('#pick-room [data-state]', (e) => e.textContent);
    check('Room mode correctly gated (no WebXR here)', /WebXR|immersive-ar/i.test(roomState), roomState);

    // --- enter road mode ---------------------------------------------------
    await page.click('#pick-road');
    await page.waitForFunction(() => document.getElementById('boot').classList.contains('hidden'),
      null, { timeout: 25000 });
    check('Road mode started (boot overlay cleared)', true);

    // Record every parkour trigger with the speed it fired at, so we can assert
    // the invariant that cost a debugging round: the character must never vault
    // while standing still.
    await page.waitForFunction(() => window.__ar, null, { timeout: 20000 });
    await page.evaluate(() => {
      window.__fires = [];
      const a = window.__ar;
      const orig = a.character.trigger.bind(a.character);
      a.character.trigger = (name, opts) => {
        window.__fires.push({ name, speed: a.character.speed });
        return orig(name, opts);
      };
    });

    // Let the render loop run so flow/tracking/animation all tick.
    await page.waitForTimeout(4000);

    const fires = await page.evaluate(() => window.__fires);
    const parkour = fires.filter((f) => f.name === 'Jump' || f.name === 'WalkJump');
    const tooSlow = parkour.filter((f) => f.speed < 0.15);
    check('parkour never fires while stationary',
      tooSlow.length === 0,
      `${parkour.length} vault(s), slowest at speed ${
        parkour.length ? Math.min(...parkour.map((f) => f.speed)).toFixed(3) : 'n/a'}`);

    // --- assertions on live state -----------------------------------------
    const hud = await page.evaluate(() => ({
      speed: document.getElementById('hud-speed').textContent,
      state: document.getElementById('hud-state').textContent,
      obs: document.getElementById('hud-obs').textContent,
      fps: document.getElementById('hud-fps').textContent,
    }));
    console.log(`         HUD -> ${JSON.stringify(hud)}`);

    const fps = parseFloat(hud.fps);
    check('render loop is running', Number.isFinite(fps) && fps > 0, `${hud.fps} fps`);
    check('animation state machine active',
      ['Idle', 'Walking', 'Running', 'Jump', 'WalkJump', 'Wave'].includes(hud.state), hud.state);
    check('optical flow producing a value', hud.speed !== '—', hud.speed);
    check('obstacle tracker reporting', /^\d+$/.test(hud.obs), `${hud.obs} tracked`);

    // Regression guard: the dom-overlay root is composited over the AR camera
    // passthrough, so ANY opaque background in it turns Room mode into a black
    // screen. This shipped once already (root was document.body, which carries
    // the page background).
    const overlay = await page.evaluate(() => {
      const el = document.getElementById('ar-overlay');
      if (!el) return { missing: true };
      const opaque = (n) => {
        const bg = getComputedStyle(n).backgroundColor;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (!m) return bg !== 'transparent';
        const p = m[1].split(',').map(Number);
        return (p[3] ?? 1) > 0.95;
      };
      // Only full-bleed elements can occlude the whole view; panels are fine.
      const fullBleed = [el, ...el.children].filter((n) => {
        const r = n.getBoundingClientRect();
        return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9;
      });
      return { missing: false, occluding: fullBleed.filter(opaque).map((n) => n.id || n.className) };
    });
    check('dom-overlay root exists', !overlay.missing);
    check('dom-overlay root does not occlude camera passthrough',
      !overlay.missing && overlay.occluding.length === 0,
      overlay.occluding?.join(', ') || 'transparent');

    const canvasLive = await page.evaluate(() => {
      const c = document.getElementById('gl');
      return c.width > 0 && c.height > 0;
    });
    check('WebGL canvas sized', canvasLive);

    // Emote button drives the one-shot path.
    await page.click('#btn-wave');
    await page.waitForTimeout(400);
    const emoted = await page.evaluate(() => document.getElementById('hud-state').textContent);
    check('one-shot emote fires', emoted === 'Wave' || emoted === 'Idle', emoted);

    // --- stage mode --------------------------------------------------------
    // Unlike Room, Stage needs no WebXR, so headless can exercise it fully --
    // including its whole reason for existing: the character cannot leave the
    // screen. Sampled over time because it walks.
    await page.click('#btn-back');
    await page.waitForTimeout(600);
    await page.click('#pick-stage');
    await page.waitForFunction(
      () => document.getElementById('boot').classList.contains('hidden'),
      null, { timeout: 25000 });
    check('Stage mode started', true);

    const samples = await page.evaluate(async () => {
      const a = window.__ar;
      const THREE_UP = 0.5;
      const out = [];
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 100));
        const p = a.character.root.position.clone();
        p.y += a.character.height * THREE_UP;
        p.project(a.camera);
        out.push({
          x: (p.x + 1) / 2,
          y: (-p.y + 1) / 2,
          z: -a.character.root.position.z,
          visible: a.character.root.visible,
        });
      }
      return out;
    });

    const offScreen = samples.filter((s) => s.x < 0 || s.x > 1 || s.y < 0 || s.y > 1);
    check('Stage character never leaves the screen',
      offScreen.length === 0,
      `${samples.length} samples over 4s, ${offScreen.length} off-screen`);

    const xs = samples.map((s) => s.x);
    const zs = samples.map((s) => s.z);
    check('Stage character is actually moving',
      Math.max(...xs) - Math.min(...xs) > 0.01 || Math.max(...zs) - Math.min(...zs) > 0.05,
      `x span ${(Math.max(...xs) - Math.min(...xs)).toFixed(2)}, depth span ${
        (Math.max(...zs) - Math.min(...zs)).toFixed(2)}m`);

    check('Stage character is visible', samples.every((s) => s.visible));

    const torchHidden = await page.$eval('#btn-torch', (b) => b.classList.contains('hidden'));
    check('torch button hidden when device has no torch', torchHidden,
      'synthetic camera exposes no torch capability');

    // --- teardown ----------------------------------------------------------
    await page.click('#btn-back');
    await page.waitForTimeout(600);
    const backHome = await page.$eval('#launch', (e) => !e.classList.contains('hidden'));
    check('returns to launch screen cleanly', backHome);

    check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    check('no failed requests', failedRequests.length === 0, failedRequests.slice(0, 3).join(' | '));
  } catch (e) {
    check('test run completed', false, e.message);
  } finally {
    await browser.close();
    server.kill();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
