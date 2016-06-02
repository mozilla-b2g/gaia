/* global MozActivity */
(function(window) {
  'use strict';

  var image_blob;

  function generateBlob(width, height, type) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    context.fillStyle = 'orange';
    context.fillRect (0, 0, width, height);

    return new Promise(function(resolve) {
      canvas.toBlob(function(blob) {
        canvas.width = canvas.height = 0;
        canvas = null;

        resolve(blob);
      }, type);
    });
  }

  function loadImageData(id, blob) {
    var imageUrl = window.URL.createObjectURL(blob);
    var img = document.querySelector(id + ' > img');
    img.src =  imageUrl;

    document.querySelector(id + ' > span.name').innerHTML = blob.name;
    document.querySelector(id + ' > span.type').innerHTML = blob.type;
    document.querySelector(id + ' > span.size').innerHTML = blob.size;
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
        image_blob = activity.result.blob;
        // Populate test app elements with returned activity data
        loadImageData('#pick-activity-data', activity.result.blob);
      };
      activity.onerror = function() {
        console.warn('pick activity error:', activity.error.name);
      };
    });

    var pickedImage = document.getElementById('picked-image');

    // Add click event handler to received image to
    // trigger gallery app open activity
    pickedImage.addEventListener('click', function() {
      var activity = new MozActivity({
        name: 'open',
        data: {
          type: 'image/png',
          filename: 'pictures/firefoxOS.png',
          blob: image_blob,
          allowSave: true
        }
      });
      activity.onerror = function() {
        console.warn('open activity error:', activity.error.name);
      };
    });


    var openImageButton = document.getElementById('open-image');

    // Add click event handler to open image button to generate memory
    // backed blob and open it using gallery app open activity
    openImageButton.addEventListener('click', function() {
      generateBlob(100, 100, 'image/jpeg').then(function(blob) {
        var activity = new MozActivity({
          name: 'open',
          data: {
            type: blob.type,
            blob: blob
          }
        });
        activity.onerror = function() {
          console.warn('open activity error while opening memory backed blob:',
                       activity.error.name);
        };
      });
    });

  });

  window.navigator.mozSetMessageHandler('activity', function(activity) {
    // Populate test app elements with shared activity data
    loadImageData('#share-activity-data', activity.source.data.blobs[0]);
  });

})(window);
