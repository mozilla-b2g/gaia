/* global MozActivity */
(function(window) {
  'use strict';

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
  });
})(window);
