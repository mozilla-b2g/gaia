/* global MozActivity */
(function(window) {
  'use strict';

  function loadImageData(id, blob) {
    var imageUrl = window.URL.createObjectURL(blob);
    var img = document.querySelector(id + ' > img');
    img.src =  imageUrl;

   document.querySelector(id + ' > span.name').innerHTML = blob.name;
   document.querySelector(id + ' > span.type').innerHTML = blob.type;
  }

  window.addEventListener('load', function() {
    var pickImageButton = document.getElementById('pick-image');

    pickImageButton.addEventListener('click', function() {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/*',
        }
      });
      activity.onsuccess = function() {
        // Populate test app elements with returned activity data
        loadImageData('#pick-activity-data', activity.result.blob);
      };
      activity.onerror = function() {
        console.warn('pick activity error:', activity.error.name);
      };
    });

  });

  window.navigator.mozSetMessageHandler('activity', function(activity) {
    // Populate test app elements with shared activity data
    loadImageData('#share-activity-data', activity.source.data.blobs[0]);
  });

})(window);
