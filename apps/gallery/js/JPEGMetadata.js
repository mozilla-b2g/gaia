
'use strict';

// Asynchronously read a JPEG Blob (or File), extract its metadata,
// and pass an object containing selected portions of that metadata
// to the specified callback function.
function readJPEGMetadata(blob, callback, errorCallback) {
  if (!errorCallback) {
    errCallback = function(e) {
      console.error('JPEGMetadata', String(e));
    };
  }

  var reader = new FileReader();
  reader.readAsArrayBuffer(blob);

  reader.onerror = function onerror() {
    errorCallback(reader.error);
  };

  reader.onload = function onload() {
    try {
      var data = new DataView(reader.result);
      var metadata = parseJPEGMetadata(data);
    } catch (e) {
      errorCallback(e);
      return;
    }
    callback(metadata);
  };

  function parseJPEGMetadata(data) {
    var metadata = {};
    if (data.getUint8(0) !== 0xFF || data.getUint8(1) !== 0xD8) {
      throw Error('Not a JPEG file');
    }

    var offset = 2;

    // Loop through the segments of the JPEG file
    while (offset < data.byteLength) {
      if (data.getUint8(offset++) !== 0xFF) {
        throw Error('malformed JPEG file: missing 0xFF delimiter');
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
            var thumbnailBlob = blob.slice(start, end, 'image/jpeg');
            var thumbnailData = new DataView(data.buffer,
                                             start,
                                             metadata.exif.THUMBNAILLENGTH);
            metadata.thumbnail = parseJPEGMetadata(thumbnailData);
            metadata.thumbnail.blob = thumbnailBlob;
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

