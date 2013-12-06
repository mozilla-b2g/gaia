'use strict';

//
// This file defines a single function that asynchronously reads a
// JPEG file (or blob) to determine its width and height and find the
// location and size of the embedded preview image, if it has one. If
// it succeeds, it passes an object containing this data to the
// specified callback function. If it fails, it passes an error message
// to the specified error function instead.
//
// This function is capable of parsing and returning EXIF data for a
// JPEG file, but for speed, it ignores all EXIF data except the embedded
// preview image and the image orientation.
//
// This function requires the BlobView utility class
//
function parseJPEGMetadata(file, metadataCallback, metadataError) {

  var parseExifMetaData = function(exifMetaData,
                          thumbnailMetaData, thumnailBlob) {
    exifMetaData = exifMetaData || {};
    if (thumbnailMetaData) {
      exifMetaData.preview = {
        start: thumbnailMetaData.JPEGInterchangeFormat,
        end: thumbnailMetaData.JPEGInterchangeFormat +
             thumbnailMetaData.JPEGInterchangeFormatLength
      };
    }

    // map exif orientation flags for easy transforms
    switch (exifMetaData.Orientation) {
      case undefined:
      case 1:
        exifMetaData.rotation = 0;
        exifMetaData.mirrored = false;
        break;
      case 2:
        exifMetaData.rotation = 0;
        exifMetaData.mirrored = true;
        break;
      case 3:
        exifMetaData.rotation = 180;
        exifMetaData.mirrored = false;
        break;
      case 4:
        exifMetaData.rotation = 180;
        exifMetaData.mirrored = true;
        break;
      case 5:
        exifMetaData.rotation = 90;
        exifMetaData.mirrored = true;
        break;
      case 6:
        exifMetaData.rotation = 90;
        exifMetaData.mirrored = false;
        break;
      case 7:
        exifMetaData.rotation = 270;
        exifMetaData.mirrored = true;
        break;
      case 8:
        exifMetaData.rotation = 270;
        exifMetaData.mirrored = false;
        break;
      default:
        throw Error('Unknown Exif code for orientation');
    }
    metadataCallback(exifMetaData);
  };

  JPEG.readExifMetaData(file,
    function(error, exifMetaData, thumbnailMetaData, thumnailBlob) {
      if (error) {
        metadataError(error);
      } else {
        parseExifMetaData(exifMetaData, thumbnailMetaData, thumnailBlob);
      }
  });

}
