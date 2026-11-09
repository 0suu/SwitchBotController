// Native Linux CI evidence only. No credentials or live-device commands.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync, execFileSync } = require('child_process');

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
let nativeExecutable;
env.SWITCHBOT_GUI_SMOKE_ID = temporary;

function run(command, args, options = {}) {
  return execFileSync(command, args, { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options });
}
function blocked(reason) {
  report.result = 'blocked'; report.reason = reason;
  console.log(`GUI BLOCKED (no security bypass attempted): ${reason}`);
}
function verifyWindowIcon(property, expectedWidth, expectedHeight) {
  const values = property.split('=')[1]?.match(/\d+/g)?.map(Number) || [];
  // Each _NET_WM_ICON image contains width, height, and width × height ARGB values.
  for (let at = 0; at + 2 < values.length;) {
    const width = values[at++];
    const height = values[at++];
    const end = at + width * height;
    if (!width || !height || end > values.length) break;
    if (width === expectedWidth && height === expectedHeight) {
      for (let pixel = at; pixel < end; pixel++) {
        if (values[pixel] >>> 24) return;
      }
    }
    at = end;
  }
  throw new Error(`Window did not publish a non-empty ${expectedWidth}x${expectedHeight} icon`);
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
  const installedIcon = fs.readFileSync(path.join(installed, 'resources/icon.png'));
  if (!installedIcon.equals(fs.readFileSync('assets/icon.png'))) throw new Error('Installed icon differs from source asset');
  report.installation = 'passed';
  const libraries = run('ldd', [nativeExecutable]);
  if (libraries.includes('not found')) { blocked(`Missing runtime libraries: ${libraries.split('\n').filter(line => line.includes('not found')).join('; ')}`); return; }
  for (const name of ['Xvfb', 'xprop', 'xwininfo', 'gio']) {
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
  // xprop's default limit truncates a 512px icon, whose CARDINALs use Xlib longs.
  const iconProperty = run('xprop', ['-id', window, '-len', '4194304', '-notype', '-f', '_NET_WM_ICON', '32c', '_NET_WM_ICON']);
  const iconWidth = installedIcon.readUInt32BE(16);
  const iconHeight = installedIcon.readUInt32BE(20);
  verifyWindowIcon(iconProperty, iconWidth, iconHeight);
  report.result = 'passed';
  report.displayBackend = 'X11/Xvfb';
  report.sandbox = 'Default Electron sandbox; no bypass flags or host policy changes';
  report.windowIcon = `${iconWidth}x${iconHeight} non-empty _NET_WM_ICON`;
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
