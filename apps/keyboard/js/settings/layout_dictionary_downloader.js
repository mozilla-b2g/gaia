'use strict';

(function(exports) {

var LayoutDictionaryDownloader = function(imEngineId, dictFilename) {
  this.imEngineId = imEngineId;
  this.dictFilename = dictFilename;

  this._xhr = null;
};

// Remote URLs to download the data. We require the remote server to have
// CORS turned on since we are not asking for SystemXHR permission.
LayoutDictionaryDownloader.prototype.REMOTE_URL =
  'https://fxos.cdn.mozilla.net/dictionaries/%imEngineId/%ver/%dictFilename';

// If the data schema changes in an incompatible way, we must bump the
// version-to-download here.
LayoutDictionaryDownloader.prototype.ENGINE_DATA_VERSIONS = Object.freeze({
  'latin': 1
});

LayoutDictionaryDownloader.prototype.onprogress = null;

LayoutDictionaryDownloader.prototype.load = function() {
  if (this._xhr) {
    throw new Error('LayoutDictionaryDownloader: Already downloading...');
  }

  var p = new Promise(function(resolve, reject) {
    var url = this.REMOTE_URL
      .replace('%imEngineId', this.imEngineId)
      .replace('%ver', this.ENGINE_DATA_VERSIONS[this.imEngineId])
      .replace('%dictFilename', this.dictFilename);

    var xhr = this._xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = function(evt) {
      if (typeof this.onprogress === 'function') {
        this.onprogress(evt.loaded, evt.total);
      }
    }.bind(this);

    xhr.onloadend = function() {
      this._xhr = null;

      var data = xhr.response;
      // We will only resolve the promise when the data is verified.
      // For any other situration, we simply return the HTTP status code as
      // a rejected placeholder value.
      // (it doesn't really matter if you got 200/404/500
      // or anything if it's not what you are looking for right :-/?)
      if (data && this._verifyData(data)) {
        if (typeof this.onprogress === 'function') {
          this.onprogress(data.byteLength, data.byteLength);
        }

        resolve(data);
      } else {
        reject(xhr.statusText);
      }
    }.bind(this);

    xhr.send();
  }.bind(this));

  return p;
};

LayoutDictionaryDownloader.prototype.abort = function() {
  if (!this._xhr) {
    throw new Error('LayoutDictionaryDownloader: ' +
      'Not downloading but abort is called.');
  }

  this._xhr.abort();

  this._xhr = null;
};

LayoutDictionaryDownloader.prototype._verifyData = function(buffer) {
  switch (this.imEngineId) {
    case 'latin':
      // There is only first 8 bytes to check -- we can't be sure if the data
      // is truncated. However that shouldn't happen since our CDN sends out
      // Content-Length header.
      //
      // TODO: Harden the verification here in some way.
      //
      if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 8) {
        return false;
      }
      var view = new Uint8Array(buffer, 0, 8);
      return (String.fromCharCode.apply(String, view) === 'FxOSDICT');

    default:
      throw new Error('LayoutDictionaryDownloader: ' +
        'No verify method available for this imEngine.');
  }
};

exports.LayoutDictionaryDownloader = LayoutDictionaryDownloader;

}(window));
