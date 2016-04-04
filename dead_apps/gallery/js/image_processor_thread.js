/*
 * This module implements the ImageProcessor API by sending messages
 * to a worker running the code in image_processor_worker.js. That worker
 * has an actual ImageProcessor object that does the image processing.
 * Unlike ImageProcessor which is synchronous and returns promises that are
 * already resolved, this class is asynchronous.
 *
 * See the documentation in image_processor.js for details.
 */
(function(exports) {
  'use strict';

  exports.ImageProcessorThread = ImageProcessorThread;

  // Define this as a constant so we can change it in tests.
  ImageProcessorThread.WORKER_URL = 'js/image_processor_worker.js';

  function ImageProcessorThread(maxPixels) {
    this.maxPixels = maxPixels;
    this.worker = new Worker(ImageProcessorThread.WORKER_URL);
    this.worker.postMessage({
      cmd: 'initialize',
      arg: maxPixels
    });

    this.worker.addEventListener('message', this);
    this.pendingRequests = [];
  }

  ImageProcessorThread.prototype.destroy = function() {
    this.worker.terminate();
  };

  ImageProcessorThread.prototype.setGamma = function(gamma) {
    this.worker.postMessage({ cmd: 'setGamma', arg: gamma });
  };

  ImageProcessorThread.prototype.setLevels = function(levels) {
    this.worker.postMessage({ cmd: 'setLevels', arg: levels });
  };

  ImageProcessorThread.prototype.setMatrix = function(matrix) {
    this.worker.postMessage({ cmd: 'setMatrix', arg: matrix });
  };

  ImageProcessorThread.prototype.processImage = function(pixelBuffer) {
    return new Promise(function(resolve, reject) {
      this.worker.postMessage({ cmd: 'processImage', arg: pixelBuffer },
                              [pixelBuffer]);
      this.pendingRequests.push({ resolve: resolve, reject: reject });
    }.bind(this));
  };

  ImageProcessorThread.prototype.computeHistogram = function(buffer) {
    return new Promise(function(resolve, reject) {
      this.worker.postMessage({ cmd: 'computeHistogram', arg: buffer },
                              [buffer]);
      this.pendingRequests.push({ resolve: resolve, reject: reject });
    }.bind(this));
  };

  ImageProcessorThread.prototype.handleEvent = function handleEvent(e) {
    if (e.type !== 'message') {
      return;
    }

    if (e.data.cmd === 'processImage' || e.data.cmd === 'computeHistogram') {
      var request = this.pendingRequests.shift();
      if (e.data.result) {
        request.resolve(e.data.result);
      }
      else {
        request.reject(e.data.error);
      }
    }
  };
}(this));
