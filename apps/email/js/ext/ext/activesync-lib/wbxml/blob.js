/**
 * Simple Blob and FileReader shim that does enough of an impression of the W3C
 * File API that our unit tests can pass.
 *
 * Key differences:
 * - Blob does not snapshot mutable TypedArray or ArrayBuffer instances passed
 *   in.
 * - Blob surfaces helper logic/properties with underscore-prefixed names.
 * - FileReader is not fully implemented and its events are bare bones.
 **/

function Blob(parts, properties) {
  this._parts = parts;
  var size = 0;

  parts.forEach(function(part) {
    if (part instanceof Blob)
      size += part.size;
    else if (part instanceof ArrayBuffer)
      size += part.byteLength;
    else
      size += part.length;
  });

  this.size = size;
  this.type = properties ? properties.type : null;
};
exports.Blob = Blob;
Blob.prototype = {
  _asArrayBuffer: function() {
    var buffer = new ArrayBuffer(this.size);
    var u8 = new Uint8Array(buffer);
    var offset = 0;

    this._parts.forEach(function(part) {
      var sub8;
      if (part instanceof Blob) {
        var subarr = part._asArrayBuffer();
        sub8 = new Uint8Array(subarr);
        u8.set(sub8, offset);
        offset += sub8.length;
      }
      else if (typeof(part) === 'string') {
        var encoder = new TextEncoder('utf-8');
        sub8 = encoder.encode(part);
        u8.set(sub8, offset);
        offset += sub8.length;
      }
      else if (part instanceof ArrayBuffer) {
        sub8 = new Uint8Array(part);
        u8.set(sub8, offset);
        offset += sub8.length;
      }
      else {
        u8.set(part, offset);
        offset += part.length;
      }
    });

    return buffer;
  }
};

function FileReader() {
  this.error = null;
  this.readyState = this.EMPTY;
  this.result = null;

  this.onabort = null;
  this.onerror = null;
  this.onload = null;
  this.onloadend = null;
  this.onloadstart = null;
  this.onprogress = null;
}
exports.FileReader = FileReader;
FileReader.prototype = {
  EMPTY: 0,
  LOADING: 1,
  DONE: 2,

  readAsArrayBuffer: function(blob) {
    process.nextTick(function() {
      var event = { target: this };
      if (this.onload)
        this.onload(event);
      if (this.onloadend)
        this.onloadend(event);
    }.bind(this));
    this.result = blob._asArrayBuffer();
  },
  readAsBinaryString: function(blob) {
    throw new Error('not implemented');
  },
  readAsDataURL: function(blob) {
    throw new Error('not implemented');
  },
  readAsText: function(blob, encoding) {
    throw new Error('not implemented');
  },
};
