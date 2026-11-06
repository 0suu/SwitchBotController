const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const { buildInstaller } = require('../build-linux-installer');

const temporary = [];
const icon = path.resolve(__dirname, '../../assets/icon.png');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function directory() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'switchbot-installer-test-'));
  temporary.push(dir);
  return dir;
}
afterEach(() => temporary.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })));

function fixture(base, version = '1', mutate = () => {}) {
  const root = `switchbot-fixture-${version}`;
  const source = path.join(base, root);
  fs.mkdirSync(path.join(source, 'resources'), { recursive: true });
  fs.writeFileSync(path.join(source, 'switchbot-controller'), '#!/bin/sh\nprintf "%s\\0" "$@" > "$SB_TEST_ARGUMENTS"\n', { mode: 0o755 });
  fs.writeFileSync(path.join(source, 'resources/app.asar'), `fixture-${version}`);
  fs.copyFileSync(icon, path.join(source, 'resources/icon.png'));
  fs.writeFileSync(path.join(source, 'resources/build-info.json'), '{}');
  mutate(source);
  const archive = path.join(base, `${root}.tar.gz`);
  execFileSync('tar', ['-czf', archive, '-C', base, root]);
  const installer = path.join(base, `${root}.run`);
  buildInstaller(archive, installer, root, icon, { buildCommit: 'a'.repeat(40), workingTreeDirty: false });
  return { installer, archive, hash: sha(archive) };
}

test('self-extracting output preserves the exact compressed payload and records its checksum', () => {
  const base = directory();
  const { installer, archive, hash } = fixture(base);
  const data = fs.readFileSync(installer);
  const marker = Buffer.from('__SWITCHBOT_PAYLOAD__\n');
  const start = data.indexOf(marker) + marker.length;
  assert.ok(start >= marker.length);
  assert.deepEqual(data.subarray(start), fs.readFileSync(archive));
  assert.ok(data.subarray(0, start).toString().includes(`payload_sha='${hash}'`));
  assert.equal(fs.readFileSync(icon).readUInt32BE(16), 512);
  assert.equal(fs.readFileSync(icon).readUInt32BE(20), 512);
});

test('builder refuses unsafe names, source/output collisions, and symlink outputs', () => {
  const base = directory();
  const { archive } = fixture(base);
  assert.throws(() => buildInstaller(archive, archive, 'safe', icon), /overwrite/);
  assert.throws(() => buildInstaller(archive, `${archive}.run`, '../unsafe', icon), /Invalid/);
  const link = path.join(base, 'link.run');
  fs.symlinkSync(archive, link);
  assert.throws(() => buildInstaller(archive, link, 'safe', icon), /symlink/);
  fs.unlinkSync(link);
  fs.symlinkSync(path.join(base, 'nonexistent'), link);
  assert.throws(() => buildInstaller(archive, link, 'safe', icon), /symlink/);
  const output = path.join(base, 'new.run');
  const collision = `${output}.tmp-${process.pid}`;
  fs.writeFileSync(collision, 'unrelated');
  assert.throws(() => buildInstaller(archive, output, 'safe', icon), /EEXIST/);
  assert.equal(fs.readFileSync(collision, 'utf8'), 'unrelated');
});

describe('Linux user-space installer', { skip: process.platform !== 'linux' }, () => {
  function setup(name = 'prefix') {
    const base = directory();
    const prefix = path.join(base, name);
    fs.mkdirSync(prefix);
    const tools = path.join(base, 'tools');
    fs.mkdirSync(tools);
    // Fixtures are portable shell programs. Only emulate the architecture check;
    // never execute a foreign ELF or modify the host's security configuration.
    fs.writeFileSync(path.join(tools, 'uname'), '#!/bin/sh\ncase "$1" in -s) echo Linux;; -m) echo aarch64;; esac\n', { mode: 0o755 });
    if (process.getuid() === 0) {
      fs.writeFileSync(path.join(tools, 'id'), '#!/bin/sh\necho 1000\n', { mode: 0o755 });
    }
    const argsFile = path.join(base, 'arguments');
    const env = { ...process.env, PATH: `${tools}:${process.env.PATH}`, SB_TEST_ARGUMENTS: argsFile };
    const install = (file, args = []) => spawnSync('sh', [file, '--prefix', prefix, ...args], { env, encoding: 'utf8' });
    const appRoot = path.join(prefix, 'share/switchbot-controller');
    const executable = path.join(prefix, 'bin/switchbot-controller');
    const desktop = path.join(prefix, 'share/applications/switchbot-controller.desktop');
    return { base, prefix, tools, env, argsFile, install, appRoot, executable, desktop };
  }
  const passed = result => assert.equal(result.status, 0, result.stderr || result.stdout);
  const failed = result => assert.notEqual(result.status, 0, result.stdout);

  test('installs without retaining Downloads, resolves the icon, and forwards all arguments', () => {
    const s = setup();
    const f = fixture(s.base);
    passed(s.install(f.installer));
    fs.unlinkSync(f.installer);
    fs.unlinkSync(f.archive);
    const args = ['space here', 'quote"', '$money', '%U', '日本語', ''];
    passed(spawnSync(s.executable, args, { env: s.env, encoding: 'utf8' }));
    assert.deepEqual(fs.readFileSync(s.argsFile).toString().split('\0').slice(0, -1), args);
    const installedIcon = path.join(s.appRoot, 'current/resources/icon.png');
    assert.equal(sha(installedIcon), sha(icon));
    assert.ok(fs.readFileSync(s.desktop, 'utf8').includes(`Icon=${installedIcon}`));
    assert.equal(fs.existsSync(path.join(s.prefix, 'share/autostart')), false);
  });

  test('reinstall, update, and rollback preserve the previous version and unrelated config', () => {
    const s = setup();
    const config = path.join(s.base, 'profile/switchbot-controller/switchbot-controller-config.json');
    fs.mkdirSync(path.dirname(config), { recursive: true });
    fs.writeFileSync(config, 'unchanged-secret-placeholder');
    const first = fixture(s.base, '1');
    const second = fixture(s.base, '2');
    passed(s.install(first.installer));
    passed(s.install(first.installer));
    passed(s.install(second.installer));
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${second.hash}`);
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'previous')), `versions/${first.hash}`);
    passed(s.install(second.installer, ['--rollback']));
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${first.hash}`);
    assert.equal(fs.readFileSync(config, 'utf8'), 'unchanged-secret-placeholder');
  });

  test('corrupted or incomplete payloads cannot replace a usable installation', () => {
    const s = setup();
    const first = fixture(s.base, '1');
    passed(s.install(first.installer));
    const corrupt = fixture(s.base, '2');
    fs.appendFileSync(corrupt.installer, 'corruption');
    failed(s.install(corrupt.installer));
    const missingIcon = fixture(s.base, '3', dir => fs.unlinkSync(path.join(dir, 'resources/icon.png')));
    failed(s.install(missingIcon.installer));
    const linked = fixture(s.base, '4', dir => fs.symlinkSync('/tmp', path.join(dir, 'foreign-link')));
    failed(s.install(linked.installer));
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${first.hash}`);
    passed(spawnSync(s.executable, ['still works'], { env: s.env, encoding: 'utf8' }));
  });

  test('failed activation rolls back the previous pointer and leaves the working launcher intact', () => {
    const s = setup();
    const versions = ['1', '2', '3'].map(v => fixture(s.base, v));
    passed(s.install(versions[0].installer));
    passed(s.install(versions[1].installer));
    fs.writeFileSync(path.join(s.tools, 'mv'), '#!/bin/sh\nfor arg do case "$arg" in */switchbot-controller/current) exit 73;; esac; done\nexec /bin/mv "$@"\n', { mode: 0o755 });
    failed(s.install(versions[2].installer));
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${versions[1].hash}`);
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'previous')), `versions/${versions[0].hash}`);
    passed(spawnSync(s.executable, ['still works'], { env: s.env, encoding: 'utf8' }));
    assert.equal(fs.existsSync(path.join(s.appRoot, '.install-lock')), false);
  });

  test('protects foreign application directories, launchers, symlinks, and installer collisions', () => {
    for (const collision of ['directory', 'file', 'symlink', 'source', 'desktop', 'parent-symlink']) {
      const s = setup();
      let f = fixture(s.base);
      let preserved;
      if (collision === 'directory') {
        fs.mkdirSync(s.appRoot, { recursive: true });
        fs.writeFileSync(path.join(s.appRoot, 'unrelated'), 'keep');
        preserved = path.join(s.appRoot, 'unrelated');
      } else if (collision === 'desktop') {
        fs.mkdirSync(path.dirname(s.desktop), { recursive: true });
        fs.writeFileSync(s.desktop, 'keep');
        preserved = s.desktop;
      } else if (collision === 'parent-symlink') {
        const foreign = path.join(s.base, 'foreign');
        fs.mkdirSync(foreign);
        fs.writeFileSync(path.join(foreign, 'keep'), 'keep');
        fs.symlinkSync(foreign, path.dirname(s.executable));
        preserved = path.join(foreign, 'keep');
      } else {
        preserved = s.executable;
        fs.mkdirSync(path.dirname(s.executable), { recursive: true });
        if (collision === 'symlink') fs.symlinkSync(f.archive, s.executable);
        else if (collision === 'source') { fs.copyFileSync(f.installer, s.executable); f.installer = s.executable; }
        else fs.writeFileSync(s.executable, 'keep');
      }
      const before = fs.readFileSync(preserved);
      failed(s.install(f.installer));
      const after = fs.readFileSync(preserved);
      assert.deepEqual(after, before);
    }
  });

  test('desktop entries escape special paths and pass actual desktop parsers when available', async () => {
    const s = setup('space "quote" $dollar %percent `tick` \\slash 日本語');
    const f = fixture(s.base);
    passed(s.install(f.installer));
    const entry = fs.readFileSync(s.desktop, 'utf8');
    assert.ok(entry.includes('%%percent'));
    const validate = spawnSync('desktop-file-validate', [s.desktop], { encoding: 'utf8' });
    if (validate.error?.code === 'ENOENT') {
      assert.equal(process.env.CI, undefined, 'CI must provide desktop-file-validate for this integration check');
    } else passed(validate);
    // GIO parses and executes Exec using the desktop-entry rules (no shell).
    const gio = spawnSync('gio', ['launch', s.desktop], { env: s.env, encoding: 'utf8' });
    if (gio.error?.code !== 'ENOENT') {
      passed(gio);
      for (let attempt = 0; attempt < 40 && !fs.existsSync(s.argsFile); attempt++) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      assert.ok(fs.existsSync(s.argsFile), 'actual desktop launcher did not resolve the executable');
    }
  });
});
