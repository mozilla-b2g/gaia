define(function(require, exports, module) {
'use strict';

var cropResizeRotate = require('cropResizeRotate');

/**
 * Create a thumbnail size canvas,
 * copy the <img> or <video> into it
 * cropping the edges as needed to
 * make it fit, and then extract the
 * thumbnail image as a blob and pass
 * it to the callback.
 *
 * @param  {Blob}     imageBlob     [description]
 * @param  {Object}   metadata      [description]
 * @param  {Object}   thumbnailSize [description]
 * @param  {Function} done          [description]
 */
module.exports = function(imageBlob, metadata, thumbnailSize, done) {
  cropResizeRotate(imageBlob, null, thumbnailSize, null, metadata,
    function(error, resizedBlob) {

      // If we couldn't resize or rotate it, use the original
      if (error) {
        console.error('Error while resizing image: ' + error);
        done(imageBlob);
        return;
      }

      done(resizedBlob);
    }
  );
};

});
