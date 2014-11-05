define(function(require, exports, module) {
'use strict';

var Storage = require('lib/storage');
var cropResizeRotate = require('cropResizeRotate');

/**
 * Exports
 */

module.exports = function(options, done) {
  var blob = options.blob;
  var outputSize = options.width && options.height ?
    {
      width: options.width,
      height: options.height
    } : options.size || null;

  cropResizeRotate(blob, null, outputSize, null, function(error, resizedBlob) {

    // If we couldn't resize or rotate it, use the original
    if (error) {
      console.error('Error while resizing image: ' + error);
      done(blob);
      return;
    }

    // We need to send a file-backed blob as the result of a pick activity
    // (see bug 975599) so we'll overwrite the old blob with the new one.
    // This means that the image stored will actually match the one passed
    // to the app that initiated the pick activity. We delete the old file,
    // then save the new blob with the same name. Then we read the file and
    // pass that to the callback.
    if (resizedBlob === blob) {
      done(blob);
      return;
    }

    var storage = new Storage();
    // We first delete the full resolution picture
    storage.deletePicture(blob.name, addPicture);
    // We save the scaled down image
    function addPicture(error) {
      if (error) {
        done(blob);
        return;
      }
      storage.addPicture(resizedBlob, {
        filepath: blob.name
      }, onSavedPicture);
    }

    function onSavedPicture(error, filepath, absolutePath, fileBlob) {
      done(fileBlob);
    }

  });
};

});
