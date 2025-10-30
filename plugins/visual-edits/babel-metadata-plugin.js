// Lightweight stub for babel-metadata-plugin
// The original visual-edit tooling has been removed from this project.
// This stub exports a no-op babel plugin so builds won't fail if the
// visual edits flag is accidentally enabled in development.
module.exports = function babelMetadataPlugin() {
  return { visitor: {} };
};
