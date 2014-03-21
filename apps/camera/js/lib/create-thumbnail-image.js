define(function(require, exports, module) {
'use strict';

/**
 * Exports
 */


//
/**
 * Create a thumbnail size canvas,
 * copy the <img> or <video> into it
 * cropping the edges as needed to
 * make it fit, and then extract the
 * thumbnail image as a blob and pass
 * it to the callback.
 *
 * @param  {[type]}   imageBlob [description]
 * @param  {[type]}   thumbnailWidth     [description]
 * @param  {[type]}   thumbnailHeight     [description]
 * @param  {[type]}   video     [description]
 * @param  {[type]}   rotation  [description]
 * @param  {[type]}   mirrored  [description]
 * @param  {Function} callback  [description]
 * @return {[type]}             [description]
 */
module.exports = function(imageBlob, thumbnailWidth, thumbnailHeight,
                          video, rotation, mirrored, callback) {
  var offscreenImage = new Image();

  offscreenImage.src = window.URL.createObjectURL(imageBlob);
  offscreenImage.onload = function() {
    // Create a thumbnail image
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d', { willReadFrequently: true});
    canvas.width = thumbnailWidth;
    canvas.height = thumbnailHeight;
    var imgWidth = offscreenImage.width;
    var imgHeight = offscreenImage.height;
    var scalex = canvas.width / imgWidth;
    var scaley = canvas.height / imgHeight;

    // Take the larger of the two scales: we crop the image to the thumbnail
    var scale = Math.max(scalex, scaley);

    // Calculate the region of the image that will be copied to the
    // canvas to create the thumbnail
    var w = Math.round(thumbnailWidth / scale);
    var h = Math.round(thumbnailHeight / scale);
    var x = Math.round((imgWidth - w) / 2);
    var y = Math.round((imgHeight - h) / 2);

    var centerX = Math.floor(thumbnailWidth / 2);
    var centerY = Math.floor(thumbnailHeight / 2);

    // If a orientation is specified, rotate/mirroring the canvas context.
    if (rotation || mirrored) {
      context.save();
      // All transformation are applied to the center of the thumbnail.
      context.translate(centerX, centerY);
    }

    if (mirrored) {
      context.scale(-1, 1);
    }
    if (rotation) {
      switch (rotation) {
      case 90:
        context.rotate(Math.PI / 2);
        break;
      case 180:
        context.rotate(Math.PI);
        break;
      case 270:
        context.rotate(-Math.PI / 2);
        break;
      }
    }

    if (rotation || mirrored) {
      context.translate(-centerX, -centerY);
    }

    // Draw that region of the image into the canvas, scaling it down
    context.drawImage(offscreenImage, x, y, w, h,
                      0, 0, thumbnailWidth, thumbnailHeight);

    // Restore the default rotation so the play arrow comes out correctly
    if (rotation || mirrored) {
      context.restore();
    }

    // We're done with the offscreen image now
    window.URL.revokeObjectURL(offscreenImage.src);
    offscreenImage.onload = null;
    offscreenImage.src = '';

    canvas.toBlob(callback, 'image/jpeg');
  };
};

});