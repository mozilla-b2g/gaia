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
  // This is the object we'll pass to metadataCallback
  var metadata = {};

  // Start off reading a 16kb slice of the JPEG file.
  // Hopefully, this will be all we need and everything else will
  // be synchronous
  BlobView.get(file, 0, Math.min(16 * 1024, file.size), function(data) {
    if (data.byteLength < 2 ||
        data.getUint8(0) !== 0xFF ||
        data.getUint8(1) !== 0xD8) {
      metadataError('Not a JPEG file');
      return;
    }

    // Now start reading JPEG segments
    // getSegment() and segmentHandler() are defined below.
    getSegment(data, 2, segmentHandler);
  });

  // Read the JPEG segment at the specified offset and
  // pass it to the callback function.
  // Offset is relative to the current data offsets.
  // We assume that data has enough data in it that we can
  // can determine the size of the segment, and we guarantee that
  // we read extra bytes so the next call works
  function getSegment(data, offset, callback) {
    try {
      var header = data.getUint8(offset);
      if (header !== 0xFF) {
        metadataError('Malformed JPEG file: bad segment header');
        return;
      }

      var type = data.getUint8(offset + 1);
      var size = data.getUint16(offset + 2) + 2;

      // the absolute position of the segment
      var start = data.sliceOffset + data.viewOffset + offset;
      // If this isn't the last segment in the file, add 4 bytes
      // so we can read the size of the next segment
      var isLast = (start + size >= file.size);
      var length = isLast ? size : size + 4;

      data.getMore(start, length,
                   function(data) {
                     callback(type, size, data, isLast);
                   });
    }
    catch (e) {
      metadataError(e.toString() + '\n' + e.stack);
    }
  }

  // This is a callback function for getNextSegment that handles the
  // various types of segments we expect to see in a jpeg file
  function segmentHandler(type, size, data, isLastSegment) {
    try {
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
        metadataCallback(metadata);
        break;

      case 0xE1:  // APP1 segment. Probably holds EXIF metadata
        parseAPP1(data);
        /* fallthrough */

      default:
        // A segment we don't care about, so just go on and read the next one
        if (isLastSegment) {
          metadataError('unexpected end of JPEG file');
          return;
        }
        getSegment(data, size, segmentHandler);
      }
    }
    catch (e) {
      metadataError(e.toString() + '\n' + e.stack);
    }
  }

  function parseAPP1(data) {
    if (data.getUint32(4, false) === 0x45786966) { // "Exif"
      var exif = parseEXIFData(data);

      if (exif.THUMBNAIL && exif.THUMBNAILLENGTH) {
        var start = data.sliceOffset + data.viewOffset + 10 + exif.THUMBNAIL;
        metadata.preview = {
          start: start,
          end: start + exif.THUMBNAILLENGTH
        };
      }

      // map exif orientation flags for easy transforms
      switch (exif.ORIENTATION) {
        case undefined:
        case 1:
          metadata.rotation = 0;
          metadata.mirrored = false;
          break;
        case 2:
          metadata.rotation = 0;
          metadata.mirrored = true;
          break;
        case 3:
          metadata.rotation = 180;
          metadata.mirrored = false;
          break;
        case 4:
          metadata.rotation = 180;
          metadata.mirrored = true;
          break;
        case 5:
          metadata.rotation = 90;
          metadata.mirrored = true;
          break;
        case 6:
          metadata.rotation = 90;
          metadata.mirrored = false;
          break;
        case 7:
          metadata.rotation = 270;
          metadata.mirrored = true;
          break;
        case 8:
          metadata.rotation = 270;
          metadata.mirrored = false;
          break;
        default:
          throw Error('Unknown Exif code for orientation');
      }
    }
  }

  // Parse an EXIF segment from a JPEG file and return an object
  // of metadata attributes. The argument must be a DataView object
  function parseEXIFData(data) {
    var exif = {};

    var byteorder = data.getUint8(10);
    if (byteorder === 0x4D) {  // big endian
      byteorder = false;
    } else if (byteorder === 0x49) {  // little endian
      byteorder = true;
    } else {
      throw Error('invalid byteorder in EXIF segment');
    }

    if (data.getUint16(12, byteorder) !== 42) { // magic number
      throw Error('bad magic number in EXIF segment');
    }

    var offset = data.getUint32(14, byteorder);

     // This is how we would parse all EXIF metadata more generally.
     // Especially need for iamge orientation
    parseIFD(data, offset + 10, byteorder, exif, true);

    // I'm leaving this code in as a comment in case we need other EXIF
    // data in the future.
    // if (exif.EXIFIFD) {
    //   parseIFD(data, exif.EXIFIFD + 10, byteorder, exif);
    //   delete exif.EXIFIFD;
    // }

    // if (exif.GPSIFD) {
    //   parseIFD(data, exif.GPSIFD + 10, byteorder, exif);
    //   delete exif.GPSIFD;
    // }

    // Instead of a general purpose EXIF parse, we're going to drill
    // down directly to the thumbnail image.
    // We're in IFD0 here. We want the offset of IFD1
    var ifd0entries = data.getUint16(offset + 10, byteorder);
    var ifd1 = data.getUint32(offset + 12 + 12 * ifd0entries, byteorder);
    // If there is an offset for IFD1, parse that
    if (ifd1 !== 0)
      parseIFD(data, ifd1 + 10, byteorder, exif, true);

    return exif;
  }

  function parseIFD(data, offset, byteorder, exif, onlyParseOne) {
    var numentries = data.getUint16(offset, byteorder);
    for (var i = 0; i < numentries; i++) {
      parseEntry(data, offset + 2 + 12 * i, byteorder, exif);
    }

    if (onlyParseOne)
      return;

    var next = data.getUint32(offset + 2 + 12 * numentries, byteorder);
    if (next !== 0 && next < file.size) {
      parseIFD(data, next + 10, byteorder, exif);
    }
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
    // These are special tags that we handle internally
     '34665': 'EXIFIFD',         // Offset of EXIF data
     '34853': 'GPSIFD',          // Offset of GPS data
    */
    '274' : 'ORIENTATION',
    '513': 'THUMBNAIL',         // Offset of thumbnail
    '514': 'THUMBNAILLENGTH'    // Length of thumbnail
  };

  function parseEntry(data, offset, byteorder, exif) {
    var tag = data.getUint16(offset, byteorder);
    var tagname = tagnames[tag];

    // If we don't know about this tag type or already processed it, skip it
    if (!tagname || exif[tagname])
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
