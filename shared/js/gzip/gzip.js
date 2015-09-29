/* exported Gzip */
'use strict';

var Gzip = {

  WORKER_URL: 'shared/js/gzip/gzip_worker.js',
  compress: function(payload) {

    console.log('AdvancedTelemetry entering gzip compress:', this.WORKER_URL);
    var self = this;
    return new Promise(function(resolve, reject) {

      console.log('AdvancedTelemetry gzip worker url:', self.WORKER_URL);

      var worker = new Worker(self.WORKER_URL);
      console.log('AdvancedTelemetry gzip worker, worker:', worker);

      // Protect against the worker failing for whatever reason.
      var workerTimeout = setTimeout(function() {
        worker.terminate();
        reject('gzip worker did not respond.');
      }, 10000);

      worker.onmessage = function(msg) {
      console.log('AdvancedTelemetry gzip, got response from worker');

        clearTimeout(workerTimeout);
        worker.terminate();
        var compressed = msg.data;
        if (compressed && compressed.length) {
          console.log('AdvancedTelemetry gzip, compressed length:',
            compressed.length);
          resolve(compressed);
        } else {
          reject('Failed to compress.');
        }
      };

      worker.postMessage({
        cmd: 'gzip',
        payload: payload
      });
    });
  }

};

