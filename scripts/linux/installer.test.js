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
  fs.writeFileSync(path.join(source, 'switchbot-controller'), '#!/bin/sh\nprintf "%s\\0" "$@" > "$SB_TEST_ARGUMENTS"\nif [ -n "${SB_TEST_EXECUTABLE:-}" ]; then printf "%s" "$0" > "$SB_TEST_EXECUTABLE"; fi\n', { mode: 0o755 });
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
  const { installer, archive, hash } = fixture(base, '1.4.0-RC.1');
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
    // Harmless shell fixtures emulate ARM64 (and a normal-user ID on root test
    // runners). All writes stay in the fixture prefix; no foreign ELF is run.
    fs.writeFileSync(path.join(tools, 'uname'), '#!/bin/sh\ncase "$1" in -s) echo Linux;; -m) echo aarch64;; esac\n', { mode: 0o755 });
    if (process.getuid() === 0) {
      fs.writeFileSync(path.join(tools, 'id'), '#!/bin/sh\necho 1000\n', { mode: 0o755 });
    }
    const argsFile = path.join(base, 'arguments');
    const env = { ...process.env, PATH: `${tools}:${process.env.PATH}`, SB_TEST_ARGUMENTS: argsFile,
      SB_TEST_EXECUTABLE: path.join(base, "invoked-executable") };
    const install = (file, args = []) => spawnSync('sh', [file, '--prefix', prefix, ...args], { env, encoding: 'utf8' });
    const appRoot = path.join(prefix, 'share/switchbot-controller');
    const executable = path.join(prefix, 'bin/switchbot-controller');
    const desktop = path.join(prefix, 'share/applications/switchbot-controller.desktop');
    return { base, prefix, tools, env, argsFile, install, appRoot, executable, desktop };
  }
  const passed = result => assert.equal(result.status, 0, result.stderr || result.stdout);
  const failed = result => assert.notEqual(result.status, 0, result.stdout);

  function interceptActivation(s, action) {
    const realMv = execFileSync('sh', ['-c', 'command -v mv'], { env: s.env, encoding: 'utf8' }).trim();
    const shim = path.join(s.tools, 'mv');
    fs.writeFileSync(shim, `#!/bin/sh
for arg do
  case "$arg" in */switchbot-controller/current) ${action};; esac
done
exec "$SB_TEST_REAL_MV" "$@"
`, { mode: 0o755 });
    s.env.SB_TEST_REAL_MV = realMv;
    return () => fs.unlinkSync(shim);
  }

  test('installs without retaining Downloads, resolves the icon, and forwards all arguments', () => {
    const s = setup();
    const f = fixture(s.base);
    passed(s.install(f.installer));
    fs.unlinkSync(f.installer);
    fs.unlinkSync(f.archive);
    const args = ['space here', 'quote"', '$money', '%U', '日本語', ''];
    passed(spawnSync(s.executable, args, { env: s.env, encoding: 'utf8' }));
    assert.deepEqual(fs.readFileSync(s.argsFile).toString().split('\0').slice(0, -1), args);
    assert.equal(fs.readFileSync(s.env.SB_TEST_EXECUTABLE, 'utf8'), s.executable);
    const installedIcon = path.join(s.appRoot, 'current/resources/icon.png');
    assert.equal(sha(installedIcon), sha(icon));
    assert.ok(fs.readFileSync(s.desktop, 'utf8').includes(`Icon=${installedIcon}`));
    assert.equal(fs.existsSync(path.join(s.prefix, 'share/autostart')), false);
  });

  test('reinstall, update, and rollback keep only the current and previous versions', () => {
    const s = setup();
    const config = path.join(s.base, 'profile/switchbot-controller/switchbot-controller-config.json');
    fs.mkdirSync(path.dirname(config), { recursive: true });
    fs.writeFileSync(config, 'unchanged-secret-placeholder');
    const first = fixture(s.base, '1');
    const second = fixture(s.base, '2');
    const third = fixture(s.base, '3');
    passed(s.install(first.installer));
    passed(s.install(first.installer));
    passed(s.install(second.installer));
    passed(s.install(third.installer));
    const retained = [second.hash, third.hash].sort();
    assert.deepEqual(fs.readdirSync(path.join(s.appRoot, 'versions')).sort(), retained);
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${third.hash}`);
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'previous')), `versions/${second.hash}`);
    passed(s.install(third.installer, ['--rollback']));
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${second.hash}`);
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'previous')), `versions/${third.hash}`);
    assert.deepEqual(fs.readdirSync(path.join(s.appRoot, 'versions')).sort(), retained);
    assert.equal(fs.readFileSync(config, 'utf8'), 'unchanged-secret-placeholder');
  });

  test('reinstall retires legacy managed versions and preserves unrelated directories and links', () => {
    const s = setup();
    const f = fixture(s.base);
    passed(s.install(f.installer));
    const versions = path.join(s.appRoot, 'versions');
    const obsoleteHash = 'a'.repeat(64);
    const obsolete = path.join(versions, obsoleteHash);
    fs.cpSync(path.join(versions, f.hash), obsolete, { recursive: true });
    fs.writeFileSync(path.join(obsolete, '.payload-sha256'), obsoleteHash);

    const foreign = path.join(versions, 'b'.repeat(64));
    fs.mkdirSync(foreign);
    fs.writeFileSync(path.join(foreign, '.payload-sha256'), 'b'.repeat(64));
    fs.writeFileSync(path.join(foreign, '.install-root'), s.base);
    const symlinkHash = 'c'.repeat(64);
    const symlink = path.join(versions, symlinkHash);
    const linkedDir = path.join(s.base, 'linked-directory');
    fs.mkdirSync(linkedDir);
    fs.writeFileSync(path.join(linkedDir, '.install-root'), s.appRoot);
    fs.writeFileSync(path.join(linkedDir, '.payload-sha256'), symlinkHash);
    fs.symlinkSync(linkedDir, symlink);
    const markerLinkHash = 'd'.repeat(64);
    const markerLink = path.join(versions, markerLinkHash);
    fs.mkdirSync(markerLink);
    fs.symlinkSync(path.join(versions, f.hash, '.install-root'), path.join(markerLink, '.install-root'));
    fs.writeFileSync(path.join(markerLink, '.payload-sha256'), markerLinkHash);

    passed(s.install(f.installer));
    assert.deepEqual(fs.readdirSync(versions).sort(), [f.hash, path.basename(foreign), symlinkHash, markerLinkHash].sort());
    assert.equal(fs.readFileSync(path.join(foreign, '.install-root'), 'utf8'), s.base);
    assert.equal(fs.readlinkSync(symlink), linkedDir);
  });

  test('a killed first install can retry after removing its stale lock', () => {
    const s = setup();
    const f = fixture(s.base);
    const restore = interceptActivation(s, 'kill -KILL "$PPID"; exit 0');
    assert.equal(s.install(f.installer).signal, 'SIGKILL');
    assert.equal(fs.readlinkSync(s.executable), path.join(s.appRoot, 'current/switchbot-controller'));
    assert.equal(fs.existsSync(s.executable), false);
    restore();
    fs.rmdirSync(path.join(s.appRoot, '.install-lock'));
    passed(s.install(f.installer));
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${f.hash}`);
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
    interceptActivation(s, 'exit 73');
    failed(s.install(versions[2].installer));
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${versions[1].hash}`);
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'previous')), `versions/${versions[0].hash}`);
    assert.equal(fs.readFileSync(path.join(s.appRoot, 'previous/resources/app.asar'), 'utf8'), 'fixture-1');
    passed(spawnSync(s.executable, ['still works'], { env: s.env, encoding: 'utf8' }));
    assert.equal(fs.existsSync(path.join(s.appRoot, '.install-lock')), false);
  });

  test('a killed update recovers its previous pointer before a rollback', () => {
    const s = setup();
    const [first, second, third] = ['1', '2', '3'].map(v => fixture(s.base, v));
    passed(s.install(first.installer));
    passed(s.install(second.installer));
    const restore = interceptActivation(s, 'kill -KILL "$PPID"; exit 0');
    assert.equal(s.install(third.installer).signal, 'SIGKILL');
    restore();
    fs.rmdirSync(path.join(s.appRoot, '.install-lock'));
    passed(s.install(third.installer, ['--rollback']));
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${first.hash}`);
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'previous')), `versions/${second.hash}`);
  });

  test('termination after activation keeps the last working version for rollback', () => {
    const s = setup();
    const [first, second, third] = ['1', '2', '3'].map(v => fixture(s.base, v));
    passed(s.install(first.installer));
    passed(s.install(second.installer));
    const restore = interceptActivation(s, '"$SB_TEST_REAL_MV" "$@" || exit $?; kill -TERM "$PPID"; exit 0');
    assert.equal(s.install(third.installer).status, 143);
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${third.hash}`);
    restore();
    passed(s.install(third.installer, ['--rollback']));
    assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${second.hash}`);
  });

  test('a damaged current version allows a rollback or a new update', () => {
    for (const rollback of [true, false]) {
      const s = setup();
      const [first, second, third] = ['1', '2', '3'].map(v => fixture(s.base, v));
      passed(s.install(first.installer));
      passed(s.install(second.installer));
      fs.unlinkSync(path.join(s.appRoot, 'current/resources/app.asar'));
      passed(s.install(third.installer, rollback ? ['--rollback'] : []));
      const expected = rollback ? first : third;
      assert.equal(fs.readlinkSync(path.join(s.appRoot, 'current')), `versions/${expected.hash}`);
      const previous = path.join(s.appRoot, 'previous');
      if (rollback) assert.equal(fs.lstatSync(previous, { throwIfNoEntry: false }), undefined);
      else assert.equal(fs.readlinkSync(previous), `versions/${first.hash}`);
      assert.equal(fs.existsSync(path.join(s.appRoot, 'versions', second.hash)), false);
    }
  });

  test('protects foreign application directories, launchers, symlinks, and installer collisions', () => {
    for (const collision of ['directory', 'file', 'symlink', 'source', 'desktop', 'parent-symlink', 'version-pointer']) {
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
      } else if (collision === 'version-pointer') {
        passed(s.install(f.installer));
        preserved = path.join(s.appRoot, 'current');
        fs.unlinkSync(preserved);
        fs.symlinkSync(f.archive, preserved);
        f = fixture(s.base, '2');
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
