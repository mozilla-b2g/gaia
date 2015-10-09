/* exported Gzip */
'use strict';

var Gzip = {

  WORKER_URL: '/shared/js/gzip/gzip_worker.js',
  compress: function(payload) {

    return new Promise((resolve, reject) => {

      var worker = new Worker(this.WORKER_URL);

      // Protect against the worker failing for whatever reason.
      var workerTimeout = setTimeout(function() {
        worker.terminate();
        reject('Failed to compress: gzip worker did not respond.');
      }, 10000);

      worker.onmessage = function(msg) {
        clearTimeout(workerTimeout);
        worker.terminate();

        var data = msg.data;
        if (data.returnResult) {
          resolve(data.gzipData);
        }
        else {
          reject('Failed to compress: ' + data.error);
        }
      };

      worker.postMessage({
        cmd: 'gzip',
        payload: payload
      });
    });
  }
};

