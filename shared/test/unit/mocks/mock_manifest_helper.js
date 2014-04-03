'use strict';
/* exported MockManifestHelper */

function MockManifestHelper(manifest) {
  for (var prop in manifest) {
    this[prop] = manifest[prop];
  }
}
