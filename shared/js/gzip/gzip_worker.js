/* global Zlib */
'use strict';

importScripts('/shared/js/gzip/gzip.min.js');

self.onmessage = function(message) {
  var cmd = message.data.cmd;

  if (cmd === 'gzip') {

    // gzip function requires Uint8Array
    var textEncoder = new TextEncoder('utf8');
    var payload = message.data.payload;
    var uint8Data = textEncoder.encode(payload);

    var gzip = new Zlib.Gzip(uint8Data);
    var compressed = gzip.compress();
    postMessage(compressed);
  } else {
    console.warn('GzipWorker, unsupported cmd:', cmd);
  }
};

