const path = require("path");
const { pathToFileURL } = require("url");

const ASSET_SCHEME = "app-assets";

function toAssetUrl(filePath) {
  return `${ASSET_SCHEME}://local/${encodeURIComponent(filePath)}`;
}

function assetUrlToPath(assetUrl) {
  const prefix = `${ASSET_SCHEME}://`;
  if (!assetUrl.startsWith(prefix)) throw new Error("Invalid asset URL");
  let encodedPath = assetUrl.slice(prefix.length);
  if (encodedPath.startsWith("local/")) {
    encodedPath = encodedPath.slice("local/".length);
  }
  return path.normalize(decodeURIComponent(encodedPath));
}

function toFetchableFileUrl(filePath) {
  return pathToFileURL(filePath).toString();
}

module.exports = { ASSET_SCHEME, toAssetUrl, assetUrlToPath, toFetchableFileUrl };
