'use strict';

// Given an image file, pass an object of metadata to the callback function
// or pass an error message to the errback function.
// The metadata object will look like this:
// {
//    width:     /* image width */,
//    height:    /* image height */,
//    thumbnail: /* a thumbnail image jpeg blob */,
//    exif:      /* for jpeg images an object of additional EXIF data */
// }
//
var metadataParser = (function() {
  // If we generate our own thumbnails, aim for this size
  var THUMBNAIL_WIDTH = 120;
  var THUMBNAIL_HEIGHT = 120;
  // To save memory (because of gecko bugs) we want to create only one
  // offscreen image and reuse it.
  var offscreenImage = new Image();

  // Parsing metadata is memory-intensive.  Make sure we only do
  // one at a time
  var queue = [];     // Store
  var busy = false;

  // This is the main entry point function that we return below
  function metadataParser(file, callback, errback) {
    queue.push({file: file, callback: callback, errback: errback});
    if (!busy)
      processQueue();
  }

  // If we're not currently running, get the first entry in the queue
  // and parse metadata for it
  function processQueue() {
    if (queue.length === 0) {
      busy = false;
      return;
    }

    busy = true;
    var entry = queue.shift();  // get first element off queue
    try {
      parseMetadata(entry.file,
                    function(m) {
                      entry.callback(m);
                      processQueue();
                    },
                    function(s) {
                      if (entry.errback)
                        entry.errback(s);
                      processQueue();
                    });
    }
    catch (e) {
      // Don't allow unhandled exceptions to mess up our queue handling
      entry.errback(e.toString());
      processQueue();
    }
  }

  function parseMetadata(file, callback, errback) {
    if (file.type === 'image/jpeg') {
      // For jpeg images, we can read metadata right out of the file
      parseJPEGMetadata(file, function(data) {
        // If we got dimensions and thumbnail, we're done
        // Otherwise, keep going to get more metadata
        if (data.width && data.height && data.thumbnail)
          callback(data);
        else
          parseImageMetadata(file, data, callback, errback);
      }, function(errmsg) {
        // If something went wrong, fallback on the
        // basic image parser
        console.error(errmsg);
        parseImageMetadata(file, {}, callback, errback);
      });
    }
    else {
      // For all other image types, we get dimensions and thumbnails this way
      parseImageMetadata(file, {}, callback, errback);
    }
  }

  // Load an image from a file into an <img> tag, and then use that
  // to get its dimensions and create a thumbnail.  Store these values in
  // the metadata object if they are not already there, and then pass
  // the complete metadata object to the callback function
  function parseImageMetadata(file, metadata, callback, errback) {
    console.log('fallback parsing metadata for', file.name);
    if (!errback) {
      errback = function(e) {
        console.error('ImageMetadata ', String(e));
      };
    }

    var url = URL.createObjectURL(file);
    offscreenImage.src = url;

    offscreenImage.onerror = function() {
      // XXX When launched as an inline activity this gets into a failure
      // loop where this function is called over and over. Unsetting
      // onerror here works around it. I don't know why the error is
      // happening in the first place..
      offscreenImage.onerror = null;
      URL.revokeObjectURL(url);
      offscreenImage.src = null;
      errback('Image failed to load');
    };

    offscreenImage.onload = function() {
      URL.revokeObjectURL(url);
      metadata.width = offscreenImage.width;
      metadata.height = offscreenImage.height;

      // If we've already got a thumbnail, we're done
      if (metadata.thumbnail) {
        offscreenImage.src = null;
        callback(metadata);
        return;
      }

      // Create a thumbnail image
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = THUMBNAIL_HEIGHT;
      var scalex = canvas.width / offscreenImage.width;
      var scaley = canvas.height / offscreenImage.height;

      // Take the larger of the two scales: we crop the image to the thumbnail
      var scale = Math.max(scalex, scaley);

      // If the image was already thumbnail size, it is its own thumbnail
      if (scale >= 1) {
        offscreenImage.src = null;
        //
        // XXX
        // Because of a gecko bug, we can't just store the image file itself
        // we've got to create an equivalent but distinct blob.
        // When https://bugzilla.mozilla.org/show_bug.cgi?id=794619 is fixed
        // the line below can change to just assign file.
        //
        metadata.thumbnail = file.slice(0, file.size, file.type);
        callback(metadata);
        return;
      }

      // Calculate the region of the image that will be copied to the
      // canvas to create the thumbnail
      var w = Math.round(THUMBNAIL_WIDTH / scale);
      var h = Math.round(THUMBNAIL_HEIGHT / scale);
      var x = Math.round((offscreenImage.width - w) / 2);
      var y = Math.round((offscreenImage.height - h) / 2);

      // Draw that region of the image into the canvas, scaling it down
      context.drawImage(offscreenImage, x, y, w, h,
                        0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

      // We're done with the image now
      offscreenImage.src = null;

      // Now extract the thumbnail from the canvas as a jpeg file
      metadata.thumbnail = canvas.mozGetAsFile(file.name + '.thumbnail.jpeg',
                                               'image/jpeg');
      callback(metadata);
    };
  }


  // Asynchronously read a JPEG Blob (or File), extract its metadata,
  // and pass an object containing selected portions of that metadata
  // to the specified callback function.
  function parseJPEGMetadata(file, callback, errback) {
    console.log('parsing jpeg metadata for', file.name);

    var currentSegmentOffset = 0;
    var currentSegmentLength = 0;
    var nextSegmentOffset = 0; // First JPEG segment is SOI
    var nextSegmentLength = 2; // First segment is just 2 bytes

    var metadata = {};

    // Read the next JPEG segment from the file and pass it as a DataView
    // object to the specified callback. Return false there is no next
    // segment to read.
    function getNextSegment(nextSegmentCallback) {
      if (nextSegmentOffset === -1) // No more segments to read
        return false;

      var hasNextSegment = (nextSegmentOffset + nextSegmentLength < file.size);

      // If there is another segment after the one we're reading, read
      // its header so we know how big it will be.
      var extraBytes = hasNextSegment ? 4 : 0;
      var slice = file.slice(nextSegmentOffset,
                             nextSegmentOffset + nextSegmentLength + extraBytes,
                             file.type);

      var reader = new FileReader();
      reader.readAsArrayBuffer(slice);
      reader.onerror = function() {
        errback(reader.error);
        nextSegmentOffset = -1;
      };
      reader.onload = function() {
        try {
          currentSegmentOffset = nextSegmentOffset;
          currentSegmentLength = nextSegmentLength;
          if (hasNextSegment) {
            nextSegmentOffset = currentSegmentOffset + currentSegmentLength;
            var next = new DataView(reader.result,
                                    currentSegmentLength, extraBytes);
            if (next.getUint8(0) !== 0xFF)
              throw Error('Malformed JPEG file: bad delimiter in next');
            // Add 2 for the delimiter + type bytes
            nextSegmentLength = next.getUint16(2) + 2;
          }
          else {
            nextSegmentOffset = -1;
          }

          var data = new DataView(reader.result, 0, currentSegmentLength);
          var delimiter = data.getUint8(0);
          var segtype = data.getUint8(1);

          if (delimiter !== 0xFF)
            throw Error('Malformed JPEG file: bad delimiter in this segment');
          nextSegmentCallback(segtype, data);
        } catch (e) {
          errback(e.toString());
        }
      };

      return true;
    }

    // This first call to getNextSegment reads the JPEG header
    getNextSegment(function(type, data) {
      if (type !== 0xD8) {
        // Wrong magic number
        errback('Not a JPEG file');
        return;
      }

      // Now start reading the segments that follow
      getNextSegment(segmentHandler);
    });

    // This is a callback function for getNextSegment that handles the
    // various types of segments we expect to see in a jpeg file
    function segmentHandler(type, data) {
      switch (type) {
      case 0xC0:  // Some actual image data, including image dimensions
      case 0xC1:
      case 0xC2:
      case 0xC3:
        // Get image dimensions
        metadata.height = data.getUint16(5);
        metadata.width = data.getUint16(7);

        // We're done. All the EXIF data will come before this segment
        // So call the callback
        callback(metadata);
        break;

      case 0xE1:  // APP1 segment. Probably holds EXIF metadata
        try {
          parseAPP1(data, metadata);
        }
        catch (e) {
          errback(e.toString());
          return;
        }
        // Intentional fallthrough here to read the next segment

      default:
        // A segment we don't care about, so just go on and read the next one
        if (!getNextSegment(segmentHandler))
          errback('unexpected end of JPEG file');
      }
    }

    function parseAPP1(data, metadata) {
      if (data.getUint8(4) === 0x45 && // E
          data.getUint8(5) === 0x78 && // x
          data.getUint8(6) === 0x69 && // i
          data.getUint8(7) === 0x66 && // f
          data.getUint8(8) === 0) {    // NUL

        var dataView = new DataView(data.buffer,
                                    data.byteOffset + 10,
                                    data.byteLength - 10);
        metadata.exif = parseEXIFData(dataView);

        if (metadata.exif.THUMBNAIL && metadata.exif.THUMBNAILLENGTH) {
          var start = currentSegmentOffset + 10 + metadata.exif.THUMBNAIL;
          var end = start + metadata.exif.THUMBNAILLENGTH;
          metadata.thumbnail = file.slice(start, end, 'image/jpeg');
          console.log('Found thumbnail in metadata for', file.name,
                      metadata.thumbnail.size);
          delete metadata.exif.THUMBNAIL;
          delete metadata.exif.THUMBNAILLENGTH;
        }
      }
    }

    // Parse an EXIF segment from a JPEG file and return an object
    // of metadata attributes. The argument must be a DataView object
    function parseEXIFData(data) {
      var exif = {};

      var byteorder = data.getUint8(0);
      if (byteorder === 0x4D) {  // big endian
        byteorder = false;
      } else if (byteorder === 0x49) {  // little endian
        byteorder = true;
      } else {
        throw Error('invalid byteorder in EXIF segment');
      }

      if (data.getUint16(2, byteorder) !== 42) { // magic number
        throw Error('bad magic number in EXIF segment');
      }

      var offset = data.getUint32(4, byteorder);

      parseIFD(data, offset, byteorder, exif);

      if (exif.EXIFIFD) {
        parseIFD(data, exif.EXIFIFD, byteorder, exif);
        delete exif.EXIFIFD;
      }

      if (exif.GPSIFD) {
        parseIFD(data, exif.GPSIFD, byteorder, exif);
        delete exif.GPSIFD;
      }

      return exif;
    }

    function parseIFD(data, offset, byteorder, exif) {
      var numentries = data.getUint16(offset, byteorder);
      for (var i = 0; i < numentries; i++) {
        parseEntry(data, offset + 2 + 12 * i, byteorder, exif);
      }

      var next = data.getUint32(offset + 2 + 12 * numentries, byteorder);
      if (next !== 0)
        parseIFD(data, next, byteorder, exif);
    }

    // size, in bytes, of each TIFF data type
    var typesize = [
      0,   // Unused
      1,   // BYTE
      1,   // ASCII
      2,   // SHORT
      4,   // LONG
      8,   // RATIONAL
      1,   // SBYTE
      1,   // UNDEFINED
      2,   // SSHORT
      4,   // SLONG
      8,   // SRATIONAL
      4,   // FLOAT
      8    // DOUBLE
    ];

    // This object maps EXIF tag numbers to their names.
    // Only list the ones we want to bother parsing and returning.
    // All others will be ignored.
    var tagnames = {
      /*
       * We don't currently use any of these EXIF tags for anything.
       *
       *
      '256': 'ImageWidth',
      '257': 'ImageHeight',
      '40962': 'PixelXDimension',
      '40963': 'PixelYDimension',
      '306': 'DateTime',
      '315': 'Artist',
      '33432': 'Copyright',
      '36867': 'DateTimeOriginal',
      '33434': 'ExposureTime',
      '33437': 'FNumber',
      '34850': 'ExposureProgram',
      '34867': 'ISOSpeed',
      '37377': 'ShutterSpeedValue',
      '37378': 'ApertureValue',
      '37379': 'BrightnessValue',
      '37380': 'ExposureBiasValue',
      '37382': 'SubjectDistance',
      '37383': 'MeteringMode',
      '37384': 'LightSource',
      '37385': 'Flash',
      '37386': 'FocalLength',
      '41986': 'ExposureMode',
      '41987': 'WhiteBalance',
      '41991': 'GainControl',
      '41992': 'Contrast',
      '41993': 'Saturation',
      '41994': 'Sharpness',
      */
      // These are special tags that we handle internally
      '34665': 'EXIFIFD',         // Offset of EXIF data
      // '34853': 'GPSIFD',          // Offset of GPS data
      '513': 'THUMBNAIL',         // Offset of thumbnail
      '514': 'THUMBNAILLENGTH'   // Length of thumbnail
    };

    function parseEntry(data, offset, byteorder, exif) {
      var tag = data.getUint16(offset, byteorder);
      var tagname = tagnames[tag];

      if (!tagname) // If we don't know about this tag type, skip it
        return;

      var type = data.getUint16(offset + 2, byteorder);
      var count = data.getUint32(offset + 4, byteorder);

      var total = count * typesize[type];
      var valueOffset = total <= 4 ? offset + 8 :
        data.getUint32(offset + 8, byteorder);
      exif[tagname] = parseValue(data, valueOffset, type, count, byteorder);
    }

    function parseValue(data, offset, type, count, byteorder) {
      if (type === 2) { // ASCII string
        var codes = [];
        for (var i = 0; i < count - 1; i++) {
          codes[i] = data.getUint8(offset + i);
        }
        return String.fromCharCode.apply(String, codes);
      } else {
        if (count == 1) {
          return parseOneValue(data, offset, type, byteorder);
        } else {
          var values = [];
          var size = typesize[type];
          for (var i = 0; i < count; i++) {
            values[i] = parseOneValue(data, offset + size * i, type, byteorder);
          }
          return values;
        }
      }
    }

    function parseOneValue(data, offset, type, byteorder) {
      switch (type) {
      case 1: // BYTE
      case 7: // UNDEFINED
        return data.getUint8(offset);
      case 2: // ASCII
        // This case is handed in parseValue
        return null;
      case 3: // SHORT
        return data.getUint16(offset, byteorder);
      case 4: // LONG
        return data.getUint32(offset, byteorder);
      case 5: // RATIONAL
        return data.getUint32(offset, byteorder) /
          data.getUint32(offset + 4, byteorder);
      case 6: // SBYTE
        return data.getInt8(offset);
      case 8: // SSHORT
        return data.getInt16(offset, byteorder);
      case 9: // SLONG
        return data.getInt32(offset, byteorder);
      case 10: // SRATIONAL
        return data.getInt32(offset, byteorder) /
          data.getInt32(offset + 4, byteorder);
      case 11: // FLOAT
        return data.getFloat32(offset, byteorder);
      case 12: // DOUBLE
        return data.getFloat64(offset, byteorder);
      }
      return null;
    }
  }

  return metadataParser;
}());
