/* global Zlib */
'use strict';

importScripts('gzip.min.js');

self.onmessage = function(message) {
  var cmd = message.data.cmd;

  if (cmd === 'gzip') {
    // gzip function requires Uint8Array
    var textEncoder = new TextEncoder('utf8');
    var payload = message.data.payload;
    var uint8Data = textEncoder.encode(payload);

    try {
      var gzip = new Zlib.Gzip(uint8Data);
      var compressed = gzip.compress();
      postMessage({returnResult: true, gzipData: compressed});
    }
    catch(e) {
      postMessage({returnResult: false, error: e});
    }
  } else {
    console.warn('GzipWorker, unsupported cmd:', cmd);
  }
};

