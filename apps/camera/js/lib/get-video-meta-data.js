define(function(require, exports, module) {
'use strict';

/**
 * Module Dependencies
 */

var getVideoRotation = require('getVideoRotation');

/**
 * Given the filename of a newly
 * recorded video, create a poster
 * image for it, and save that
 * poster as a jpeg file.
 *
 * When done, pass the video blob
 * and the poster blob to the
 * done function along with the
 * video dimensions and rotation.
 *
 * @param  {Blob}   blob
 * @param  {String}   filename
 * @param  {Function} done
 */
module.exports = createVideoPosterImage;


function createVideoPosterImage(blob, done) {
  var URL = window.URL;

  getVideoRotation(blob, onGotVideoRotation);

  function onGotVideoRotation(rotation) {
    if (typeof rotation !== 'number') {
      console.warn('Unexpected rotation:', rotation);
      rotation = 0;
    }

    var offscreenVideo = document.createElement('video');
    var url = URL.createObjectURL(blob);

    offscreenVideo.preload = 'metadata';
    offscreenVideo.src = url;
    offscreenVideo.onerror = onError;
    offscreenVideo.onloadeddata = onLoadedData;

    function onLoadedData() {
      var videowidth = offscreenVideo.videoWidth;
      var videoheight = offscreenVideo.videoHeight;

      // First, create a full-size
      // unrotated poster image
      var postercanvas = document.createElement('canvas');
      postercanvas.width = videowidth;
      postercanvas.height = videoheight;
      // Create the context after setting canvas dimensions so we don't realloc.
      // Use the willReadFrequently hint to use a software canvas off the gpu.
      var postercontext = postercanvas.getContext('2d', {
        willReadFrequently: true
      });

      postercontext.drawImage(offscreenVideo, 0, 0);

      // We're done with the
      // offscreen video element now
      URL.revokeObjectURL(url);
      offscreenVideo.removeAttribute('src');
      offscreenVideo.load();

      postercanvas.toBlob(function(imageBlob) {
        // Now that we've encoded the canvas image, we can free the
        // canvas memory by setting its size to 0.
        // This prevents a memory leak. See bug 1070195.
        postercanvas.width = 0;

        // It is probably unnecessary to clear these, doing it now might
        // cause them to be garbage collected sooner than otherwise.
        postercanvas = postercontext = null;

        done(null, {
          width: videowidth,
          height: videoheight,
          rotation: rotation,
          poster: {
            blob: imageBlob
          }
        });
      }, 'image/jpeg');
    }

    function onError() {
      URL.revokeObjectURL(url);
      offscreenVideo.removeAttribute('src');
      offscreenVideo.load();
      console.warn('not a video file delete it!');
      done('error');
    }
  }
}

});
