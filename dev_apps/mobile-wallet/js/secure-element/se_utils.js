'use strict';

/* exported SEUtils */

(function(exports) {

  var SEUtils = {
    byteToHexString: function byteToHexString(uint8arr) {
      if (!uint8arr) {
        return '';
      }

      var hexStr = '';
      for (var i = 0; i < uint8arr.length; i++) {
        var hex = (uint8arr[i] & 0xff).toString(16);
        hex = (hex.length === 1) ? '0' + hex : hex;
        hexStr += hex;
      }
      return hexStr.toUpperCase();
    },

    hexStringToByte: function hexStringToByte(str) {
      var a = [];
      for(var i = 0, len = str.length; i < len; i+=2) {
        a.push(parseInt(str.substr(i,2),16));
      }
      return new Uint8Array(a);
    },

    byteToASCIIString: function byteToASCIIString(arr) {
      var str = '';

      var len = arr && arr.length ? arr.length : 0;
      for(var i = 0; i < len; i++) {
        str += arr[i] < 0x20 || arr > 0x7E ? '' : String.fromCharCode(arr[i]);
      }

      return str;
    },

    joinUint8Arrays: function joinUint8Arrays() {
      var args = Array.prototype.slice.call(arguments);
      var length = args.reduce(function(a, b) { return a + b.length; }, 0);
      var out = new Uint8Array(length);

      args.reduce(function(previousLen, buffer) {
        out.set(buffer, previousLen);
        return previousLen + buffer.length;
      }, 0);

      return out;
    },

    // no support for multibyte tag and constructed data object
    parseSimpleTLV: function parseSimpleTLV(data) {
      if(!data) {
        return null;
      }

      var result = {};
      for(var i = 0, len = data.length; i < len;) {
        var tag = data[i];
        var length = data[i+1];
        var value = data.slice(i+2, i+2 + length);
        result[tag] = value;
        i += 2 + length;
      }

      return result;
    },

    promises: {
      whilePromise: function(condition, action, init) {
        return new Promise((resolve, reject) => {
          var loop = (value) => {
            if (condition(value)) {
              return resolve(value);
            }

            return action(value).then(loop).catch(reject);
          };
          loop(init);
        });
      },
    },
  };

  exports.SEUtils = SEUtils;
}((typeof exports === 'undefined') ? window : exports));

