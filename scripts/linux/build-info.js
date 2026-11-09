const fs = require('fs');
const { execFileSync } = require('child_process');

function getBuildInfo() {
  const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
  return {
    buildCommit: git(['rev-parse', 'HEAD']),
    workingTreeDirty: git(['status', '--porcelain']).length > 0,
    repository: process.env.GITHUB_REPOSITORY || null,
    event: process.env.GITHUB_EVENT_NAME || null,
    ref: process.env.GITHUB_REF || null,
    // A pull_request checkout may be a synthetic merge, not this head commit.
    pullRequestHeadCommit: process.env.PR_HEAD_SHA || null,
  };
}

if (require.main === module) {
  fs.mkdirSync('build', { recursive: true });
  fs.writeFileSync('build/linux-build-info.json', `${JSON.stringify(getBuildInfo(), null, 2)}\n`);
}
module.exports = { getBuildInfo };
