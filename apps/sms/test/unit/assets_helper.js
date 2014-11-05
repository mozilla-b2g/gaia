/*global Promise */

/*exported AssetsHelper */

'use strict';

var AssetsHelper = {
  generateCanvas: function(width, height) {
    var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    var linearGradient = context.createLinearGradient(0, 0, width, height);
    linearGradient.addColorStop(0, 'blue');
    linearGradient.addColorStop(1, 'red');

    context.fillStyle = linearGradient;
    context.fillRect (0, 0, width, height);

    return canvas;
  },

  generateImageDataURL: function(width, height, type, quality) {
    var canvas = null;
    try {
      canvas = this.generateCanvas(width, height);
      return canvas.toDataURL(type, quality);
    } finally {
      canvas.width = canvas.height = 0;
      canvas = null;
    }
  },

  generateImageBlob: function(width, height, type, quality) {
    var canvas = this.generateCanvas(width, height);

    return new Promise(function(resolve) {
      canvas.toBlob(function(blob) {
        canvas.width = canvas.height = 0;
        canvas = null;

        resolve(blob);
      }, type, quality);
    });
  },

  loadFileBlob: function(filePath) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', filePath, true);
      xhr.responseType = 'blob';
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = reject;
      xhr.send();
    });
  }
};
