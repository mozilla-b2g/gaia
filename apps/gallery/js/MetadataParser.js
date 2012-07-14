'use strict';

// Given an image file, pass an object of metadata to the callback function
// or pass an error message to the errback function.
// The metadata object will look like this:
// {
//    width:     /* image width */,
//    height:    /* image height */,
//    thumbnail: /* a thumbnail image jpeg blob */,
//    date:      /* timestamp photo was taken or file was modified */
//    exif:      /* for jpeg images an object of additional EXIF data */
// }
//
var metadataParser = (function() {
  // If we generate our own thumbnails, aim for this size
  var THUMBNAIL_WIDTH = 160;
  var THUMBNAIL_HEIGHT = 160;

  function metadataParser(file, callback, errback) {
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
    if (!errback) {
      errback = function(e) {
        console.error('ImageMetadata ', String(e));
      };
    }

    if (!metadata.date)
      metadata.date = file.lastModifiedDate;

    var img = document.createElement('img');
    var url = URL.createObjectURL(file);
    img.src = url;

    img.onerror = function() {
      errback('Image failed to load');
    };

    img.onload = function() {
      URL.revokeObjectURL(url);
      if (!metadata.width)
        metadata.width = img.width;
      if (!metadata.height)
        metadata.height = img.height;

      // If we've already got a thumbnail, we're done
      if (metadata.thumbnail) {
        callback(metadata);
        return;
      }

      // Create a thumbnail image
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = THUMBNAIL_HEIGHT;
      var scalex = canvas.width / img.width;
      var scaley = canvas.height / img.height;

      // Take the larger of the two scales: we crop the image to the thumbnail
      var scale = Math.max(scalex, scaley);

      // If the image was already thumbnail size, it is its own thumbnail
      if (scale >= 1) {
        metadata.thumbnail = file;
        callback(metadata);
        return;
      }

      // Calculate the region of the image that will be copied to the
      // canvas to create the thumbnail
      var w = Math.round(THUMBNAIL_WIDTH / scale);
      var h = Math.round(THUMBNAIL_HEIGHT / scale);
      var x = Math.round((img.width - w) / 2);
      var y = Math.round((img.height - h) / 2);

      // Draw that region of the image into the canvas, scaling it down
      context.drawImage(img, x, y, w, h,
                        0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

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
    if (!errback) {
      errback = function(e) {
        console.error('JPEGMetadata', String(e));
      };
    }

    var reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onerror = function onerror() {
      errback(reader.error);
    };

    reader.onload = function onload() {
      try {
        var data = new DataView(reader.result);
        var metadata = parseMetadata(data);
      } catch (e) {
        errback(e);
        return;
      }

      if (metadata.exif &&
          (metadata.exif.DateTimeOriginal ||
           metadata.exif.DateTime)) {
        metadata.date =
          parseDate(metadata.exif.DateTimeOriginal ||
                    metadata.exif.DateTime);
      }
      else
        metadata.date = file.lastModifiedTime;

      callback(metadata);

      // Utility function for converting EXIF date strings
      // to ISO date strings to timestamps
      function parseDate(s) {
        if (!s)
          return null;
        // Replace the first two colons with dashes and
        // replace the first space with a T
        return Date.parse(s.replace(':', '-')
                          .replace(':', '-')
                          .replace(' ', 'T'));
      }
    };

    function parseMetadata(data) {
      var metadata = {};
      if (data.getUint8(0) !== 0xFF || data.getUint8(1) !== 0xD8) {
        errback('Not a JPEG file');
        return;
      }

      var offset = 2;

      // Loop through the segments of the JPEG file
      while (offset < data.byteLength) {
        if (data.getUint8(offset++) !== 0xFF) {
          errback('malformed JPEG file: missing 0xFF delimiter');
          return;
        }

        var segtype = data.getUint8(offset++);
        var segstart = offset;
        var seglen = data.getUint16(offset);

        // Basic image segment specifying image size and compression type
        if (segtype == 0xE0) {
          // APP0: probably JFIF metadata, which we ignore for now
        } else if (segtype == 0xE1) {
          // APP1
          if (data.getUint8(offset + 2) === 0x45 && // E
              data.getUint8(offset + 3) === 0x78 && // x
              data.getUint8(offset + 4) === 0x69 && // i
              data.getUint8(offset + 5) === 0x66 && // f
              data.getUint8(offset + 6) === 0) {    // NUL

            var dataView = new DataView(data.buffer,
                                        data.byteOffset + offset + 8,
                                        seglen - 8);
            metadata.exif = parseEXIFData(dataView);

            if (metadata.exif.THUMBNAIL && metadata.exif.THUMBNAILLENGTH) {
              var start = offset + 8 + metadata.exif.THUMBNAIL;
              var end = start + metadata.exif.THUMBNAILLENGTH;
              metadata.thumbnail = file.slice(start, end, 'image/jpeg');
              delete metadata.exif.THUMBNAIL;
              delete metadata.exif.THUMBNAILLENGTH;
            }
          }
        } else if (segtype >= 0xC0 && segtype <= 0xC3) {
          metadata.height = data.getUint16(offset + 3);
          metadata.width = data.getUint16(offset + 5);

          // Once we've gotten the images size we're done.
          // the APP0 and APP1 metadata will always come first.
          break;
        }

        // Regardless of segment type, skip to the next segment
        offset += seglen;
      }

      // Once we've exited the loop, we've gathered all the metadata
      return metadata;
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
        errback('invalid byteorder in EXIF segment');
        return;
      }

      if (data.getUint16(2, byteorder) !== 42) { // magic number
        errback('bad magic number in EXIF segment');
        return;
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
      // These are special tags that we handle internally
      '34665': 'EXIFIFD',         // Offset of EXIF data
      '34853': 'GPSIFD',          // Offset of GPS data
      '513': 'THUMBNAIL',         // Offset of thumbnail
      '514': 'THUMBNAILLENGTH'   // Length of thumbnail
    };

    function parseEntry(data, offset, byteorder, exif) {
      var tag = data.getUint16(offset, byteorder);
      var tagname = tagnames[tag];
      var type = data.getUint16(offset + 2, byteorder);
      var count = data.getUint32(offset + 4, byteorder);

      if (!tagname) // If we don't know about this tag type, skip it
        return;

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
