/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// see http://www.wapforum.org/what/technical/SPEC-WAESpec-19990524.pdf

var WBMP = (function(document) {
  function decode(arrayBuffer, callback) {
    // Pointer into the byte stream.
    var bytes = new Uint8Array(arrayBuffer);
    var ptr = 0;

    // Read unsigned octet from the byte stream.
    function readOctet() {
      return bytes[ptr++] & 0xff;
    }

    // Read unsigned multi-byte integer (6.3.1) from the byte stream.
    function readMultiByteInteger() {
      var result = 0;
      while (true) {
        if (result & 0xfe000000)
          throw 'error parsing integer';
        var b = bytes[ptr++];
        result = (result << 7) | (b & 0x7f);
        if (!(b & 0x80))
          return result;
      }
    }

    try {
      // We only support image type 0: B/W, no compression
      if (readMultiByteInteger() != 0)
        return false;
      // We don't expect any extended headers here.
      if (readOctet() != 0)
        return false;
      var width = readMultiByteInteger();
      var height = readMultiByteInteger();
      // Reject incorrect image dimensions.
      if (width == 0 || width > 65535 || height == 0 || height > 65535)
        return false;
      // Create a canvas to draw the pixels into.
      var canvas = document.createElement('canvas');
      canvas.setAttribute('width', width);
      canvas.setAttribute('height', height);
      var ctx = canvas.getContext('2d');
      var imageData = ctx.createImageData(width, height);
      var data = imageData.data;
      // Decode the image.
      for (var y = 0; y < height; ++y) {
        for (var x = 0; x < width; x += 8) {
          var bits = bytes[ptr++];
          var w = (y * width + x) * 4;
          function write(bit) {
            var color = bit ? 255 : 0;
            data[w++] = color;
            data[w++] = color;
            data[w++] = color;
            data[w++] = 255;
          }
          write(bits & 0x80);
          write(bits & 0x40);
          write(bits & 0x20);
          write(bits & 0x10);
          write(bits & 0x08);
          write(bits & 0x04);
          write(bits & 0x02);
          write(bits & 0x01);
        }
      }
      if (ptr > bytes.length)
        return null;
      // Update the canvas pixels.
      ctx.putImageData(imageData, 0, 0);
      // Convert to an image.
      canvas.toBlob(callback);
    } catch (e) {
      // Error occured.
      return null;
    }
  }

  return {
    decode: decode
  };
})(document);
