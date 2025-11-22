const fs = require('fs');
const path = require('path');
const util = require('util');
const checker = require('license-checker-rseidelsohn');

const init = util.promisify(checker.init);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'build', 'licenses');
const outputFile = path.join(outputDir, 'THIRD_PARTY_LICENSES.txt');
const packageJson = require(path.join(projectRoot, 'package.json'));

function readLicenseFile(filePath) {
  if (!filePath) {
    return '';
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return '';
  }
}

function formatPackage(pkgName, info) {
  const license = Array.isArray(info.licenses)
    ? info.licenses.join(', ')
    : info.licenses || 'UNKNOWN';
  const publisher = info.publisher || 'N/A';
  const repository = info.repository || info.url || 'N/A';
  const licenseFile = info.licenseFile ? path.relative(projectRoot, info.licenseFile) : 'N/A';
  const licenseText = (info.licenseText || readLicenseFile(info.licenseFile) || 'License text unavailable.').trim();

  return [
    pkgName,
    `License: ${license}`,
    `Publisher: ${publisher}`,
    `Repository: ${repository}`,
    `License file: ${licenseFile}`,
    '',
    licenseText,
  ].join('\n');
}

async function main() {
  const skipSelf = packageJson.name && packageJson.version ? `${packageJson.name}@${packageJson.version}` : null;
  const packages = await init({
    start: projectRoot,
    production: true,
    licenseText: true,
  });

  const entries = Object.keys(packages)
    .filter((pkgName) => pkgName !== skipSelf)
    .sort((a, b) => a.localeCompare(b))
    .map((pkgName) => formatPackage(pkgName, packages[pkgName]));

  const header = [
    `Third-party licenses for ${packageJson.name || 'application'} v${packageJson.version || ''}`.trim(),
    `Generated at ${new Date().toISOString()}`,
    '',
  ].join('\n');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, `${header}${entries.join('\n\n-----\n\n')}\n`, 'utf8');
  console.log(`Saved license report for ${entries.length} dependencies to ${path.relative(projectRoot, outputFile)}`);
}

main().catch((error) => {
  console.error('[license-generation] Failed to generate license report.');
  console.error(error);
  process.exit(1);
});
