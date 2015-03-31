'use strict';
/* exported MockManifestHelper */

function MockManifestHelper(manifest) {
  for (var prop in manifest) {
    this[prop] = manifest[prop];
  }
}

Object.defineProperty(MockManifestHelper.prototype, 'displayName', {
    get: function displayName() {
      return this.short_name || this.name;
    }
});
