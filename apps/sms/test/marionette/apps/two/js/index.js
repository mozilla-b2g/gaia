/* global MozActivity */
(function() {
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

  var shareImageButton = document.getElementById('share-image');

  shareImageButton.addEventListener('click', function() {
    console.log('[Test] Share button clicked %s', new Date());

    generateImageBlob(100, 100, 'image/jpeg').then(function(blob) {
      console.log('[Test] Image generated and activity request created %s', new Date());
      return new MozActivity({
        name: 'share',
        data: {
          type: 'image/*',
          number: 1,
          blobs: [blob],
          filenames: 'image.jpg',
          filepaths: 'image.jpg'
        }
      });
    }).then(() => {
      console.log('[Test] Activity request succeeded %s', new Date());
    }, (e) => {
      console.log('[Test] Activity request failed %s %s', new Date(), e.message || e.name);
      console.warn('share activity error:', e.message || e.name);
    });
  });
})(window);
