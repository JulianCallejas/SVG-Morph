#!/usr/bin/env node
// Checks that an exported, SMIL-animated SVG plays the same in Chrome and in Firefox.
//
// It loads the file in each browser, freezes the animation at a few instants and reads, for every
// <path>, where it is and how opaque it is. The two browsers must agree (a pixel or two of rounding
// is allowed). No dependencies: Chrome is driven over the DevTools protocol and Firefox through
// Marionette, both with Node's own WebSocket and net modules.
//
//   node scripts/check-smil.mjs export.svg
//   node scripts/check-smil.mjs export.svg --duration 4 --times 0,0.25,0.5,1
//
// Browsers are found in the usual places; set CHROME_PATH or FIREFOX_PATH to point elsewhere.
// Exit code: 0 same in both, 1 they differ, 2 a browser could not be started.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const USAGE = 'Usage: node scripts/check-smil.mjs <animated.svg> [--duration seconds] [--times 0,0.25,0.5,0.75,1]';
const TOLERANCE_PX = 2;
const TOLERANCE_OPACITY = 0.02;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function parseArgs(argv) {
  const args = { file: null, duration: null, times: [0, 0.25, 0.5, 0.75, 1] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--duration') args.duration = Number(argv[++i]);
    else if (argv[i] === '--times') args.times = argv[++i].split(',').map(Number);
    else if (!argv[i].startsWith('--')) args.file = argv[i];
    else throw new Error(`Unknown option ${argv[i]}\n${USAGE}`);
  }
  if (!args.file) throw new Error(USAGE);
  if (args.times.length === 0 || args.times.some((t) => !Number.isFinite(t) || t < 0)) {
    throw new Error('--times takes fractions of the cycle, like 0,0.5,1');
  }
  return args;
}

const firstExisting = (paths) => paths.find((p) => p && existsSync(p));

function findChrome() {
  return firstExisting([
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]);
}

function findFirefox() {
  return firstExisting([
    process.env.FIREFOX_PATH,
    'C:/Program Files/Mozilla Firefox/firefox.exe',
    '/Applications/Firefox.app/Contents/MacOS/firefox',
    '/usr/bin/firefox',
  ]);
}

// The page both browsers load: the SVG inline, and a function that reports where every path is.
function harness(svg, duration, times) {
  return `<!doctype html><meta charset="utf-8"><body style="margin:0">
<div id="host" style="width:240px;height:240px">${svg.replace(/^<\?xml[^>]*>/, '')}</div>
<script>
function measure() {
  const svg = document.querySelector('#host svg');
  svg.setAttribute('width', '240');
  svg.setAttribute('height', '240');
  svg.pauseAnimations();
  return ${JSON.stringify(times)}.map((fraction) => {
    svg.setCurrentTime(fraction * ${duration});
    return [...svg.querySelectorAll('path')].map((p, i) => {
      const box = p.getBoundingClientRect();
      return [p.id || 'path-' + i, Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2), Number(getComputedStyle(p).opacity).toFixed(2)].join(':');
    });
  });
}
</script>`;
}

// ---- Chrome, over the DevTools protocol ----
async function inChrome(executable, pageUrl) {
  const profile = mkdtempSync(join(tmpdir(), 'check-smil-chrome-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const child = spawn(
    executable,
    ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--window-size=600,400', 'about:blank'],
    { stdio: 'ignore' },
  );
  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i++) {
      try {
        const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        target = pages.find((p) => p.type === 'page');
      } catch {
        /* not up yet */
      }
      if (!target) await sleep(250);
    }
    if (!target) throw new Error('Chrome did not start');

    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((open, fail) => {
      socket.onopen = open;
      socket.onerror = fail;
    });
    let id = 0;
    const waiting = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const pending = waiting.get(message.id);
      if (!pending) return;
      waiting.delete(message.id);
      message.error ? pending.fail(new Error(message.error.message)) : pending.done(message.result);
    };
    const send = (method, params = {}) =>
      new Promise((done, fail) => {
        waiting.set(++id, { done, fail });
        socket.send(JSON.stringify({ id, method, params }));
      });

    await send('Page.enable');
    await send('Page.navigate', { url: pageUrl });
    await sleep(1500);
    const result = await send('Runtime.evaluate', { expression: 'measure()', returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    const version = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).Browser;
    socket.close();
    return { name: version, rows: result.result.value };
  } finally {
    child.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  }
}

// ---- Firefox, through Marionette ----
async function inFirefox(executable, pageUrl) {
  const profile = mkdtempSync(join(tmpdir(), 'check-smil-firefox-'));
  const port = 2800 + Math.floor(Math.random() * 500);
  writeFileSync(
    join(profile, 'user.js'),
    `user_pref("marionette.port", ${port});\nuser_pref("datareporting.policy.dataSubmissionEnabled", false);\n`,
  );
  const child = spawn(executable, ['-marionette', '-headless', '-no-remote', '-profile', profile, '-width', '600', '-height', '400'], {
    stdio: 'ignore',
  });
  let socket = null;
  try {
    for (let i = 0; i < 60 && !socket; i++) {
      try {
        socket = await new Promise((open, fail) => {
          const s = net.connect(port, '127.0.0.1', () => open(s));
          s.on('error', fail);
        });
      } catch {
        await sleep(500);
      }
    }
    if (!socket) throw new Error('Firefox did not start');

    // Marionette frames every message as "<length>:<json>"
    let buffer = '';
    let id = 0;
    const waiting = new Map();
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      for (;;) {
        const colon = buffer.indexOf(':');
        if (colon < 0) return;
        const length = Number(buffer.slice(0, colon));
        if (!Number.isFinite(length) || buffer.length < colon + 1 + length) return;
        const message = JSON.parse(buffer.slice(colon + 1, colon + 1 + length));
        buffer = buffer.slice(colon + 1 + length);
        if (Array.isArray(message) && message[0] === 1 && waiting.has(message[1])) {
          const pending = waiting.get(message[1]);
          waiting.delete(message[1]);
          message[2] ? pending.fail(new Error(JSON.stringify(message[2]))) : pending.done(message[3]);
        }
      }
    });
    const send = (name, params = {}) =>
      new Promise((done, fail) => {
        const n = ++id;
        waiting.set(n, { done, fail });
        const body = JSON.stringify([0, n, name, params]);
        socket.write(`${Buffer.byteLength(body)}:${body}`);
      });

    await sleep(1000);
    await send('WebDriver:NewSession', { capabilities: {} });
    await send('Marionette:SetContext', { value: 'content' });
    await send('WebDriver:Navigate', { url: pageUrl });
    await sleep(1500);
    const agent = (await send('WebDriver:ExecuteScript', { script: 'return navigator.userAgent', args: [] })).value;
    const rows = (await send('WebDriver:ExecuteScript', { script: 'return measure()', args: [] })).value;
    try {
      await send('Marionette:Quit');
    } catch {
      /* it closes the connection while quitting */
    }
    return { name: agent.match(/Firefox\/[\d.]+/)?.[0] ?? agent, rows };
  } finally {
    child.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  }
}

const same = (a, b) => {
  const [idA, xA, yA, opacityA] = a.split(':');
  const [idB, xB, yB, opacityB] = b.split(':');
  return (
    idA === idB &&
    Math.abs(xA - xB) <= TOLERANCE_PX &&
    Math.abs(yA - yB) <= TOLERANCE_PX &&
    Math.abs(opacityA - opacityB) <= TOLERANCE_OPACITY
  );
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = resolve(args.file);
  const svg = readFileSync(file, 'utf8');
  if (!/<svg[\s>]/.test(svg)) throw new Error(`${args.file} is not an SVG`);
  if (!/<animate/.test(svg)) console.warn('Warning: the file has no <animate>, so there is nothing to compare over time.');

  const duration = args.duration ?? Number(svg.match(/dur="([\d.]+)s"/)?.[1]);
  if (!(duration > 0)) throw new Error('Could not read the duration from the file: pass --duration <seconds>.');

  const chrome = findChrome();
  const firefox = findFirefox();
  if (!chrome || !firefox) {
    console.error(`Could not find ${!chrome ? 'Chrome (set CHROME_PATH)' : 'Firefox (set FIREFOX_PATH)'}.`);
    process.exit(2);
  }

  const dir = mkdtempSync(join(tmpdir(), 'check-smil-'));
  try {
    const page = join(dir, 'harness.html');
    writeFileSync(page, harness(svg, duration, args.times));
    const url = pathToFileURL(page).href;

    const results = [await inChrome(chrome, url), await inFirefox(firefox, url)];
    const [a, b] = results;
    const differences = [];
    let compared = 0;
    args.times.forEach((time, row) => {
      a.rows[row].forEach((cell, column) => {
        compared++;
        const other = b.rows[row][column] ?? 'missing';
        if (!same(cell, other)) differences.push({ time, [a.name]: cell, [b.name]: other });
      });
    });

    console.log(`${args.file}: ${args.times.length} instants of a ${duration}s cycle, ${compared} paths compared`);
    console.log(`  ${a.name}  vs  ${b.name}`);
    if (differences.length === 0) {
      console.log('  Same in both browsers.');
    } else {
      console.log(`  ${differences.length} difference(s):`);
      for (const difference of differences) console.log('   ', JSON.stringify(difference));
      process.exitCode = 1;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 2;
});
