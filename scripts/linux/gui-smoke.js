// Native Linux CI evidence only. No credentials or live-device commands.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync, execFileSync } = require('child_process');
const { PNG } = require('pngjs');

const evidence = path.resolve('release/gui-evidence');
fs.mkdirSync(evidence, { recursive: true });
const log = fs.openSync(path.join(evidence, 'launch.log'), 'w');
const report = { result: 'not-run', platform: process.platform, arch: process.arch };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'switchbot-gui-'));
const home = path.join(temporary, 'home "quote" $dollar %percent 日本語');
fs.mkdirSync(home, { mode: 0o700 });
const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'),
  XDG_DATA_HOME: path.join(home, '.local/share'), XDG_CACHE_HOME: path.join(home, '.cache'),
  XDG_RUNTIME_DIR: path.join(temporary, 'runtime') };
delete env.ELECTRON_DISABLE_SANDBOX;
fs.mkdirSync(env.XDG_RUNTIME_DIR, { mode: 0o700 });
let displayServer;
let appPid;
let nativeExecutable;
env.SWITCHBOT_GUI_SMOKE_ID = temporary;

function run(command, args, options = {}) {
  return execFileSync(command, args, { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options });
}
function blocked(reason) {
  report.result = 'blocked'; report.reason = reason;
  console.log(`GUI BLOCKED (no security bypass attempted): ${reason}`);
}
function xwdToPng(file, output) {
  const data = fs.readFileSync(file);
  const header = Array.from({ length: 25 }, (_, i) => data.readUInt32BE(i * 4));
  const [size, version, , , width, height] = header;
  if (version !== 7 || ![24, 32].includes(header[11])) throw new Error('Unsupported XWD screenshot format');
  const image = new PNG({ width, height });
  const start = size + header[19] * 12;
  const bytes = header[11] / 8;
  const channel = (pixel, mask) => {
    const shift = Math.clz32(mask & -mask) ^ 31;
    return Math.round(((pixel & mask) >>> shift) * 255 / (mask >>> shift));
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = start + y * header[12] + x * bytes;
    const pixel = header[7] === 0 ? data.readUIntLE(at, bytes) : data.readUIntBE(at, bytes);
    const out = (y * width + x) * 4;
    image.data[out] = channel(pixel, header[14]);
    image.data[out + 1] = channel(pixel, header[15]);
    image.data[out + 2] = channel(pixel, header[16]);
    image.data[out + 3] = 255;
  }
  fs.writeFileSync(output, PNG.sync.write(image));
}
function verifyWindowIcon(text, expected) {
  const numbers = text.slice(text.indexOf('=') + 1).match(/\d+/g)?.map(Number) || [];
  let image;
  for (let at = 0; at + 2 < numbers.length;) {
    const width = numbers[at++], height = numbers[at++];
    if (!width || !height || width * height > numbers.length - at) break;
    if (width === expected.width && height === expected.height) {
      image = new PNG({ width, height });
      for (let i = 0; i < width * height; i++) {
        const pixel = numbers[at + i] >>> 0;
        image.data.set([(pixel >>> 16) & 255, (pixel >>> 8) & 255, pixel & 255, pixel >>> 24], i * 4);
      }
      break;
    }
    at += width * height;
  }
  if (!image) throw new Error('Window did not publish the packaged 512px icon');
  fs.writeFileSync(path.join(evidence, 'window-icon.png'), PNG.sync.write(image));
  for (let i = 0; i < expected.data.length; i += 4) {
    if (image.data[i + 3] !== expected.data[i + 3]) throw new Error('Window icon alpha differs from packaged asset');
    if (!expected.data[i + 3]) continue;
    // Native image premultiplication can round partially transparent edges.
    const tolerance = expected.data[i + 3] === 255 ? 0 : 4;
    for (let c = 0; c < 3; c++) if (Math.abs(image.data[i + c] - expected.data[i + c]) > tolerance) {
      throw new Error('Window icon pixels differ from the packaged asset');
    }
  }
}

async function main() {
  if (process.platform !== 'linux' || process.arch !== 'arm64') throw new Error('GUI test requires native Linux ARM64');
  const artifact = fs.readdirSync('release').find(file => file.endsWith('-linux-arm64.run'));
  if (!artifact) throw new Error('No installer artifact');
  run('sh', [path.resolve('release', artifact)], { stdio: ['ignore', log, log] });
  const installed = path.join(env.XDG_DATA_HOME, 'switchbot-controller/current');
  const desktop = path.join(env.XDG_DATA_HOME, 'applications/switchbot-controller.desktop');
  const buildInfo = JSON.parse(fs.readFileSync(path.join(installed, 'resources/build-info.json')));
  nativeExecutable = fs.realpathSync(path.join(installed, 'switchbot-controller'));
  report.buildInfo = buildInfo;
  if (buildInfo.buildCommit !== run('git', ['rev-parse', 'HEAD']).trim()) throw new Error('Payload build commit does not match checkout');
  const expected = PNG.sync.read(fs.readFileSync('assets/icon.png'));
  const installedIcon = fs.readFileSync(path.join(installed, 'resources/icon.png'));
  if (!installedIcon.equals(fs.readFileSync('assets/icon.png'))) throw new Error('Installed icon differs from source asset');
  run('desktop-file-validate', [desktop]);
  report.installation = 'passed';
  report.desktopEntry = fs.readFileSync(desktop, 'utf8');
  const libraries = run('ldd', [path.join(installed, 'switchbot-controller')]);
  fs.writeFileSync(path.join(evidence, 'runtime-libraries.txt'), libraries);
  if (libraries.includes('not found')) { blocked(`Missing runtime libraries: ${libraries.split('\n').filter(line => line.includes('not found')).join('; ')}`); return; }
  for (const name of ['Xvfb', 'xprop', 'xwininfo', 'xwd', 'gio']) {
    const helper = spawnSync('which', [name], { env, encoding: 'utf8' });
    if (helper.status !== 0) { blocked(`Missing GUI test tool: ${name}`); return; }
    const dependencies = run('ldd', [helper.stdout.trim()]);
    if (dependencies.includes('not found')) { blocked(`GUI helper ${name} has missing libraries: ${dependencies}`); return; }
  }
  displayServer = spawn('Xvfb', ['-displayfd', '3', '-screen', '0', '1280x900x24', '-nolisten', 'tcp', '-ac'],
    { env, stdio: ['ignore', log, log, 'pipe'] });
  let display = '';
  displayServer.stdio[3].on('data', chunk => { display += chunk; });
  for (let attempt = 0; attempt < 40 && !display.trim() && displayServer.exitCode === null; attempt++) await delay(100);
  if (!display.trim()) { blocked(`Xvfb could not create a display; see launch.log (exit ${displayServer.exitCode})`); return; }
  env.DISPLAY = `:${display.trim()}`;
  run('gio', ['launch', desktop], { stdio: ['ignore', log, log] });
  let window;
  for (let attempt = 0; attempt < 80; attempt++) {
    const tree = run('xwininfo', ['-root', '-tree']);
    const line = tree.split('\n').find(value => value.includes('"SwitchBot Controller"'));
    if (line) { window = line.match(/0x[0-9a-f]+/i)?.[0]; if (window) break; }
    await delay(250);
  }
  if (!window) {
    const output = fs.readFileSync(path.join(evidence, 'launch.log'), 'utf8');
    if (/No usable sandbox|SUID sandbox|Failed to move to new namespace|namespace.*Operation not permitted|zygote.*Operation not permitted/i.test(output)) {
      blocked(`Sandbox startup rejected by existing host policy: ${output.split('\n').filter(line => /sandbox|namespace|zygote/i.test(line)).join('\n')}`); return;
    }
    throw new Error('Installed desktop launcher produced no app window; see launch.log');
  }
  await delay(1000);
  const properties = run('xprop', ['-id', window, 'WM_CLASS', 'WM_NAME', '_NET_WM_PID']);
  fs.writeFileSync(path.join(evidence, 'window-properties.txt'), properties);
  if (!properties.includes('"switchbot-controller", "switchbot-controller"')) throw new Error('Unexpected actual WM_CLASS');
  appPid = Number(properties.match(/_NET_WM_PID[^=]*=\s*(\d+)/)?.[1]);
  const iconProperty = run('xprop', ['-id', window, '-notype', '-f', '_NET_WM_ICON', '32c', '_NET_WM_ICON']);
  run('xwd', ['-root', '-silent', '-out', path.join(evidence, 'desktop.xwd')]);
  xwdToPng(path.join(evidence, 'desktop.xwd'), path.join(evidence, 'desktop.png'));
  fs.unlinkSync(path.join(evidence, 'desktop.xwd'));
  verifyWindowIcon(iconProperty, expected);
  const output = fs.readFileSync(path.join(evidence, 'launch.log'), 'utf8');
  if (!output.includes(path.join(env.XDG_CONFIG_HOME, 'switchbot-controller'))) throw new Error('App did not confirm isolated config path');
  report.result = 'passed';
  report.displayBackend = 'X11/Xvfb (not KDE or Steam Frame hardware)';
  report.sandbox = 'Default Electron sandbox; no bypass flags or host policy changes';
  report.windowIcon = '512px runtime property matches packaged pixels (allowing native edge rounding)';
}

function testProcesses() {
  const marker = Buffer.from(`SWITCHBOT_GUI_SMOKE_ID=${temporary}\0`);
  const pids = [];
  for (const entry of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(entry) || Number(entry) === process.pid) continue;
    let marked = false;
    let executable;
    let argumentZero;
    try {
      const stat = fs.readFileSync(`/proc/${entry}/stat`, 'utf8');
      if (stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z')) continue;
    } catch { continue; }
    try { marked = fs.readFileSync(`/proc/${entry}/environ`).includes(marker); } catch {}
    try { executable = fs.readlinkSync(`/proc/${entry}/exe`); } catch {}
    try { argumentZero = fs.readFileSync(`/proc/${entry}/cmdline`, 'utf8').split('\0')[0]; } catch {}
    const stable = path.join(home, '.local/bin/switchbot-controller');
    const current = path.join(env.XDG_DATA_HOME, 'switchbot-controller/current/switchbot-controller');
    if (marked || (nativeExecutable && [executable, argumentZero].includes(nativeExecutable)) ||
        argumentZero === stable || argumentZero === current) pids.push(Number(entry));
  }
  return pids;
}
async function stopTestProcesses() {
  const signal = (pids, type) => pids.forEach(pid => { try { process.kill(pid, type); } catch {} });
  signal(testProcesses(), 'SIGTERM');
  for (let attempt = 0; attempt < 40 && testProcesses().length; attempt++) await delay(50);
  signal(testProcesses(), 'SIGKILL');
  for (let attempt = 0; attempt < 20 && testProcesses().length; attempt++) await delay(50);
  return testProcesses().length === 0;
}

main().catch(error => { report.result = 'failed'; report.reason = error.stack; process.exitCode = 1; }).finally(async () => {
  // GIO launches asynchronously. Stop every marked test child and wait before
  // deleting its files, including failures before a window/PID was discovered.
  const stopped = await stopTestProcesses();
  displayServer?.kill();
  report.cleanup = stopped ? 'Test processes stopped before removing temporary files' : 'Temporary files retained: a test process is still running';
  fs.closeSync(log);
  fs.writeFileSync(path.join(evidence, 'result.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### Native Linux desktop GUI check: ${report.result}\n\n${report.reason || report.windowIcon || ''}\n\nNo Steam Frame hardware or live-device test occurred.\n`);
  console.log(JSON.stringify(report, null, 2));
  // The directory is exclusively this invocation's temporary profile/install.
  if (stopped) fs.rmSync(temporary, { recursive: true, force: true });
});
