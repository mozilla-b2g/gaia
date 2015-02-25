/* global AudioMetadata */
/* exported parseMetadata, loadPicture */

'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorage.js');

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

function parseMetadata(filename) {
  var songBlob;
  return _fetch(filename).then(function(data) {
    songBlob = new Blob([data]);
    return AudioMetadata.parse(songBlob);
  }).then(function(metadata) {
    if (metadata.picture) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        var coverBlob = metadata.picture.blob || songBlob.slice(
          metadata.picture.start, metadata.picture.end, metadata.picture.type
        );

        reader.readAsArrayBuffer(coverBlob);
        reader.onload = function(event) {
          metadata.picture = {
            flavor: metadata.picture.flavor,
            type: coverBlob.type,
            data: new Uint8Array(reader.result)
          };
          resolve(metadata);
        };
        reader.onerror = function(event) {
          reject(event.target.error);
        };
      });
    } else {
      return Promise.resolve(metadata);
    }
  });
}

function loadPicture(url, type, flavor) {
  return _fetch(url).then(function(data) {
    return {
      flavor: flavor,
      type: type,
      data: new Uint8Array(data)
    };
  });
}
