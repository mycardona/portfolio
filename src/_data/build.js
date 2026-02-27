const versionFromSha = process.env.GITHUB_SHA
  ? process.env.GITHUB_SHA.slice(0, 8)
  : "";

const localBuildVersion = `dev-${Date.now().toString(36)}`;

module.exports = {
  assetVersion: versionFromSha || localBuildVersion
};
