/* global MozActivity */
(function(window) {
  'use strict';

  function generateCanvas(width, height) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    var linearGradient = context.createLinearGradient(0, 0, width, height);
    linearGradient.addColorStop(0, 'blue');
    linearGradient.addColorStop(1, 'red');

    context.fillStyle = linearGradient;
    context.fillRect (0, 0, width, height);

    return canvas;
  }

  function generateImageBlob(width, height, type, quality) {
    var canvas = generateCanvas(width, height);

    return new Promise(function(resolve) {
      canvas.toBlob(function(blob) {
        canvas.width = canvas.height = 0;
        canvas = null;

        resolve(blob);
      }, type, quality);
    });
  }

  window.addEventListener('load', function() {
    var shareImageButton = document.getElementById('share-image');

    shareImageButton.addEventListener('click', function() {
      var activity = new MozActivity({
        name: 'share',
        data: {
          type: 'image/*',
          number: 1,
          blobs: [new Blob()],
          filenames: 'image.png',
          filepaths: 'image.png'
        }
      });

      activity.onerror = function() {
        console.warn('share activity error:', activity.error.name);
      };
    });

    var sendMessageButton = document.getElementById('send-message');

    sendMessageButton.addEventListener('click', function() {
      var activity = new MozActivity({
        name: 'new',
        data: {
          type: 'websms/sms',
          number: this.dataset.number,
          body: this.dataset.body
        }
      });

      activity.onerror = function() {
        console.warn('new activity error:', activity.error.name);
      };
    });
  });

  window.navigator.mozSetMessageHandler('activity', function(activity) {
    var pick = document.getElementById('pick-image');

    pick.addEventListener('click', function() {
      generateImageBlob(100, 100, 'image/jpeg').then(function(blob) {
        activity.postResult({
          type: blob.type,
          blob: blob
        });
      }).catch(function(e) {
        activity.postError(e);
      });
    });
  });
})(window);
