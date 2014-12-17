'use strict';
/*jshint maxlen:false*/
/*exported MockCropResizeRotate*/

var MockCropResizeRotate =
  function(blob, cropRegion, outputSize, outputType, metadata, callback) {
    // The 2nd, 3rd, 4th and 5th arguments are optional, so fix things up if we're
    // called with fewer than 6 args. The last argument is always the callback.
    switch (arguments.length) {
    case 2:
      callback = cropRegion;
      cropRegion = outputSize = outputType = metadata = null;
      break;

    case 3:
      callback = outputSize;
      outputSize = outputType = metadata = null;
      break;

    case 4:
      callback = outputType;
      outputType = metadata = null;
      break;

    case 5:
      callback = metadata;
      metadata = null;
      break;

    case 6:
      // everything fine. do nothing here
      break;

    default:
      throw new Error('wrong number of arguments: ' + arguments.length);
    }

    if (typeof callback === 'function') {
      callback(null, blob);
    }
  };
