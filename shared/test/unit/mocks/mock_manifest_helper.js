console.time("mock_manifest_helper.js");
'use strict';
/* exported MockManifestHelper */

function MockManifestHelper(manifest) {
  for (var prop in manifest) {
    this[prop] = manifest[prop];
  }
}
console.timeEnd("mock_manifest_helper.js");
