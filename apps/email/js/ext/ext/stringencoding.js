'use strict';
/**
 * This TextEncoder and TextDecoder are used by MimeParser. In
 * addition to their standard behavior, we also support decoding utf-7.
 */
define(function(require) {
  var utf7 = require('utf7');
  return {
    TextEncoder: function(encoding) {
      var encoder = new TextEncoder(encoding);
      this.encode = encoder.encode.bind(encoder);
    },
    TextDecoder: function(encoding) {
      encoding = encoding && encoding.toLowerCase();
      if (encoding === 'utf-7' || encoding === 'utf7') {
        this.decode = function(buf) {
          var mimefuncs = require('mimefuncs');
          return utf7.decode(mimefuncs.fromTypedArray(buf));
        };
      } else {
        var decoder = new TextDecoder(encoding);
        this.decode = decoder.decode.bind(decoder)
      }
    }
  };
});
