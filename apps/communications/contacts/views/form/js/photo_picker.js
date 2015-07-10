/* global MozActivity */
(function(exports) {

  'use strict';

	// The size we want our contact photos to be
  const PHOTO_WIDTH = 320;
  const PHOTO_HEIGHT = 320;
  // bug 1038414: ask for an image about 2MP before
  // doing the crop to save memory in both apps
  const MAX_PHOTO_SIZE = 200000;

	function pickImage(callback) {
		callback = callback || function foo() {};

    var activity = new MozActivity({
      name: 'pick',
      data: {
        type: 'image/jpeg',
        maxFileSizeBytes: MAX_PHOTO_SIZE
      }
    });

    activity.onsuccess = function() {

    	// XXX
      // this.result.blob is valid now, but it won't stay valid
      // (see https://bugzilla.mozilla.org/show_bug.cgi?id=806503)
      // And it might not be the size we want, anyway, so we make
      // our own copy that is at the right size.
      resizeBlob(
        this.result.blob,
        PHOTO_WIDTH,
        PHOTO_HEIGHT,
        callback
      );

    };

    activity.onerror = function() {
      window.console.error('Error in the activity', activity.error);
    };
  }

  function resizeBlob(blob, target_width, target_height, callback) {
    var img = document.createElement('img');
    var url = URL.createObjectURL(blob);
    img.src = url;

    function cleanupImg() {
      img.src = '';
      URL.revokeObjectURL(url);
    }

    img.onerror = cleanupImg;

    img.onload = function() {
      var image_width = img.width;
      var image_height = img.height;
      var scalex = image_width / target_width;
      var scaley = image_height / target_height;
      var scale = Math.min(scalex, scaley);

      var w = target_width * scale;
      var h = target_height * scale;
      var x = (image_width - w) / 2;
      var y = (image_height - h) / 2;

      var canvas = document.createElement('canvas');
      canvas.width = target_width;
      canvas.height = target_height;
      var context = canvas.getContext('2d', { willReadFrequently: true });

      context.drawImage(img, x, y, w, h, 0, 0, target_width, target_height);
      cleanupImg();
      canvas.toBlob(function(resized) {
        context = null;
        canvas.width = canvas.height = 0;
        canvas = null;
        callback(resized);
      } , 'image/jpeg');
    };
  }

	exports.PhotoPicker = {
		pick: pickImage
	};

}(window));