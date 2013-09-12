/* global parseAudioMetadata */
/* exported parseMetadata */

'use strict';

require('/js/metadata_scripts.js');

function _fetch(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function() {
      if (xhr.status != 200) {
        reject(new Error('Failed with status: ' + xhr.status));
      } else {
        resolve(this.response);
      }
    };
    xhr.onerror = xhr.ontimeout = function() {
      reject(new Error('Failed'));
    };
    xhr.responseType = 'arraybuffer';
    xhr.send();
  });
}


function parseMetadata(filename, options) {

  // Override getThumbnailURL, since we don't need/want to talk to the
  // indexedDB here.
  window.getThumbnailURL = function(fileinfo, callback) {
    callback(null);
  };

  return _fetch(filename).then(function(data) {
    return new Promise(function(resolve, reject) {
      parseAudioMetadata(
        new Blob([data]),
        function(metadata) { resolve(metadata); },
        function(error) { reject(error); }
      );
    });
  });
}

function fetchPicture(url) {
  return _fetch(url).then(function(data) {
    return new Uint8Array(data);
  });
}

function checkPicture(actual, expectedBuffer, done) {
  assert.equal(actual.type, 'image/jpeg');
  assert.equal(actual.size, expectedBuffer.byteLength);

  var reader = new FileReader();
  reader.readAsArrayBuffer(actual);
  reader.onload = function(e) {
    var actualBuffer = new Uint8Array(e.target.result);
    for (var i = 0; i < actualBuffer.byteLength; i++) {
      assert.equal(actualBuffer[i], expectedBuffer[i]);
    }
    done();
  };
  reader.onerror = function() {
    assert.ok(false);
    done();
  };
}

