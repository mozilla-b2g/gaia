/* global BlobView */
/* exported fetchBlobView, fetchBuffer, readPicSlice, assertBuffersEqual, pass,
   fail */

'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/blobview.js');
require('/js/metadata/formats.js');

function pass(done) {
  return function() { done(); };
}

function fail(done, desc) {
  if (!desc) {
    desc = 'unknown error';
  }
  return function(err) { done(err || new Error(desc)); };
}

function fetchBuffer(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function() {
      if (xhr.status !== 200) {
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

function makeBlobView(blob, size) {
  if (size === undefined) {
    size = 64 * 1024;
  }

  return new Promise(function(resolve, reject) {
    BlobView.get(blob, 0, size, function(blobview, error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(blobview);
    });
  });
}

function fetchBlobView(url, size) {
  return fetchBuffer(url).then(function(buffer) {
    return makeBlobView(new Blob([buffer]), size);
  });
}

function readBlob(blob) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    reader.onload = function(event) {
      resolve(reader.result);
    };
    reader.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

function readPicSlice(blob, picture) {
  var slice = blob.slice(picture.start, picture.end, picture.type);
  return readBlob(slice);
}

function assertBuffersEqual(a, b) {
  return assert.deepEqual(new Uint8Array(a), new Uint8Array(b));
}
