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

  function generateVcardBlob() {
    return new Promise(function(resolve) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/data/vcard_4.vcf');
      xhr.overrideMimeType('text/vcard');
      xhr.responseType = 'blob';

      xhr.onload = function() {
        resolve(xhr.response);
      };

      xhr.send();
    });
  }

  window.addEventListener('load', function() {
    var shareImageButton = document.getElementById('share-image');

    shareImageButton.addEventListener('click', function() {
      generateImageBlob(100, 100, 'image/jpeg').then(function(blob) {
        var activity = new MozActivity({
          name: 'share',
          data: {
            type: 'image/*',
            number: 1,
            blobs: [blob],
            filenames: 'image.jpg',
            filepaths: 'image.jpg'
          }
        });

        activity.onerror = function() {
          console.warn('share activity error:', activity.error.name);
        };
      });
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

    var pickContactButton = document.getElementById('pick-contact');
    pickContactButton.addEventListener('click', function() {
      generateVcardBlob().then(function(blob) {
        activity.postResult({
          name: 'test_file.vcf',
          blob: blob
        });
      });
    });

  });
})(window);
