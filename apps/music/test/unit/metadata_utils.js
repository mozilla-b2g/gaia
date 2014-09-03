/* global parseAudioMetadata */
/* exported parseMetadata */

'use strict';

require('/js/metadata_scripts.js');

function parseMetadata(filename, callback, done) {

  // Override getThumbnailURL, since we don't need/want to talk to the
  // indexedDB here.
  window.getThumbnailURL = function(fileinfo, callback) {
    callback(null);
  };

  var xhr = new XMLHttpRequest();
  xhr.open('GET', filename);
  xhr.onload = function() {
    assert.equal(xhr.status, 200);
    parseAudioMetadata(
      new Blob([this.response]),
      function(metadata) {
        callback(metadata);
        done();
      },
      function(error) {
        assert.equal(null, error);
        done();
      }
    );
  };
  xhr.onerror = xhr.ontimeout = function() {
    assert.ok(false);
    done();
  };
  xhr.responseType = 'arraybuffer';
  xhr.send();
}

