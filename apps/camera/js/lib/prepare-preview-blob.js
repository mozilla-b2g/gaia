define(function(require, exports, module) {
'use strict';

/**
 * Module Dependencies
 */

var parseJpegMetadata = require('jpegMetaDataParser');

/**
 * Exports
 */

module.exports = function(blob, done) {
  parseJpegMetadata(blob, onJpegParsed);

  function onJpegParsed(metadata) {
    metadata.blob = blob;

    if (!metadata.preview) {
      done(metadata);
      return;
    }

    // If we found an EXIF preview,
    // and can determine its size, then
    // we can display it instead of the
    // big image and save memory and time.
    var start = metadata.preview.start;
    var end = metadata.preview.end;
    var previewBlob = blob.slice(start, end, 'image/jpeg');
    parseJpegMetadata(previewBlob, onSuccess, onError);

    // If we parsed the preview image, add its
    // dimensions to the metdata.preview
    // object, and then let the MediaFrame
    // object display the preview instead of
    // the full-size image.
    function onSuccess(previewmetadata) {
       metadata.preview.width = previewmetadata.width;
       metadata.preview.height = previewmetadata.height;
       done(metadata);
     }

    // If we couldn't parse the preview image,
    // just display full-size.
    function onError() {
      done(metadata);
    }
  }
};

});
