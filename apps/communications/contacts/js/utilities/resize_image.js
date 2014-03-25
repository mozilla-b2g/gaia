/* exported resizeImage */
'use strict';

// Transform a give image blob to a new image blob with a new size.  Parameters
// are passed in using an options hash.  Valid options are:
//
//  blob:      the source image blob to resize (required)
//  mimeType:  the type of image to produce (default 'image/png')
//  transform: function callback that takes these arguments:
//    origWidth:  width of source image blob
//    origHeight: height of source image blob
//    draw:       function to call to perform resize; args are similar
//                to canvas.drawImage().  Takes sourceX, sourceY, sourceWidth,
//                sourceHeight, targetWidth, and targetHeight.  The target
//                x and y are always set to zero.
//    cancel:     function to call to cancel resize, no args
//  success:   function that will be called after the blob is created; new
//             blob is passed as an argument
//  error:     function that will be called if an error occurs
//
// For example:
//
//  resizeImage({
//    blob: sourceBlob,
//    mimeType: 'image/jpeg',
//    transform: function(origWidth, origHeight, draw, cancel) {
//      if (origWidth < 10 && origHeight < 10) {
//        console.log('don't need to resize!');
//        cancel();
//        return;
//      }
//      var newWidth = origWidth / 2;
//      var newHeight = origHeight / 2;
//      draw(0, 0, origWidth, origHeight, newWidth, newHeight);
//    },
//    success: function(resizedBlob) { console.log('got my new blob!'); }
//    error: function() { console.log('resize failed!'); }
//  });
function resizeImage(options) {
  options = options || {};
  var blob = options.blob;
  var transform = options.transform;
  var mimeType = options.mimeType || 'image/png';
  var success = options.success;
  var error = options.error || function() {};

  if (!success || !error) {
    throw new Error('Must provide at least one of success or error functions');
  }

  if (!blob) {
    throw new Error('Must provide source blob');
  }

  if (typeof transform !== 'function') {
    throw new Error('Must provide transform function');
  }

  var img = document.createElement('img');
  var url = URL.createObjectURL(blob);
  img.src = url;

  img.onerror = function onError() {
    cleanupImg();
    error();
  };

  img.onload = function() {
    transform(img.width, img.height, draw, cleanupImg);
  };

  function draw(sX, sY, sWidth, sHeight, dWidth, dHeight) {
    var canvas = document.createElement('canvas');
    canvas.width = dWidth;
    canvas.height = dHeight;
    var context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, dWidth, dHeight);
    cleanupImg();
    canvas.toBlob(function onCanvasToBlob(canvasBlob) {
      context = null;
      canvas.width = canvas.height = 0;
      canvas = null;
      success(canvasBlob);
    }, mimeType);
  }

  function cleanupImg() {
    img.src = '';
    URL.revokeObjectURL(url);
  }
}
