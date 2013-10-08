'use strict';

function MockManifestHelper(manifest) {
  for (var prop in manifest) {
    this[prop] = manifest[prop];
  }
}
