MockManifestHelper = function(manifest) {
  for (var prop in manifest) {
    this[prop] = manifest[prop];
  }
};
