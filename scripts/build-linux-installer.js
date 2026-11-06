const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function buildInstaller(archive, output, archiveRoot, icon, buildInfo = {}) {
  if (!/^[a-z0-9][a-z0-9.+-]*$/.test(archiveRoot)) throw new Error('Invalid archive root');
  if (path.resolve(archive) === path.resolve(output)) throw new Error('Installer would overwrite its payload');
  if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw new Error('Installer output is a symlink');
  const commit = buildInfo.buildCommit || "unknown";
  if (!/^(?:[a-f0-9]{40}|unknown)$/.test(commit)) throw new Error("Invalid build commit");
  const payload = fs.readFileSync(archive);
  const sha = data => crypto.createHash('sha256').update(data).digest('hex');
  const header = fs.readFileSync(path.join(__dirname, 'linux/install.sh'), 'utf8')
    .replaceAll('@PAYLOAD_SHA256@', sha(payload))
    .replaceAll('@ICON_SHA256@', sha(fs.readFileSync(icon)))
    .replaceAll('@ARCHIVE_ROOT@', archiveRoot)
    .replaceAll('@BUILD_COMMIT@', commit)
    .replaceAll('@SOURCE_DIRTY@', buildInfo.workingTreeDirty ? 'true' : 'false');
  const temporary = `${output}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, Buffer.concat([Buffer.from(header), payload]), { mode: 0o755, flag: 'wx' });
    fs.renameSync(temporary, output);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }

}

if (require.main === module) {
  const pkg = require('../package.json');
  const root = `${pkg.name}-${pkg.version}-linux-arm64`;
  buildInstaller(path.join('release', `${root}.tar.gz`), path.join('release', `${root}.run`), root, 'assets/icon.png', JSON.parse(fs.readFileSync('build/linux-build-info.json', 'utf8')));
  console.log(`Created release/${root}.run`);
}

module.exports = { buildInstaller };
