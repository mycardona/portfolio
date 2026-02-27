const versionFromSha = process.env.GITHUB_SHA
  ? process.env.GITHUB_SHA.slice(0, 8)
  : "";

module.exports = {
  assetVersion: versionFromSha || "dev"
};
