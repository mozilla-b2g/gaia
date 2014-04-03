/**
* jpegjs.js v0.0.1 by @dmarcos 
* Copyright 2014 Diego Marcos <diego.marcos@gmail.com>
* 
*/
'use strict';

var JPEG = JPEG || {};

JPEG.BlobView = (function() {
  function fail(msg) {
    throw Error(msg);
  }

  // This constructor is for internal use only.
  // Use the BlobView.get() factory function or the getMore instance method
  // to obtain a BlobView object.
  function BlobView(blob, sliceOffset, sliceLength, slice,
                    viewOffset, viewLength, littleEndian)
  {
    this.blob = blob;                  // The parent blob that the data is from
    this.sliceOffset = sliceOffset;    // The start address within the blob
    this.sliceLength = sliceLength;    // How long the slice is
    this.slice = slice;                // The ArrayBuffer of slice data
    this.viewOffset = viewOffset;      // The start of the view within the slice
    this.viewLength = viewLength;      // The length of the view
    this.littleEndian = littleEndian;  // Read little endian by default?

    // DataView wrapper around the ArrayBuffer
    this.view = new DataView(slice, viewOffset, viewLength);

    // These fields mirror those of DataView
    this.buffer = slice;
    this.byteLength = viewLength;
    this.byteOffset = viewOffset;

    this.index = 0;   // The read methods keep track of the read position
  }

  // Async factory function
  BlobView.get = function(blob, offset, length, callback, littleEndian) {
    if (offset < 0)
      fail('negative offset');
    if (length < 0)
      fail('negative length');
    if (offset > blob.size)
      fail('offset larger than blob size');

    // Don't fail if the length is too big; just reduce the length
    if (offset + length > blob.size)
      length = blob.size - offset;

    var slice = blob.slice(offset, offset + length);
    var reader = new FileReader();
    reader.readAsArrayBuffer(slice);
    reader.onloadend = function() {
      var result = null;
      if (reader.result) {
        result = new BlobView(blob, offset, length, reader.result,
                              0, length, littleEndian || false);
      }
      callback(result, reader.error);
    };
  };

  BlobView.prototype = {
    constructor: BlobView,

    // This instance method is like the BlobView.get() factory method,
    // but it is here because if the current buffer includes the requested
    // range of bytes, they can be passed directly to the callback without
    // going back to the blob to read them
    getMore: function(offset, length, callback) {
      if (offset >= this.sliceOffset &&
          offset + length <= this.sliceOffset + this.sliceLength) {
        // The quick case: we already have that region of the blob
        callback(new BlobView(this.blob,
                              this.sliceOffset, this.sliceLength, this.slice,
                              offset - this.sliceOffset, length,
                              this.littleEndian));
      }
      else {
        // Otherwise, we have to do an async read to get more bytes
        BlobView.get(this.blob, offset, length, callback, this.littleEndian);
      }
    },

    // Set the default endianness for the other methods
    littleEndian: function() {
      this.littleEndian = true;
    },
    bigEndian: function() {
      this.littleEndian = false;
    },

    // These "get" methods are just copies of the DataView methods, except
    // that they honor the default endianness
    getUint8: function(offset) {
      return this.view.getUint8(offset);
    },
    getInt8: function(offset) {
      return this.view.getInt8(offset);
    },
    getUint16: function(offset, le) {
      return this.view.getUint16(offset,
                                 le !== undefined ? le : this.littleEndian);
    },
    getInt16: function(offset, le) {
      return this.view.getInt16(offset,
                                le !== undefined ? le : this.littleEndian);
    },
    getUint32: function(offset, le) {
      return this.view.getUint32(offset,
                                 le !== undefined ? le : this.littleEndian);
    },
    getInt32: function(offset, le) {
      return this.view.getInt32(offset,
                                le !== undefined ? le : this.littleEndian);
    },
    getFloat32: function(offset, le) {
      return this.view.getFloat32(offset,
                                  le !== undefined ? le : this.littleEndian);
    },
    getFloat64: function(offset, le) {
      return this.view.getFloat64(offset,
                                  le !== undefined ? le : this.littleEndian);
    },

    // These "set" methods are just copies of the DataView methods, except
    // that they honor the default endianness
    setUint8: function(offset, value) {
      return this.view.setUint8(offset, value);
    },
    setInt8: function(offset, value) {
      return this.view.setInt8(offset, value);
    },
    setUint16: function(offset, value, le) {
      return this.view.setUint16(offset, value,
                                 le !== undefined ? le : this.littleEndian);
    },
    setInt16: function(offset, value, le) {
      return this.view.setInt16(offset, value,
                                le !== undefined ? le : this.littleEndian);
    },
    setUint32: function(offset, value, le) {
      return this.view.setUint32(offset, value,
                                 le !== undefined ? le : this.littleEndian);
    },
    setInt32: function(offset, value, le) {
      return this.view.setInt32(offset, value,
                                le !== undefined ? le : this.littleEndian);
    },
    setFloat32: function(offset, value, le) {
      return this.view.setFloat32(offset, value,
                                  le !== undefined ? le : this.littleEndian);
    },
    setFloat64: function(offset, value, le) {
      return this.view.setFloat64(offset, value,
                                  le !== undefined ? le : this.littleEndian);
    },

    // These "read" methods read from the current position in the view and
    // update that position accordingly
    readByte: function() {
      return this.view.getInt8(this.index++);
    },
    readUnsignedByte: function() {
      return this.view.getUint8(this.index++);
    },
    readShort: function(le) {
      var val = this.view.getInt16(this.index,
                                   le !== undefined ? le : this.littleEndian);
      this.index += 2;
      return val;
    },
    readUnsignedShort: function(le) {
      var val = this.view.getUint16(this.index,
                                    le !== undefined ? le : this.littleEndian);
      this.index += 2;
      return val;
    },
    readInt: function(le) {
      var val = this.view.getInt32(this.index,
                                   le !== undefined ? le : this.littleEndian);
      this.index += 4;
      return val;
    },
    readUnsignedInt: function(le) {
      var val = this.view.getUint32(this.index,
                                    le !== undefined ? le : this.littleEndian);
      this.index += 4;
      return val;
    },
    readFloat: function(le) {
      var val = this.view.getFloat32(this.index,
                                     le !== undefined ? le : this.littleEndian);
      this.index += 4;
      return val;
    },
    readDouble: function(le) {
      var val = this.view.getFloat64(this.index,
                                     le !== undefined ? le : this.littleEndian);
      this.index += 8;
      return val;
    },

    // Methods to get and set the current position
    tell: function() {
      return this.index;
    },
    seek: function(index) {
      if (index < 0)
        fail('negative index');
      if (index >= this.byteLength)
        fail('index greater than buffer size');
      this.index = index;
    },
    advance: function(n) {
      var index = this.index + n;
      if (index < 0)
        fail('advance past beginning of buffer');
      // It's usual that when we finished reading one target view,
      // the index is advanced to the start(previous end + 1) of next view,
      // and the new index will be equal to byte length(the last index + 1),
      // we will not fail on it because it means the reading is finished,
      // or do we have to warn here?
      if (index > this.byteLength)
        fail('advance past end of buffer');
      this.index = index;
    },

    // Additional methods to read other useful things
    getUnsignedByteArray: function(offset, n) {
      return new Uint8Array(this.buffer, offset + this.viewOffset, n);
    },

    // Additional methods to read other useful things
    readUnsignedByteArray: function(n) {
      var val = new Uint8Array(this.buffer, this.index + this.viewOffset, n);
      this.index += n;
      return val;
    },

    getBit: function(offset, bit) {
      var byte = this.view.getUint8(offset);
      return (byte & (1 << bit)) !== 0;
    },

    getUint24: function(offset, le) {
      var b1, b2, b3;
      if (le !== undefined ? le : this.littleEndian) {
        b1 = this.view.getUint8(offset);
        b2 = this.view.getUint8(offset + 1);
        b3 = this.view.getUint8(offset + 2);
      }
      else {    // big end first
        b3 = this.view.getUint8(offset);
        b2 = this.view.getUint8(offset + 1);
        b1 = this.view.getUint8(offset + 2);
      }

      return (b3 << 16) + (b2 << 8) + b1;
    },

    readUint24: function(le) {
      var value = this.getUint24(this.index, le);
      this.index += 3;
      return value;
    },

    // There are lots of ways to read strings.
    // ASCII, UTF-8, UTF-16.
    // null-terminated, character length, byte length
    // I'll implement string reading methods as needed

    getASCIIText: function(offset, len) {
      var bytes = new Uint8Array(this.buffer, offset + this.viewOffset, len);
      return String.fromCharCode.apply(String, bytes);
    },

    getNullTerminatedASCIIString: function(offset) {
      var string = "";
      var characterCode;
      while (offset < this.sliceLength) {
        characterCode = this.view.getUint8(offset);
        if (characterCode === 0) {
          break;
        }
        string += String.fromCharCode(characterCode);
        offset++;
      }
      return string;
    },

    readASCIIText: function(len) {
      var bytes = new Uint8Array(this.buffer,
                                 this.index + this.viewOffset,
                                 len);
      this.index += len;
      return String.fromCharCode.apply(String, bytes);
    },

    // Replace this with the StringEncoding API when we've got it.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=764234
    getUTF8Text: function(offset, len) {
      function fail() { throw new Error('Illegal UTF-8'); }

      var pos = offset;         // Current position in this.view
      var end = offset + len;   // Last position
      var charcode;             // Current charcode
      var s = '';               // Accumulate the string
      var b1, b2, b3, b4;       // Up to 4 bytes per charcode

      // See http://en.wikipedia.org/wiki/UTF-8
      while (pos < end) {
        var b1 = this.view.getUint8(pos);
        if (b1 < 128) {
          s += String.fromCharCode(b1);
          pos += 1;
        }
        else if (b1 < 194) {
          // unexpected continuation character...
          fail();
        }
        else if (b1 < 224) {
          // 2-byte sequence
          if (pos + 1 >= end)
            fail();
          b2 = this.view.getUint8(pos + 1);
          if (b2 < 128 || b2 > 191)
            fail();
          charcode = ((b1 & 0x1f) << 6) + (b2 & 0x3f);
          s += String.fromCharCode(charcode);
          pos += 2;
        }
        else if (b1 < 240) {
          // 3-byte sequence
          if (pos + 3 >= end)
            fail();
          b2 = this.view.getUint8(pos + 1);
          if (b2 < 128 || b2 > 191)
            fail();
          b3 = this.view.getUint8(pos + 2);
          if (b3 < 128 || b3 > 191)
            fail();
          charcode = ((b1 & 0x0f) << 12) + ((b2 & 0x3f) << 6) + (b3 & 0x3f);
          s += String.fromCharCode(charcode);
          pos += 3;
        }
        else if (b1 < 245) {
          // 4-byte sequence
          if (pos + 3 >= end)
            fail();
          b2 = this.view.getUint8(pos + 1);
          if (b2 < 128 || b2 > 191)
            fail();
          b3 = this.view.getUint8(pos + 2);
          if (b3 < 128 || b3 > 191)
            fail();
          b4 = this.view.getUint8(pos + 3);
          if (b4 < 128 || b4 > 191)
            fail();
          charcode = ((b1 & 0x07) << 18) +
            ((b2 & 0x3f) << 12) +
            ((b3 & 0x3f) << 6) +
            (b4 & 0x3f);

          // Now turn this code point into two surrogate pairs
          charcode -= 0x10000;
          s += String.fromCharCode(0xd800 + ((charcode & 0x0FFC00) >>> 10));
          s += String.fromCharCode(0xdc00 + (charcode & 0x0003FF));

          pos += 4;
        }
        else {
          // Illegal byte
          fail();
        }
      }

      return s;
    },

    readUTF8Text: function(len) {
      try {
        return this.getUTF8Text(this.index, len);
      }
      finally {
        this.index += len;
      }
    },

    // Read 4 bytes, ignore the high bit and combine them into a 28-bit
    // big-endian unsigned integer.
    // This format is used by the ID3v2 metadata.
    getID3Uint28BE: function(offset) {
      var b1 = this.view.getUint8(offset) & 0x7f;
      var b2 = this.view.getUint8(offset + 1) & 0x7f;
      var b3 = this.view.getUint8(offset + 2) & 0x7f;
      var b4 = this.view.getUint8(offset + 3) & 0x7f;
      return (b1 << 21) | (b2 << 14) | (b3 << 7) | b4;
    },

    readID3Uint28BE: function() {
      var value = this.getID3Uint28BE(this.index);
      this.index += 4;
      return value;
    },

    // Read bytes up to and including a null terminator, but never
    // more than size bytes.  And return as a Latin1 string
    readNullTerminatedLatin1Text: function(size) {
      var s = '';
      for (var i = 0; i < size; i++) {
        var charcode = this.view.getUint8(this.index + i);
        if (charcode === 0) {
          i++;
          break;
        }
        s += String.fromCharCode(charcode);
      }
      this.index += i;
      return s;
    },

    // Read bytes up to and including a null terminator, but never
    // more than size bytes.  And return as a UTF8 string
    readNullTerminatedUTF8Text: function(size) {
      for (var len = 0; len < size; len++) {
        if (this.view.getUint8(this.index + len) === 0)
          break;
      }
      var s = this.readUTF8Text(len);
      if (len < size)    // skip the null terminator if we found one
        this.advance(1);
      return s;
    },

    // Read UTF16 text.  If le is not specified, expect a BOM to define
    // endianness.  If le is true, read UTF16LE, if false, UTF16BE
    // Read until we find a null-terminator, but never more than size bytes
    readNullTerminatedUTF16Text: function(size, le) {
      if (le == null) {
        var BOM = this.readUnsignedShort();
        size -= 2;
        if (BOM === 0xFEFF)
          le = false;
        else
          le = true;
      }

      var s = '';
      for (var i = 0; i < size; i += 2) {
        var charcode = this.getUint16(this.index + i, le);
        if (charcode === 0) {
          i += 2;
          break;
        }
        s += String.fromCharCode(charcode);
      }
      this.index += i;
      return s;
    }
  };

  // We don't want users of this library to accidentally call the constructor
  // instead of using the factory function, so we return a dummy object
  // instead of the real constructor. If someone really needs to get at the
  // real constructor, the contructor property of the prototype refers to it.
  return { get: BlobView.get };
}());

(function() {

var tagTypes = {
  BYTE: 1,
  ASCII: 2,
  SHORT: 3,
  LONG: 4,
  RATIONAL: 5,
  SBYTE: 6,
  UNDEFINED: 7,
  SSHORT: 8,
  SLONG: 9,
  SRATIONAL: 10,
  FLOAT: 11,
  DOUBLE: 12
};

var tagTypesString = {
  1: "BYTE",
  2: "ASCII",
  3: "SHORT",
  4: "LONG",
  5: "RATIONAL",
  6: "SBYTE",
  7: "UNDEFINED",
  8: "SSHORT",
  9: "SLONG",
  10: "SRATIONAL",
  11: "FLOAT",
  12: "DOUBLE"
};

var tagTypeSize = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  6: 1, // SBYTE
  7: 1, // UNDEFINED
  8: 2, // SSHORT
  9: 4, // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8  // DOUBLE
};

var IFDId = {
  Image: 1,
  Photo: 2,
  GPSInfo: 3,
  Iop: 4
};

var interOperabilityTags = {
  "1": { // Indicates the identification of the Interoperability rule. Use "R98" for stating ExifR98 Rules. Four bytes used including the termination code (NULL). see the separate volume of Recommended Exif Interoperability Rules (ExifR98) for other tags used for ExifR98.
    "IFD": 4,
    "key": "InteroperabilityIndex",
    "type": 2
  },
  "2": { // Interoperability version
    "IFD": 4,
    "key": "InteroperabilityVersion",
    "type": 7
  },
  "4096": { // File format of image file
    "IFD": 4,
    "key": "RelatedImageFileFormat",
    "type": 2
  },
  "4097": { // Image width
    "IFD": 4,
    "key": "RelatedImageWidth",
    "type": 4
  },
  "4098": { // Image height
    "IFD": 4,
    "key": "RelatedImageLength",
    "type": 4
  }
};

// Tags supported by the 2.2 Standard
var tags = {
  "0": { // Indicates the version of <GPSInfoIFD>. The version is given as 2.0.0.0. This tag is mandatory when <GPSInfo> tag is present. (Note: The <GPSVersionID> tag is given in byte s, unlike the <ersion> tag. When the version is 2.0.0.0, the tag value is 02000000.H).
    "IFD": 3,
    "key": "GPSVersionID",
    "type": 1
  },
  "1": { // Indicates whether the latitude is north or south latitude. The ASCII value 'N' indicates north latitude, and 'S' is south latitude.
    "IFD": 3,
    "key": "GPSLatitudeRef",
    "type": 2
  },
  "2": { // Indicates the latitude. The latitude is expressed as three,Rational values giving the degrees, minutes, and seconds, respectively. When degrees, minutes and seconds are expressed, the format is dd/1, mm/1, ss/1. When degrees and minutes are used and, for example, fractions of minutes are given up to two decimal places, the format is dd/1, mmmm/100, 0/1.
    "IFD": 3,
    "key": "GPSLatitude",
    "type": 5
  },
  "3": { // Indicates whether the LONGitude is east or west LONGitude.ASCII 'E' indicates east LONGitude, and 'W' is west LONGitude.
    "IFD": 3,
    "key": "GPSLongitudeRef",
    "type": 2
  },
  "4": { // Indicates the LONGitude. The LONGitude is expressed as three,Rational values giving the degrees, minutes, and seconds, respectively. When degrees, minutes and seconds are expressed, the format is ddd/1, mm/1, ss/1. When degrees and minutes are used and, for example, fractions of minutes are given up to two decimal places, the format is ddd/1, mmmm/100, 0/1.
    "IFD": 3,
    "key": "GPSLongitude",
    "type": 5
  },
  "5": { // Indicates the altitude used as the reference altitude. If the reference is sea level and the altitude is above sea level, 0 is given. If the altitude is below sea level, a value of 1 is given and the altitude is indicated as an absolute value in the GSPAltitude tag. The reference unit is meters. Note that this tag is Byte type, unlike other reference tags.
    "IFD": 3,
    "key": "GPSAltitudeRef",
    "type": 1
  },
  "6": { // Indicates the altitude based on the reference in GPSAltitudeRef. Altitude is expressed as one rational value. The reference unit is meters.
    "IFD": 3,
    "key": "GPSAltitude",
    "type": 5
  },
  "7": { // Indicates the time as UTC (Coordinated Universal Time). <TimeStamp> is expressed as three rational values giving the hour, minute, and second (atomic clock).
    "IFD": 3,
    "key": "GPSTimeStamp",
    "type": 5
  },
  "8": { // Indicates the GPS satellites used for measurements. This tag can be used to describe the number of satellites, their ID number, angle of elevation, azimuth, SNR and other information in ASCII notation. The format is not specified. If the GPS receiver is incapable of taking measurements, value of the tag is set to NULL.
    "IFD": 3,
    "key": "GPSSatellites",
    "type": 2
  },
  "9": { // Indicates the status of the GPS receiver when the image is recorded. 'A' means measurement is in progress, and 'V' means the measurement is Interoperability.
    "IFD": 3,
    "key": "GPSStatus",
    "type": 2
  },
  "10": { // Indicates the GPS measurement mode. '2' means two-dimensional measurement and '3' means three-dimensional measurement is in progress.

    "IFD": 3,
    "key": "GPSMeasureMode",
    "type": 2
  },
  "11": { // Indicates the GPS DOP (data degree of precision). An HDOP value is written during two-dimensional measurement, and PDOP during three-dimensional measurement.
    "IFD": 3,
    "key": "GPSDOP",
    "type": 5
  },
  "12": { // Indicates the unit used to express the GPS receiver speed of movement. 'K' 'M' and 'N' represents kilometers per hour, miles per hour, and knots.
    "IFD": 3,
    "key": "GPSSpeedRef",
    "type": 2
  },
  "13": { // Indicates the speed of GPS receiver movement.
    "IFD": 3,
    "key": "GPSSpeed",
    "type": 5
  },
  "14": { // Indicates the reference for giving the direction of GPS receiver movement. 'T' denotes true direction and 'M' is magnetic direction.
    "IFD": 3,
    "key": "GPSTrackRef",
    "type": 2
  },
  "15": { // Indicates the direction of GPS receiver movement. The range of values is from 0.00 to 359.99.
    "IFD": 3,
    "key": "GPSTrack",
    "type": 5
  },
  "16": { // Indicates the reference for giving the direction of the image when it is captured. 'T' denotes true direction and 'M' is magnetic direction.
    "IFD": 3,
    "key": "GPSImgDirectionRef",
    "type": 2
  },
  "17": { // Indicates the direction of the image when it was captured. The range of values is from 0.00 to 359.99.
    "IFD": 3,
    "key": "GPSImgDirection",
    "type": 5
  },
  "18": { // Indicates the geodetic survey data used by the GPS receiver. If the survey data is restricted to Japan, the value of this tag is 'TOKYO' or 'WGS-84'.
    "IFD": 3,
    "key": "GPSMapDatum",
    "type": 2
  },
  "19": { // Indicates whether the latitude of the destination point is north or south latitude. The ASCII  value 'N' indicates north latitude, and 'S' is south latitude.
    "IFD": 3,
    "key": "GPSDestLatitudeRef",
    "type": 2
  },
  "20": { // Indicates the latitude of the destination point. The latitude is expressed as three rational values giving the degrees, minutes, and seconds, respectively. If latitude is expressed as degrees, minutes and seconds, a typical format would be dd/1, mm/1, ss/1. When degrees and minutes are used and, for example, fractions of minutes are given up to two decimal places, the format would be dd/1, mmmm/100, 0/1.
    "IFD": 3,
    "key": "GPSDestLatitude",
    "type": 5
  },
  "21": { // Indicates whether the LONGitude of the destination point is east or west LONGitude. ASCII 'E' indicates east LONGitude, and 'W' is west LONGitude.
    "IFD": 3,
    "key": "GPSDestLONGitudeRef",
    "type": 2
  },
  "22": { // Indicates the LONGitude of the destination point. The LONGitude is expressed as three,Rational values giving the degrees, minutes, and seconds, respectively. If LONGitude is expressed as degrees, minutes and seconds, a typical format would be ddd/1, mm/1, ss/1. When degrees and minutes are used and, for example, fractions of minutes are given up to two decimal places, the format would be ddd/1, mmmm/100, 0/1.
    "IFD": 3,
    "key": "GPSDestLONGitude",
    "type": 5
  },
  "23": { // Indicates the reference used for giving the bearing to the destination point. 'T' denotes true direction and 'M' is magnetic direction.
    "IFD": 3,
    "key": "GPSDestBearingRef",
    "type": 2
  },
  "24": { // Indicates the bearing to the destination point. The range of values is from 0.00 to 359.99.
    "IFD": 3,
    "key": "GPSDestBearing",
    "type": 5
  },
  "25": { // Indicates the unit used to express the distance to the destination point. 'K'  'M' and 'N' represent kilometers, miles and knots.
    "IFD": 3,
    "key": "GPSDestDistanceRef",
    "type": 2
  },
  "26": { // Indicates the distance to the destination point.
    "IFD": 3,
    "key": "GPSDestDistance",
    "type": 5
  },
  "27": { // A character string recording the name of the method used for location finding. The first byte indicates the character code used, and this is followed by the name of the method.
    "IFD": 3,
    "key": "GPSProcessingMethod",
    "type": 7
  },
  "28": { // A character string recording the name of the GPS area. The first byte indicates the character code used, and this is followed by the name of the GPS area.
    "IFD": 3,
    "key": "GPSAreaInformation",
    "type": 7
  },
  "29": { // A character string recording date and time information relative to UTC (Coordinated Universal Time). The format is 'YYYY:MM:DD'.
    "IFD": 3,
    "key": "GPSDateStamp",
    "type": 2
  },
  "30": { // Indicates whether differential correction is applied to the GPS receiver.
    "IFD": 3,
    "key": "GPSDifferential",
    "type": 3
  },
  "254": { // A general indication of the kind of data contained in this subfile.
    "IFD": 1,
    "key": "NewSubfileType",
    "type": 4
  },
  "255": { // A general indication of the kind of data contained in this subfile. This field is deprecated. The NewSubfileType field should be used instead.
    "IFD": 1,
    "key": "SubfileType",
    "type": 3
  },
  "256": { // The number of columns of image data, equal to the number of pixels per row. In JPEG compressed data a JPEG marker is used instead of this tag.
    "IFD": 1,
    "key": "ImageWidth",
    "type": 4
  },
  "257": { // The number of rows of image data. In JPEG compressed data a JPEG marker is used instead of this tag.
    "": 1,
    "key": "ImageLength",
    "type": 4
  },
  "258": { // The number of bits per image component. In this standard each component of the image is 8 bits, so the value for this tag is 8. See also <SamplesPerPixel>. In JPEG compressed data a JPEG marker is used instead of this tag.
    "IFD": 1,
    "key": "BitsPerSample",
    "type": 3
  },
  "259": { // The compression scheme used for the image data. When a primary image is JPEG compressed, this designation is not necessary and is omitted. When thumbnails use JPEG compression, this tag value is set to 6.
    "IFD": 1,
    "key": "Compression",
    "type": 3
  },
  "262": { // The pixel composition. In JPEG compressed data a JPEG marker is used instead of this tag.
    "IFD": 1,
    "key": "PhotometricInterpretation",
    "type": 3
  },
  "263": { // For black and white TIFF files that represent shades of gray, the technique used to convert from gray to black and white pixels.
    "IFD": 1,
    "key": "Threshholding",
    "type": 3
  },
  "264": { // The width of the dithering or halftoning matrix used to create a dithered or halftoned bilevel file.
    "IFD": 1,
    "key": "CellWidth",
    "type": 3
  },
  "265": { // The length of the dithering or halftoning matrix used to create a dithered or halftoned bilevel file.
    "IFD": 1,
    "key": "CellLength",
    "type": 3
  },
  "266": { // The logical order of bits within a byte
    "IFD": 1,
    "key": "FillOrder",
    "type": 3
  },
  "269": { // The name of the document from which this image was scanned
    "IFD": 1,
    "key": "DocumentName",
    "type": 2
  },
  "270": { // A character string giving the title of the image. It may be a comment such as '1988 company picnic' or the like. Two-bytes character codes cannot be used. When a 2-bytes code is necessary, the Private tag <UserComment> is to be used.
    "IFD": 1,
    "key": "ImageDescription",
    "type": 2
  },
  "271": { // The manufacturer of the recording equipment. This is the manufacturer of the DSC, scanner, video digitizer or other equipment that generated the image. When the field is left blank, it is treated as unknown.
    "IFD": 1,
    "key": "Make",
    "type": 2
  },
  "272": { // The model name or model number of the equipment. This is the model name or number of the DSC, scanner, video digitizer or other equipment that generated the image. When the field is left blank, it is treated as unknown.
    "IFD": 1,
    "key": "Model",
    "type": 2
  },
  "273": { // For each strip, the byte offset of that strip. It is recommended that this be selected so the number of strip byte s does not exceed 64 Kbytes. With JPEG compressed data this designation is not needed and is omitted. See also <RowsPerStrip> and <StripByteCounts>.
    "IFD": 1,
    "key": "StripOffsets",
    "type": 4
  },
  "274": { // The image orientation viewed in terms of rows and columns.
    "IFD": 1,
    "key": "Orientation",
    "type": 3
  },
  "277": { // The number of components per pixel. Since this standard applies to RGB and YCbCr images, the value set for this tag is 3. In JPEG compressed data a JPEG marker is used instead of this tag.
    "IFD": 1,
    "key": "SamplesPerPixel",
    "type": 3
  },
  "278": { // The number of rows per strip. This is the number of rows in the image of one strip when an image is divided into strips. With JPEG compressed data this designation is not needed and is omitted. See also <StripOffsets> and <StripByteCounts>.
    "IFD": 1,
    "key": "RowsPerStrip",
    "type": 4
  },
  "279": { // The total number of byte s in each strip. With JPEG compressed data this designation is not needed and is omitted.
    "IFD": 1,
    "key": "StripByteCounts",
    "type": 4
  },
  "282": { // The number of pixels per <ResolutionUnit> in the <ImageWidth> direction. When the image resolution is unknown, 72 [dpi] is designated.
    "IFD": 1,
    "key": "XResolution",
    "type": 5
  },
  "283": { // The number of pixels per <ResolutionUnit> in the <ImageLength> direction. The same value as <XResolution> is designated.
    "IFD": 1,
    "key": "YResolution",
    "type": 5
  },
  "284": { // Indicates whether pixel components are recorded in a chunky or planar format. In JPEG compressed files a JPEG marker is used instead of this tag. If this field does not exist, the TIFF default of 1 (chunky) is assumed.
    "IFD": 1,
    "key": "PlanarConfiguration",
    "type": 3
  },
  "290": { // The precision of the information contained in the GrayResponseCurve.
    "IFD": 1,
    "key": "GrayResponseUnit",
    "type": 3
  },
  "291": { // For grayscale data, the optical density of each possible pixel value.
    "IFD": 1,
    "key": "GrayResponseCurve",
    "type": 3
  },
  "292": { // T.4-encoding options.
    "IFD": 1,
    "key": "T4Options",
    "type": 4
  },
  "293": { // T.6-encoding options.
    "IFD": 1,
    "key": "T6Options",
    "type": 4
  },
  "296": { // The unit for measuring <XResolution> and <YResolution>. The same unit is used for both <XResolution> and <YResolution>. If the image resolution is unknown, 2 (inches) is designated.
    "IFD": 1,
    "key": "ResolutionUnit",
    "type": 3
  },
  "301": { // A transfer function for the image, described in tabular style. Normally this tag is not necessary, since color space is specified in the color space information tag (<ColorSpace>).
    "IFD": 1,
    "key": "TransferFunction",
    "type": 3
  },
  "305": { // This tag records the name and version of the software or firmware of the camera or image input device used to generate the image. The detailed format is not specified, but it is recommended that the example shown below be followed. When the field is left blank, it is treated as unknown.
    "IFD": 1,
    "key": "Software",
    "type": 2
  },
  "306": { // The date and time of image creation. In standard, it is the date and time the file was changed.
    "IFD": 1,
    "key": "DateTime",
    "type": 2
  },
  "315": { // This tag records the name of the camera owner, photographer or image creator. The detailed format is not specified, but it is recommended that the information be written as in the example below for ease of Interoperability. When the field is left blank, it is treated as unknown. Ex.) 'Camera owner, John Smith; Photographer, Michael Brown; Image creator, Ken James
    "IFD": 1,
    "key": "Artist",
    "type": 2
  },
  "316": { // This tag records information about the host computer used to generate the image.
    "IFD": 1,
    "key": "HostComputer",
    "type": 2
  },
  "317": { // A predictor is a mathematical operator that is applied to the image data before an encoding scheme is applied.
    "IFD": 1,
    "key": "Predictor",
    "type": 3
  },
  "318": { // The chromaticity of the white point of the image. Normally this tag is not necessary, since color space is specified in the colorspace information tag (<ColorSpace>)."
    "IFD": 1,
    "key": "WhitePoint",
    "type": 5
  },
  "319": { // The chromaticity of the three primary colors of the image. Normally this tag is not necessary, since colorspace is specified in the colorspace information tag (<ColorSpace>)."
    "IFD": 1,
    "key": "PrimaryChromaticities",
    "type": 5
  },
  "320": { // A color map for palette color images. This field defines a Red-Green-Blue color map (often called a lookup table) for palette-color images. In a palette-color image, a pixel value is used to index into an RGB lookup table.
    "IFD": 1,
    "key": "ColorMap",
    "type": 3
  },
  "321": { // The purpose of the HalftoneHints field is to convey to the halftone function the range of gray levels within a colorimetrically-specified image that should retain tonal detail.
    "IFD": 1,
    "key": "HalftoneHints",
    "type": 3
  },
  "322": { // The tile width in pixels. This is the number of columns in each tile.
    "IFD": 1,
    "key": "TileWidth",
    "type": 3
  },
  "323": { // The tile length (height) in pixels. This is the number of rows in each tile.
    "IFD": 1,
    "key": "TileLength",
    "type": 3
  },
  "324": { // For each tile, the byte  offset of that tile, as compressed and stored on disk. The offset is specified with respect to the beginning of the TIFF file. Note that this implies that each tile has a location independent of the locations of other tiles.
    "IFD": 1,
    "key": "TileOffsets",
    "type": 3
  },
  "325": { // For each tile, the number of (compressed) byte s in that tile. See TileOffsets for a description of how the byte  counts are ordered.
    "IFD": 1,
    "key": "TileByteCounts",
    "type": 3
  },
  "330": { // Defined by Adobe Corporation to enable TIFF Trees within a TIFF file.
    "IFD": 1,
    "key": "SubIFDs",
    "type": 4
  },
  "332": { // The set of inks used in a separated (PhotometricInterpretation=5) image.
    "IFD": 1,
    "key": "InkSet",
    "type": 3
  },
  "333": { // The name of each ink used in a separated (PhotometricInterpretation=5) image.
    "IFD": 1,
    "key": "InkNames",
    "type": 2
  },
  "334": { // The number of inks. Usually equal to SamplesPerPixel, unless there are extra samples.
    "IFD": 1,
    "key": "NumberOfInks",
    "type": 3
  },
  "336": { // The component values that correspond to a 0% dot and 100% dot.
    "IFD": 1,
    "key": "DotRange",
    "type": 1
  },
  "337": { // A description of the printing environment for which this separation is intended.
    "IFD": 1,
    "key": "TargetPrinter",
    "type": 2
  },
  "338": { // Specifies that each pixel has m extra components whose interpretation is defined by one of the values listed below.
    "IFD": 1,
    "key": "ExtraSamples",
    "type": 3
  },
  "339": { // This field specifies how to interpret each data sample in a pixel.
    "IFD": 1,
    "key": "SampleFormat",
    "type": 3
  },
  "340": { // This field specifies the minimum sample value.
    "IFD": 1,
    "key": "SMinSampleValue",
    "type": 3
  },
  "341": { // This field specifies the maximum sample value.
    "IFD": 1,
    "key": "SMaxSampleValue",
    "type": 3
  },
  "342": { // Expands the range of the TransferFunction
    "IFD": 1,
    "key": "TransferRange",
    "type": 3
  },
  "343": { // A TIFF ClipPath is intended to mirror the essentials of PostScript's path creation functionality.
    "IFD": 1,
    "key": "ClipPath",
    "type": 1
  },
  "344": { // The number of units that span the width of the image, in terms of integer ClipPath coordinates.
    "IFD": 1,
    "key": "XClipPathUnits",
    "type": 8
  },
  "345": { // The number of units that span the height of the image, in terms of integer ClipPath coordinates.
    "IFD": 1,
    "key": "YClipPathUnits",
    "type": 8
  },
  "346": { // Indexed images are images where the 'pixels' do not represent color values, but rather an index (usually 8-bit) into a separate color table, the ColorMap.
    "IFD": 1,
    "key": "Indexed",
    "type": 3
  },
  "347": { // This optional tag may be used to encode the JPEG quantization andHuffman tables for subsequent use by the JPEG decompression process.
    "IFD": 1,
    "key": "JPEGTables",
    "type": 7
  },
  "351": { // OPIProxy gives information concerning whether this image is a low-resolution proxy of a high-resolution image (Adobe OPI).
    "IFD": 1,
    "key": "OPIProxy",
    "type": 3
  },
  "512": { // This field indicates the process used to produce the compressed data
    "IFD": 1,
    "key": "JPEGProc",
    "type": 4
  },
  "513": { // The offset to the start byte (SOI) of JPEG compressed thumbnail data. This is not used for primary image JPEG data.
    "IFD": 1,
    "key": "JPEGInterchangeFormat",
    "type": 4
  },
  "514": { // The number of byte s of JPEG compressed thumbnail data. This is not used for primary image JPEG data. JPEG thumbnails are not divided but are recorded as a continuous JPEG bitstream from SOI to EOI. Appn and COM markers should not be recorded. Compressed thumbnails must be recorded in no more than 64 Kbytes, including all other data to be recorded in APP1."
    "IFD": 1,
    "key": "JPEGInterchangeFormatLength",
    "type": 4
  },
  "515": { // This Field indicates the length of the restart interval used in the compressed image data.
    "IFD": 1,
    "key": "JPEGRestartInterval",
    "type": 3
  },
  "517": { // This Field points to a list of lossless predictor-selection values, one per component.
    "IFD": 1,
    "key": "JPEGLosslessPredictors",
    "type": 3
  },
  "518": { // This Field points to a list of point transform values, one per component.
    "IFD": 1,
    "key": "JPEGPointTransforms",
    "type": 3
  },
  "519": { // This Field points to a list of offsets to the quantization tables, one per component.
    "IFD": 1,
    "key": "JPEGQTables",
    "type": 4
  },
  "520": { // This Field points to a list of offsets to the DC Huffman tables or the lossless Huffman tables, one per component.
    "IFD": 1,
    "key": "JPEGDCTables",
    "type": 4
  },
  "521": { // This Field points to a list of offsets to the Huffman AC tables, one per component.
    "IFD": 1,
    "key": "JPEGACTables",
    "type": 4
  },
  "529": { // The matrix coefficients for transformation from RGB to YCbCr image data. No default is given in TIFF; but here the value given in Appendix E, 'Color Space Guidelines'  is used as the default. The color space is declared in a color space information tag, with the default being the value that gives the optimal image characteristics Interoperability this condition.
    "IFD": 1,
    "key": "YCbCrCoefficients",
    "type": 5
  },
  "530": { // The sampling ratio of chrominance components in relation to the luminance component. In JPEG compressed data a JPEG marker is used instead of this tag.
    "IFD": 1,
    "key": "YCbCrSubSampling",
    "type": 3
  },
  "531": { // The position of chrominance components in relation to the luminance component. This field is designated only for JPEG compressed data or uncompressed YCbCr data. The TIFF default is 1 (centered); but when Y:Cb:Cr = 4:2:2 it is recommended in this standard that 2 (co-sited) be used to record data, in order to improve the image quality when viewed on TV systems. When this field does not exist, the reader shall assume the TIFF default. In the case of Y:Cb:Cr = 4:2:0, the TIFF default (centered) is recommended. If the reader does not have the capability of supporting both kinds of <YCbCrPositioning>, it shall follow the TIFF default regardless of the value in this field. It is preferable that readers be able to support both centered and co-sited positioning.
    "IFD": 1,
    "key": "YCbCrPositioning",
    "type": 3
  },
  "532": { // The reference black point value and reference white point value. No defaults are given in TIFF, but the values below are given as defaults here. The color space is declared in a color space information tag, with the default being the value that gives the optimal image characteristics Interoperability these conditions.
    "IFD": 1,
    "key": "ReferenceBlackWhite",
    "type": 5
  },
  "700": { // XMP Metadata (Adobe technote 9-14-02)
    "IFD": 1,
    "key": "XMLPacket",
    "type": 1
  },
  "18246": { // Rating tag used by Windows
    "IFD": 1,
    "key": "Rating",
    "type": 3
  },
  "18249": { // Rating tag used by Windows, value in percent
    "IFD": 1,
    "key": "RatingPercent",
    "type": 3
  },
  "32781": { // ImageID is the full pathname of the original, high-resolution image, or any other identifying string that uniquely identifies the original image (Adobe OPI).
    "IFD": 1,
    "key": "ImageID",
    "type": 2
  },
  "33421": { // Contains two values representing the minimum rows and columns to define the repeating patterns of the color filter array
    "IFD": 1,
    "key": "CFARepeatPatternDim",
    "type": 3
  },
  "33422": { // Indicates the color filter array (CFA) geometric pattern of the image sensor when a one-chip color area sensor is used. It does not apply to all sensing methods
    "IFD": 1,
    "key": "CFAPattern",
    "type": 1
  },
  "33423": { // Contains a value of the battery level as a fraction or string
    "IFD": 1,
    "key": "BatteryLevel",
    "type": 5
  },
  "33432": { // Copyright information. In this standard the tag is used to indicate both the photographer and editor copyrights. It is the copyright notice of the person or organization claiming rights to the image. The Interoperability copyright statement including date and rights should be written in this field; e.g., 'Copyright, John Smith, 19xx. All rights reserved.'. In this standard the field records both the photographer and editor copyrights, with each recorded in a separate part of the statement. When there is a clear distinction between the photographer and editor copyrights, these are to be written in the order of photographer followed by editor copyright, separated by NULL (in this case since the statement also ends with a NULL, there are two NULL codes). When only the photographer copyright is given, it is terminated by one NULL code . When only the editor copyright is given, the photographer copyright part consists of one space followed by a terminating NULL code, then the editor copyright is given. When the field is left blank, it is treated as unknown.
    "IFD": 1,
    "key": "Copyright",
    "type": 2
  },
  "33434": { // Exposure time, given in seconds (sec).
    "IFD": 2,
    "key": "ExposureTime",
    "type": 5
  },
  "33437": { // The F number.
    "IFD": 2,
    "key": "FNumber",
    "type": 5
  },
  "33723": { // Contains an IPTC/NAA record
    "IFD": 1,
    "key": "IPTCNAA",
    "type": 4
  },
  "34377": { // Contains information embedded by the Adobe Photoshop application
    "IFD": 1,
    "key": "ImageResources",
    "type": 1
  },
  "34665": { // A pointer to the IFD. Interoperability, IFD has the same structure as that of the IFD specified in TIFF. ordinarily, however, it does not contain image data as in the case of TIFF.
    "IFD": 1,
    "key": "ExifTag",
    "type": 4
  },
  "34675": { // Contains an InterColor Consortium (ICC) format color space characterization/profile
    "IFD": 1,
    "key": "InterColorProfile",
    "type": 7
  },
  "34850": { // The class of the program used by the camera to set exposure when the picture is taken.
    "IFD": 2,
    "key": "ExposureProgram",
    "type": 3
  },
  "34852": { // Indicates the spectral sensitivity of each channel of the camera used. The tag value is an ASCII string compatible with the standard developed by the ASTM Technical Committee.
    "IFD": 2,
    "key": "SpectralSensitivity",
    "type": 2
  },
  "34853": { // A pointer to the GPS Info IFD. The Interoperability structure of the GPS Info IFD, like that of IFD, has no image data.
    "IFD": 1,
    "key": "GPSTag",
    "type": 4
  },
  "34855": { // Indicates the ISO Speed and ISO Latitude of the camera or input device as specified in ISO 12232.
    "IFD": 2,
    "key": "ISOSpeedRatings",
    "type": 3
  },
  "34856": { // Indicates the Opto-Electoric Conversion Function (OECF) specified in ISO 14524. <OECF> is the relationship between the camera optical input and the image values.
    "IFD": 2,
    "key": "OECF",
    "type": 7
  },
  "34857": { // Indicates the field number of multifield images.
    "IFD": 1,
    "key": "Interlace",
    "type": 3
  },
  "34858": { // This optional tag encodes the time zone of the camera clock (relativeto Greenwich Mean Time) used to create the DataTimeOriginal tag-valuewhen the picture was taken. It may also contain the time zone offsetof the clock used to create the DateTime tag-value when the image wasmodified.
    "IFD": 1,
    "key": "TimeZoneOffset",
    "type": 8
  },
  "34859": { // Number of seconds image capture was delayed from button press.
    "IFD": 1,
    "key": "SelfTimerMode",
    "type": 3
  },
  "34864": { // The SensitivityType tag indicates PhotographicSensitivity tag. which one of the parameters of ISO12232 is the Although it is an optional tag, it should be recorded when a PhotographicSensitivity tag is recorded. Value = 4, 5, 6, or 7 may be used in case that the values of plural parameters are the same.
    "IFD": 2,
    "key": "SensitivityType",
    "type": 3
  },
  "34865": { // This tag indicates the standard output sensitivity value of a camera or input device defined in ISO 12232. When recording this tag, the PhotographicSensitivity and SensitivityType tags shall also be recorded.
    "IFD": 2,
    "key": "StandardOutputSensitivity",
    "type": 4
  },
  "34866": { // This tag indicates the recommended exposure index value of a camera or input device defined in ISO 12232. When recording this tag, the PhotographicSensitivity and SensitivityType tags shall also be recorded.
    "IFD": 2,
    "key": "RecommendedExposureIndex",
    "type": 4
  },
  "34867": { // This tag indicates the ISO speed value of a camera or input device that is defined in ISO 12232. When recording this tag, the PhotographicSensitivity and SensitivityType tags shall also be recorded.
    "IFD": 2,
    "key": "ISOSpeed",
    "type": 4
  },
  "34868": { // This tag indicates the ISO speed latitude yyy value of a camera or input device that is defined in ISO 12232. However, this tag shall not be recorded without ISOSpeed and ISOSpeedLatitudezzz.
    "IFD": 2,
    "key": "ISOSpeedLatitudeyyy",
    "type": 4
  },
  "34869": { // This tag indicates the ISO speed latitude zzz value of a camera or input device that is defined in ISO 12232. However, this tag shall not be recorded without ISOSpeed and ISOSpeedLatitudeyyy.
    "IFD": 2,
    "key": "ISOSpeedLatitudezzz",
    "type": 4
  },
  "36864": { // The version of this standard supported. Nonexistence of this field is taken to mean nonconformance to the standard.
    "IFD": 2,
    "key": "ExifVersion",
    "type": 7
  },
  "36867": { // The date and time when the original image data was generated. For a digital still camera the date and time the picture was taken are recorded.
    "IFD": 2,
    "key": "DateTimeOriginal",
    "type": 2
  },
  "36868": { // The date and time when the image was stored as digital data.
    "IFD": 2,
    "key": "DateTimeDigitized",
    "type": 2
  },
  "37121": { // Information specific to compressed data. The channels of each component are arranged in order from the 1st component to the 4th. For uncompressed data the data arrangement is given in the <PhotometricInterpretation> tag. However, since <PhotometricInterpretation> can only express the order of Y, Cb and Cr, this tag is provided for cases when compressed data uses components other than Y, Cb, and Cr and to enable support of other sequences.
    "IFD": 2,
    "key": "ComponentsConfiguration",
    "type": 7
  },
  "37122": { // Information specific to compressed data. The compression mode used for a compressed image is indicated in unit bits per pixel.
    "IFD": 2,
    "key": "CompressedBitsPerPixel",
    "type": 5
  },
  "37377": { // Shutter speed. The unit is the APEX (Additive System of Photographic Exposure) setting.
    "IFD": 2,
    "key": "ShutterSpeedValue",
    "type": 10
  },
  "37378": { // The lens aperture. The unit is the APEX value.
    "IFD": 2,
    "key": "ApertureValue",
    "type": 5
  },
  "37379": { // The value of brightness. The unit is the APEX value. Ordinarily it is given in the range of -99.99 to 99.99.
    "IFD": 2,
    "key": "BrightnessValue",
    "type": 10
  },
  "37380": { // The exposure bias. The units is the APEX value. Ordinarily it is given in the range of -99.99 to 99.99.
    "IFD": 2,
    "key": "ExposureBiasValue",
    "type": 10
  },
  "37381": { // The smallest F number of the lens. The unit is the APEX value. Ordinarily it is given in the range of 00.00 to 99.99, but it is not limited to this range.
    "IFD": 2,
    "key": "MaxApertureValue",
    "type": 5
  },
  "37382": { // The distance to the subject, given in meters.
    "IFD": 2,
    "key": "SubjectDistance",
    "type": 5
  },
  "37383": { // The metering mode.
    "IFD": 2,
    "key": "MeteringMode",
    "type": 3
  },
  "37384": { // The kind of light source.
    "IFD": 2,
    "key": "LightSource",
    "type": 3
  },
  "37385": { // This tag is recorded when an image is taken using a strobe light (flash).
    "IFD": 2,
    "key": "Flash",
    "type": 3
  },
  "37386": { // The actual focal length of the lens, in mm. Conversion is not made to the focal length of a 35 mm film camera.
    "IFD": 2,
    "key": "FocalLength",
    "type": 5
  },
  "37387": { // Amount of flash energy (BCPS).
    "IFD": 1,
    "key": "FlashEnergy",
    "type": 5
  },
  "37388": { // SFR of the camera.
    "IFD": 1,
    "key": "SpatialFrequencyResponse",
    "type": 7
  },
  "37389": { // Noise measurement values.
    "IFD": 1,
    "key": "Noise",
    "type": 7
  },
  "37390": { // Number of pixels per FocalPlaneResolutionUnit (37392) in ImageWidth direction for main image.
    "IFD": 1,
    "key": "FocalPlaneXResolution",
    "type": 5
  },
  "37391": { // Number of pixels per FocalPlaneResolutionUnit (37392) in ImageLength direction for main image.
    "IFD": 1,
    "key": "FocalPlaneYResolution",
    "type": 5
  },
  "37392": { // Unit of measurement for FocalPlaneXResolution(37390) and FocalPlaneYResolution(37391).
    "IFD": 1,
    "key": "FocalPlaneResolutionUnit",
    "type": 3
  },
  "37393": { // Number assigned to an image, e.g., in a chained image burst.
    "IFD": 1,
    "key": "ImageNumber",
    "type": 4
  },
  "37394": { // Security classification assigned to the image.
    "IFD": 1,
    "key": "SecurityClassification",
    "type": 2
  },
  "37395": { // Record of what has been done to the image.
    "IFD": 1,
    "key": "ImageHistory",
    "type": 2
  },
  "37396": { // This tag indicates the location and area of the main subject in the overall scene.
    "IFD": 2,
    "key": "SubjectArea",
    "type": 3
  },
  "37397": { // Encodes the camera exposure index setting when image was captured.
    "IFD": 1,
    "key": "ExposureIndex",
    "type": 5
  },
  "37398": { // Contains four ASCII
    "IFD": 1,
    "key": "TIFFEPStandardID",
    "type": 1
  },
  "37399": { // Type of image sensor
    "IFD": 1,
    "key": "SensingMethod",
    "type": 3
  },
  "37500": { // A tag for manufacturers of writers to record any desired information. The contents are up to the manufacturer.
    "IFD": 2,
    "key": "MakerNote",
    "type": 7
  },
  "37510": { // A tag for users to write keywords or comments on the image besides those in <ImageDescription>, and without the character code limitations of the <ImageDescription> tag.
    "IFD": 2,
    "key": "UserComment",
    "type": 2
  },
  "37520": { // A tag used to record fractions of seconds for the <DateTime> tag.
    "IFD": 2,
    "key": "SubSecTime",
    "type": 2
  },
  "37521": { // A tag used to record fractions of seconds for the <DateTimeOriginal> tag.
    "IFD": 2,
    "key": "SubSecTimeOriginal",
    "type": 2,
  },
  "37522": { // A tag used to record fractions of seconds for the <DateTimeDigitized> tag.
    "IFD": 2,
    "key": "SubSecTimeDigitized",
    "type": 2
  },
  "40091": { // Title tag used by Windows, encoded in UCS2
    "IFD": 1,
    "key": "XPTitle",
    "type": 1
  },
  "40092": { // Comment tag used by Windows, encoded in UCS2
    "IFD": 1,
    "key": "XPComment",
    "type": 1
  },
  "40093": { // Author tag used by Windows, encoded in UCS2
    "IFD": 1,
    "key": "XPAuthor",
    "type": 1
  },
  "40094": { // Keywords tag used by Windows, encoded in UCS2
    "IFD": 1,
    "key": "XPKeywords",
    "type": 1
  },
  "40095": { // Subject tag used by Windows, encoded in UCS2
    "IFD": 1,
    "key": "XPSubject",
    "type": 1
  },
  "40960": { // The FlashPix format version supported by a FPXR file.
    "IFD": 2,
    "key": "FlashpixVersion",
    "type": 7
  },
  "40961": { // The color space information tag is always recorded as the color space specifier. Normally sRGB is used to define the color space based on the PC monitor conditions and environment. If a color space other than sRGB is used, Uncalibrated is set. Image data recorded as Uncalibrated can be treated as sRGB when it is converted to FlashPix.
    "IFD": 2,
    "key": "ColorSpace",
    "type": 3
  },
  "40962": { // Information specific to compressed data. When a compressed file is recorded, the valid width of the meaningful image must be recorded in this tag, whether or not there is padding data or a restart marker. This tag should not exist in an uncompressed file.
    "IFD": 2,
    "key": "PixelXDimension",
    "type": 4
  },
  "40963": { // Information specific to compressed data. When a compressed file is recorded, the valid height of the meaningful image must be recorded in this tag, whether or not there is padding data or a restart marker. This tag should not exist in an uncompressed file. Since data padding is unnecessary in the vertical direction, the number of lines recorded in this valid image height tag will in fact be the same as that recorded in the SOF.
    "IFD": 2,
    "key": "PixelYDimension",
    "type": 4
  },
  "40964": { // This tag is used to record the name of an audio file related to the image data. The only relational information recorded here is the audio file name and extension (an ASCII string consisting of 8 characters + '.' + 3 characters). The path is not recorded.
    "IFD": 2,
    "key": "RelatedSoundFile",
    "type": 2
  },
  "40965": { // Interoperability IFD is composed of tags which stores the information to ensure the Interoperability and pointed by the following tag located in IFD. The Interoperability structure of Interoperability IFD is the same as TIFF defined IFD structure but does not contain the image data characteristically compared with normal TIFF IFD.
    "IFD": 2,
    "key": "InteroperabilityTag",
    "type": 4
  },
  "41483": { // Indicates the strobe energy at the time the image is captured, as measured in Beam Candle Power Seconds (BCPS).
    "IFD": 2,
    "key": "FlashEnergy",
    "type": 5
  },
  "41484": { // This tag records the camera or input device spatial frequency table and SFR values in the direction of image width, image height, and diagonal direction, as specified in ISO 12233.
    "IFD": 2,
    "key": "SpatialFrequencyResponse",
    "type": 7
  },
  "41486": { // Indicates the number of pixels in the image width (X) direction per <FocalPlaneResolutionUnit> on the camera focal plane.
    "IFD": 2,
    "key": "FocalPlaneXResolution",
    "type": 5
  },
  "41487": { // Indicates the number of pixels in the image height (V) direction per <FocalPlaneResolutionUnit> on the camera focal plane."
    "IFD": 2,
    "key": "FocalPlaneYResolution",
    "type": 5
  },
  "41488": { // Indicates the unit for measuring <FocalPlaneXResolution> and <FocalPlaneYResolution>. This value is the same as the <ResolutionUnit>.
    "IFD": 2,
    "key": "FocalPlaneResolutionUnit",
    "type": 3
  },
  "41492": { // Indicates the location of the main subject in the scene. The value of this tag represents the pixel at the center of the main subject relative to the left edge, prior to rotation processing as per the <Rotation> tag. The first value indicates the X column number and second indicates the Y row number.
    "IFD": 2,
    "key": "SubjectLocation",
    "type": 3
  },
  "41493": { // Indicates the exposure index selected on the camera or input device at the time the image is captured.
    "IFD": 2,
    "key": "ExposureIndex",
    "type": 5
  },
  "41495": { // Indicates the image sensor type on the camera or input device.
    "IFD": 2,
    "key": "SensingMethod",
    "type": 3
  },
  "41728": { // Indicates the image source. If a DSC recorded the image, this tag value of this tag always be set to 3, indicating that the image was recorded on a DSC.
    "IFD": 2,
    "key": "FileSource",
    "type": 7
  },
  "41729": { // Indicates the type of scene. If a DSC recorded the image, this tag value must always be set to 1, indicating that the image was directly photographed.
    "IFD": 2,
    "key": "SceneType",
    "type": 7
  },
  "41730": { // Indicates the color filter array (CFA) geometric pattern of the image sensor when a one-chip color area sensor is used. It does not apply to all sensing methods.
    "IFD": 2,
    "key": "CFAPattern",
    "type": 7
  },
  "41985": { // This tag indicates the use of special processing on image data, such as rendering geared to output. When special processing is performed, the reader is expected to disable or minimize any further processing.
    "IFD": 2,
    "key": "CustomRendered",
    "type": 3
  },
  "41986": { // This tag indicates the exposure mode set when the image was shot. In auto-bracketing mode, the camera shoots a series of frames of the same scene at different exposure settings.
    "IFD": 2,
    "key": "ExposureMode",
    "type": 3
  },
  "41987": { // This tag indicates the white balance mode set when the image was shot.
    "IFD": 2,
    "key": "WhiteBalance",
    "type": 3
  },
  "41988": { // This tag indicates the digital zoom ratio when the image was shot. If the numerator of the recorded value is 0, this indicates that digital zoom was not used.
    "IFD": 2,
    "key": "DigitalZoomRatio",
    "type": 5
  },
  "41989": { // This tag indicates the equivalent focal length assuming a 35mm film camera, in mm. A value of 0 means the focal length is unknown. Note that this tag differs from the <FocalLength> tag."
    "IFD": 2,
    "key": "FocalLengthIn35mmFilm",
    "type": 3
  },
  "41990": { // This tag indicates the type of scene that was shot. It can also be used to record the mode in which the image was shot. Note that this differs from the <SceneType> tag.
    "IFD": 2,
    "key": "SceneCaptureType",
    "type": 3
  },
  "41991": { // This tag indicates the degree of overall image gain adjustment.
    "IFD": 2,
    "key": "GainControl",
    "type": 3
  },
  "41992": { // This tag indicates the direction of contrast processing applied by the camera when the image was shot.
    "IFD": 2,
    "key": "Contrast",
    "type": 3
  },
  "41993": { // This tag indicates the direction of saturation processing applied by the camera when the image was shot.
    "IFD": 2,
    "key": "Saturation",
    "type": 3
  },
  "41994": { // This tag indicates the direction of sharpness processing applied by the camera when the image was shot.
    "IFD": 2,
    "key": "Sharpness",
    "type": 3
  },
  "41995": { // This tag indicates information on the picture-taking conditions of a particular camera model. The tag is used only to indicate the picture-taking conditions in the reader."
    "IFD": 2,
    "key": "DeviceSettingDescription",
    "type": 7
  },
  "41996": { // This tag indicates the distance to the subject.
    "IFD": 2,
    "key": "SubjectDistanceRange",
    "type": 3
  },
  "42016": { // This tag indicates an identifier assigned uniquely to each image. It is recorded as an ASCII string equivalent to hexadecimal notation and 128-bit fixed length.
    "IFD": 2,
    "key": "ImageUniqueID",
    "type": 2
  },
  "42032": { // This tag records the owner of a camera used in photography as an ASCII string.
    "IFD": 2,
    "key": "CameraOwnerName",
    "type": 2
  },
  "42033": { // This tag records the serial number of the body of the camera that was used in photography as an ASCII string.
    "IFD": 2,
    "key": "BodySerialNumber",
    "type": 2
  },
  "42034": { // This tag notes minimum focal length, maximum focal length, minimum F number in the minimum focal length, and minimum F number in the maximum focal length, which are specification information for the lens that was used in photography. When the minimum F number is unknown, the notation is 0/0
    "IFD": 2,
    "key": "LensSpecification",
    "type": 5
  },
  "42035": { // This tag records the lens manufactor as an ASCII string.
    "IFD": 2,
    "key": "LensMake",
    "type": 2
  },
  "42036": { // This tag records the lens's model name and model number as an,ASCII string.
    "IFD": 2,
    "key": "LensModel",
    "type": 2
  },
  "42037": { // This tag records the serial number of the interchangeable lens that was used in photography as an ASCII string.
    "IFD": 2,
    "key": "LensSerialNumber",
    "type": 2
  },
  "50341": { // Print Image Matching, description needed.
    "IFD": 1,
    "key": "PrintImageMatching",
    "type": 7
  },
  "50706": { // This tag encodes the DNG four-tier version number. For files compliant with version 1.1.0.0 of the DNG specification, this tag should contain the Byte s: 1, 1, 0, 0.
    "IFD": 1,
    "key": "DNGVersion",
    "type": 1
  },
  "50707": { // This tag specifies the oldest version of the Digital Negative specification for which a file is compatible. Readers shouldnot attempt to read a file if this tag specifies a version number that is higher than the version number of the specification the reader was based on. In addition to checking the version tags, readers should, for all tags, check the types, counts, and values, to verify it is able to correctly read the file.
    "IFD": 1,
    "key": "DNGBackwardVersion",
    "type": 1
  },
  "50708": { // Defines a unique, non-localized name for the camera model that created the image in the raw file. This name should include the manufacturer's name to avoid conflicts, and should not be localized, even if the camera name itself is localized for different markets (see LocalizedCameraModel). This string may be used by reader software to index into per-model preferences and replacement profiles.
    "IFD": 1,
    "key": "UniqueCameraModel",
    "type": 2
  },
  "50709": { // Similar to the UniqueCameraModel field, except the name can be localized for different markets to match the localization of the camera name.
    "IFD": 1,
    "key": "LocalizedCameraModel",
    "type": 1
  },
  "50710": { // Provides a mapping between the values in the CFAPattern tag and the plane numbers in LinearRaw space. This is a required tag for non-RGB CFA images.
    "IFD": 1,
    "key": "CFAPlaneColor",
    "type": 1,
  },
  "50711": { // Describes the spatial layout of the CFA.
    "IFD": 1,
    "key": "CFALayout",
    "type": 3,
  },
  "50712": { // Describes a lookup table that maps stored values into linear values. This tag is typically used to increase compression ratios by storing the raw data in a non-linear, more visually uniform space with fewer total encoding levels. If SamplesPerPixel is not equal to one, this single table applies to all the samples for each pixel.
    "IFD": 1,
    "key": "LinearizationTable",
    "type": 3,
  },
  "50713": { // Specifies repeat pattern size for the BlackLevel tag.
    "IFD": 1,
    "key": "BlackLevelRepeatDim",
    "type": 3
  },
  "50714": { // Specifies the zero light (a.k.a. thermal black or black current) encoding level, as a repeating pattern. The origin of this pattern is the top-left corner of the ActiveArea rectangle. The values are stored in row-column-sample scan order.
    "IFD": 1,
    "key": "BlackLevel",
    "type": 5
  },
  "50715": { // If the zero light encoding level is a function of the image column, BlackLevelDeltaH specifies the difference between the zero light encoding level for each column and the baseline zero light encoding level. If SamplesPerPixel is not equal to one, this single table applies to all the samples for each pixel.
    "IFD": 1,
    "key": "BlackLevelDeltaH",
    "type": 10
  },
  "50716": { // If the zero light encoding level is a function of the image row, this tag specifies the difference between the zero light encoding level for each row and the baseline zero light encoding level. If SamplesPerPixel is not equal to one, this single table applies to all the samples for each pixel.
    "IFD": 1,
    "key": "BlackLevelDeltaV",
    "type": 10
  },
  "50717": { // This tag specifies the fully saturated encoding level for the raw sample values. Saturation is caused either by the sensor itself becoming highly non-linear in response, or by the camera's analog to digital converter clipping.
    "IFD": 1,
    "key": "WhiteLevel",
    "type": 3
  },
  "50718": { // DefaultScale is required for cameras with non-square pixels. It specifies the default scale factors for each direction to convert the image to square pixels. Typically these factors are selected to approximately preserve total pixel count. For CFA images that use CFALayout equal to 2, 3, 4, or 5, such as the Fujifilm SuperCCD, these two values should usually differ by a factor of 2.0.
    "IFD": 1,
    "key": "DefaultScale",
    "type": 5,
  },
  "50719": { // Raw images often store extra pixels around the edges of the final image. These extra pixels help prevent interpolation artifacts near the edges of the final image. DefaultCropOrigin specifies the origin of the final image area, in raw image coordinates (i.e., before the DefaultScale has been applied), relative to the top-left corner of the ActiveArea rectangle.
    "IFD": 1,
    "key": "DefaultCropOrigin",
    "type": 3
  },
  "50720": { // Raw images often store extra pixels around the edges of the final image. These extra pixels help prevent interpolation artifacts near the edges of the final image. DefaultCropSize specifies the size of the final image area, in raw image coordinates (i.e., before the DefaultScale has been applied).
    "IFD": 1,
    "key": "DefaultCropSize",
    "type": 3
  },
  "50721": { // ColorMatrix1 defines a transformation matrix that converts XYZ values to reference camera native color space values, under the first calibration illuminant. The matrix values are stored in row scan order. The ColorMatrix1 tag is required for all non-monochrome DNG files.
    "IFD": 1,
    "key": "ColorMatrix1",
    "type": 10
  },
  "50722": { // ColorMatrix2 defines a transformation matrix that converts XYZ values to reference camera native color space values, under the second calibration illuminant. The matrix values are stored in row scan order.
    "IFD": 1,
    "key": "ColorMatrix2",
    "type": 10
  },
  "50723": { // CameraClalibration1 defines a calibration matrix that transforms reference camera native space values to individual camera native space values under the first calibration illuminant. The matrix is stored in row scan order. This matrix is stored separately from the matrix specified by the ColorMatrix1 tag to allow raw converters to swap in replacement color matrices based on UniqueCameraModel tag, while still taking advantage of any per-individual camera calibration performed by the camera manufacturer.
    "IFD": 1,
    "key": "CameraCalibration1",
    "type": 10
  },
  "50724": { // CameraCalibration2 defines a calibration matrix that transforms reference camera native space values to individual camera native space values under the second calibration illuminant. The matrix is stored in row scan order. This matrix is stored separately from the matrix specified by the ColorMatrix2 tag to allow raw converters to swap in replacement color matrices based on UniqueCameraModel tag, while still taking advantage of any per-individual camera calibration performed by the camera manufacturer.
    "IFD": 1,
    "key": "CameraCalibration2",
    "type": 10
  },
  "50725": { // ReductionMatrix1 defines a dimensionality reduction matrix for use as the first stage in converting color camera native space values to XYZ values, under the first calibration illuminant. This tag may only be used if ColorPlanes is greater than 3. The matrix is stored in row scan order.

    "IFD": 1,
    "key": "ReductionMatrix1",
    "type": 10
  },
  "50726": { // ReductionMatrix2 defines a dimensionality reduction matrix for use as the first stage in converting color camera native space values to XYZ values, under the second calibration illuminant. This tag may only be used if ColorPlanes is greater than 3. The matrix is stored in row scan order.
    "IFD": 1,
    "key": "ReductionMatrix2",
    "type": 10
  },
  "50727": { // Normally the stored raw values are not white balanced, since any digital white balancing will reduce the dynamic range of the final image if the user decides to later adjust the white balance; however, if camera hardware is capable of white balancing the color channels before the signal is digitized, it can improve the dynamic range of the final image. AnalogBalance defines the gain, either analog (recommended) or digital (not recommended) that has been applied the stored raw values.
    "IFD": 1,
    "key": "AnalogBalance",
    "type": 5
  },
  "50728": { // Specifies the selected white balance at time of capture, encoded as the coordinates of a perfectly neutral color in linear reference space values. The inclusion of this tag precludes the inclusion of the AsShotWhiteXY tag.
    "IFD": 1,
    "key": "AsShotNeutral",
    "type": 3
  },
  "50729": { // Specifies the selected white balance at time of capture, encoded as x-y chromaticity coordinates. The inclusion of this tag precludes the inclusion of the AsShotNeutral tag.

    "IFD": 1,
    "key": "AsShotWhiteXY",
    "type": 5
  },
  "50730": { // Camera models vary in the trade-off they make between highlight headroom and shadow noise. Some leave a significant amount of highlight headroom during a normal exposure. This allows significant negative exposure compensation to be applied during raw conversion, but also means normal exposures will contain more shadow noise. Other models leave less headroom during normal exposures. This allows for less negative exposure compensation, but results in lower shadow noise for normal exposures. Because of these differences, a raw converter needs to vary the zero point of its exposure compensation control from model to model. BaselineExposure specifies by how much (in EV units) to move the zero point. Positive values result in brighter default results, while negative values result in darker default results."
    "IFD": 1,
    "key": "BaselineExposure",
    "type": 10
  },
  "50731": { // Specifies the relative noise level of the camera model at a baseline ISO value of 100, compared to a reference camera model. Since noise levels tend to vary approximately with the square root of the ISO value, a raw converter can use this value, combined with the current ISO, to estimate the relative noise level of the current image.
    "IFD": 1,
    "key": "BaselineNoise",
    "type": 5
  },
  "50732": { // Specifies the relative amount of sharpening required for this camera model, compared to a reference camera model. Camera models vary in the strengths of their anti-aliasing filters. Cameras with weak or no filters require less sharpening than cameras with strong anti-aliasing filters.

    "IFD": 1,
    "key": "BaselineSharpness",
    "type": 5
  },
  "50733": { // Only applies to CFA images using a Bayer pattern filter array. This tag specifies, in arbitrary units, how closely the values of the green pixels in the blue/green rows track the values of the green pixels in the red/green rows. A value of zero means the two kinds of green pixels track closely, while a non-zero value means they sometimes diverge. The useful range for this tag is from 0 (no divergence) to about 5000 (quite large divergence).
    "IFD": 1,
    "key": "BayerGreenSplit",
    "type": 4
  },
  "50734": { // Some sensors have an unpredictable non-linearity in their response as they near the upper limit of their encoding range. This non-linearity results in color shifts in the highlight areas of the resulting image unless the raw converter compensates for this effect. LinearResponseLimit specifies the fraction of the encoding range above which the response may become significantly non-linear.
    "IFD": 1,
    "key": "LinearResponseLimit",
    "type": 5
  },
  "50735": { // CameraSerialNumber contains the serial number of the camera or camera body that captured the image.
    "IFD": 1,
    "key": "CameraSerialNumber",
    "type": 2
  },
  "50736": { // Contains information about the lens that captured the image. If the minimum f-stops are unknown, they should be encoded as 0/0.
    "IFD": 1,
    "key": "LensInfo",
    "type": 5
  },
  "50737": { // ChromaBlurRadius provides a hint to the DNG reader about how much chroma blur should be applied to the image. If this tag is omitted, the reader will use its default amount of chroma blurring. Normally this tag is only included for non-CFA images, since the amount of chroma blur required for mosaic images is highly dependent on the de-mosaic algorithm, in which case the DNG reader's default value is likely optimized for its particular de-mosaic algorithm.
    "IFD": 1,
    "key": "ChromaBlurRadius",
    "type": 5
  },
  "50738": { // Provides a hint to the DNG reader about how strong the camera's anti-alias filter is. A value of 0.0 means no anti-alias filter (i.e., the camera is prone to aliasing artifacts with some subjects), while a value of 1.0 means a strong anti-alias filter (i.e., the camera almost never has aliasing artifacts).
    "IFD": 1,
    "key": "AntiAliasStrength",
    "type": 5
  },
  "50739": { // This tag is used by Adobe Camera Raw to control the sensitivity of its 'Shadows' slider.

    "IFD": 1,
    "key": "ShadowScale",
    "type": 10
  },
  "50740": { // Provides a way for camera manufacturers to store private data in the DNG file for use by their own raw converters, and to have that data preserved by programs that edit DNG files.
    "IFD": 1,
    "key": "DNGPrivateData",
    "type": 1
  },
  "50741": { // MakerNoteSafety lets the DNG reader know whether the MakerNote tag is safe to preserve aLONG with the rest of the data. File browsers and other image management software processing an image with a preserved MakerNote should be aware that any thumbnail image embedded in the MakerNote may be stale, and may not reflect the current state of the full size image."
    "IFD": 1,
    "key": "MakerNoteSafety",
    "type": 3
  },
  "50778": { // The illuminant used for the first set of color calibration tags (ColorMatrix1, CameraCalibration1, ReductionMatrix1). The legal values for this tag are the same as the legal values for the LightSource tag.
    "IFD": 1,
    "key": "CalibrationIlluminant1",
    "type": 3
  },
  "50779": { // The illuminant used for an optional second set of color calibration tags (ColorMatrix2, CameraCalibration2, ReductionMatrix2). The legal values for this tag are the same as the legal values for the CalibrationIlluminant1 tag; however, if both are included, neither is allowed to have a value of 0 (unknown).
    "IFD": 1,
    "key": "CalibrationIlluminant2",
    "type": 3
  },
  "50780": { // For some cameras, the best possible image quality is not achieved by preserving the total pixel count during conversion. For example, Fujifilm SuperCCD images have maximum detail when their total pixel count is doubled. This tag specifies the amount by which the values of the DefaultScale tag need to be multiplied to achieve the best quality image size.
    "IFD": 1,
    "key": "BestQualityScale",
    "type": 5
  },
  "50781": { // This tag contains a 16-byte unique identifier for the raw image data in the DNG file. DNG readers can use this tag to recognize a particular raw image, even if the file's name or the metadata contained in the file has been changed. If a DNG writer creates such an identifier, it should do so using an algorithm that will ensure that it is very unlikely two different images will end up having the same identifier.
    "IFD": 1,
    "key": "RawDataUniqueID",
    "type": 1
  },
  "50827": { // If the DNG file was converted from a non-DNG raw file, then this tag contains the file name of that original raw file.
    "IFD": 1,
    "key": "OriginalRawFileName",
    "type": 1
  },
  "50828": { // If the DNG file was converted from a non-DNG raw file, then this tag contains the compressed contents of that original raw file. The contents of this tag always use the big-endian byte  order. The tag contains a sequence of data blocks. Future versions of the DNG specification may define additional data blocks, so DNG readers should ignore extra byte s when parsing this tag. DNG readers should also detect the case where data blocks are missing from the end of the sequence, and should assume a default value for all the missing blocks. There are no padding or alignment byte s between data blocks.
    "IFD": 1,
    "key": "OriginalRawFileData",
    "type": 7
  },
  "50829": { // This rectangle defines the active (non-masked) pixels of the sensor. The order of the rectangle coordinates is: top, left, bottom, right.
    "IFD": 1,
    "key": "ActiveArea",
    "type": 3
  },
  "50830": { // This tag contains a list of non-overlapping rectangle coordinates of fully masked pixels, which can be optionally used by DNG readers to measure the black encoding level. The order of each rectangle's coordinates is: top, left, bottom, right. If the raw image data has already had its black encoding level subtracted, then this tag should not be used, since the masked pixels are no LONGer useful.
    "IFD": 1,
    "key": "MaskedAreas",
    "type": 3
  },
  "50831": { // This tag contains an ICC profile that, in conjunction with the AsShotPreProfileMatrix tag, provides the camera manufacturer with a way to specify a default color rendering from camera color space coordinates (linear reference values) into the ICC profile connection space. The ICC profile connection space is an output referred colorimetric space, whereas the other color calibration tags in DNG specify a conversion into a scene referred colorimetric space. This means that the rendering in this profile should include any desired tone and gamut mapping needed to convert between scene referred values and output referred values.
    "IFD": 1,
    "key": "AsShotICCProfile",
    "type": 7
  },
  "50832": { // This tag is used in conjunction with the AsShotICCProfile tag. It specifies a matrix that should be applied to the camera color space coordinates before processing the values through the ICC profile specified in the AsShotICCProfile tag. The matrix is stored in the row scan order. If ColorPlanes is greater than three, then this matrix can (but is not required to) reduce the dimensionality of the color data down to three components, in which case the AsShotICCProfile should have three rather than ColorPlanes input components.
    "IFD": 1,
    "key": "AsShotPreProfileMatrix",
    "type": 10
  },
  "50833": { // This tag is used in conjunction with the CurrentPreProfileMatrix tag. The CurrentICCProfile and CurrentPreProfileMatrix tags have the same purpose and usage as the AsShotICCProfile and AsShotPreProfileMatrix tag pair, except they are for use by raw file editors rather than camera manufacturers.
    "IFD": 1,
    "key": "CurrentICCProfile",
    "type": 7
  },
  "50834": { // This tag is used in conjunction with the CurrentICCProfile tag. The CurrentICCProfile and CurrentPreProfileMatrix tags have the same purpose and usage as the AsShotICCProfile and AsShotPreProfileMatrix tag pair, except they are for use by raw file editors rather than camera manufacturers.
    "IFD": 1,
    "key": "CurrentPreProfileMatrix",
    "type": 10
  },
  "50879": { // The DNG color model documents a transform between camera colors and CIE XYZ values. This tag describes the colorimetric reference for the CIE XYZ values. 0 = The XYZ values are scene-referred. 1 = The XYZ values are output-referred, using the ICC profile perceptual dynamic range. This tag allows output-referred data to be stored in DNG files and still processed correctly by DNG readers.
    "IFD": 1,
    "key": "ColorimetricReference",
    "type": 3
  },
  "50931": { // A UTF-8 encoded string associated with the CameraCalibration1 and CameraCalibration2 tags. The CameraCalibration1 and CameraCalibration2 tags should only be used in the DNG color transform if the string stored in the CameraCalibrationSignature tag exactly matches the string stored in the ProfileCalibrationSignature tag for the selected camera profile.
    "IFD": 1,
    "key": "CameraCalibrationSignature",
    "type": 1
  },
  "50932": { // A UTF-8 encoded string associated with the camera profile tags. The CameraCalibration1 and CameraCalibration2 tags should only be used in the DNG color transfer if the string stored in the CameraCalibrationSignature tag exactly matches the string stored in the ProfileCalibrationSignature tag for the selected camera profile.
    "IFD": 1,
    "key": "ProfileCalibrationSignature",
    "type": 1
  },
  "50934": { // A UTF-8 encoded string containing the name of the 'as shot' camera profile, if any."
    "IFD": 1,
    "key": "AsShotProfileName",
    "type": 1
  },
  "50935": { // This tag indicates how much noise reduction has been applied to the raw data on a scale of 0.0 to 1.0. A 0.0 value indicates that no noise reduction has been applied. A 1.0 value indicates that the 'ideal' amount of noise reduction has been applied, i.e. that the DNG reader should not apply additional noise reduction by default. A value of 0/0 indicates that this parameter is unknown.
    "IFD": 1,
    "key": "NoiseReductionApplied",
    "type": 5
  },
  "50936": { // A UTF-8 encoded string containing the name of the camera profile. This tag is optional if there is only a single camera profile stored in the file but is required for all camera profiles if there is more than one camera profile stored in the file.
    "IFD": 1,
    "key": "ProfileName",
    "type": 1
  },
  "50937": { // This tag specifies the number of input samples in each dimension of the hue/saturation/value mapping tables. The data for these tables are stored in ProfileHueSatMapData1 and ProfileHueSatMapData2 tags. The most common case has ValueDivisions equal to 1, so only hue and saturation are used as inputs to the mapping table.
    "IFD": 1,
    "key": "ProfileHueSatMapDims",
    "type": 4
  },
  "50938": { // This tag contains the data for the first hue/saturation/value mapping table. Each entry of the table contains three 32-bit IEEE floating-point values. The first entry is hue shift in degrees; the second entry is saturation scale factor; and the third entry is a value scale factor. The table entries are stored in the tag in nested loop order, with the value divisions in the outer loop, the hue divisions in the middle loop, and the saturation divisions in the inner loop. All zero input saturation entries are required to have a value scale factor of 1.0.
    "IFD": 1,
    "key": "ProfileHueSatMapData1",
    "type": 11
  },
  "50939": { // This tag contains the data for the second hue/saturation/value mapping table. Each entry of the table contains three 32-bit IEEE floating-point values. The first entry is hue shift in degrees; the second entry is a saturation scale factor; and the third entry is a value scale factor. The table entries are stored in the tag in nested loop order, with the value divisions in the outer loop, the hue divisions in the middle loop, and the saturation divisions in the inner loop. All zero input saturation entries are required to have a value scale factor of 1.0.
    "IFD": 1,
    "key": "ProfileHueSatMapData2",
    "type": 11
  },
  "50940": { // This tag contains a default tone curve that can be applied while processing the image as a starting point for user adjustments. The curve is specified as a list of 32-bit IEEE floating-point value pairs in linear gamma. Each sample has an input value in the range of 0.0 to 1.0, and an output value in the range of 0.0 to 1.0. The first sample is required to be (0.0, 0.0), and the last sample is required to be (1.0, 1.0). Interpolated the curve using a cubic spline.
    "IFD": 1,
    "key": "ProfileToneCurve",
    "type": 11
  },
  "50941": { // This tag contains information about the usage rules for the associated camera profile.
    "IFD": 1,
    "key": "ProfileEmbedPolicy",
    "type": 4
  },
  "50942": { // A UTF-8 encoded string containing the copyright information for the camera profile. This string always should be preserved aLONG with the other camera profile tags.
    "IFD": 1,
    "key": "ProfileCopyright",
    "type": 1
  },
  "50964": { // This tag defines a matrix that maps white balanced camera colors to XYZ D50 colors.
    "IFD": 1,
    "key": "ForwardMatrix1",
    "type": 10
  },
  "50965": { // This tag defines a matrix that maps white balanced camera colors to XYZ D50 colors.
    "IFD": 1,
    "key": "ForwardMatrix2",
    "type": 10
  },
  "50966": { // A UTF-8 encoded string containing the name of the application that created the preview stored in the IFD.
    "IFD": 1,
    "key": "PreviewApplicationName",
    "type": 1
  },
  "50967": { // A UTF-8 encoded string containing the version number of the application that created the preview stored in the IFD.

    "IFD": 1,
    "key": "PreviewApplicationVersion",
    "type": 1
  },
  "50968": { // A UTF-8 encoded string containing the name of the conversion settings (for example, snapshot name) used for the preview stored in the IFD.

    "IFD": 1,
    "key": "PreviewSettingsName",
    "type": 1
  },
  "50969": { // A unique ID of the conversion settings (for example, MD5 digest) used to render the preview stored in the IFD.
    "IFD": 1,
    "key": "PreviewSettingsDigest",
    "type": 1
  },
  "50970": { // This tag specifies the color space in which the rendered preview in this IFD is stored. The default value for this tag is sRGB for color previews and Gray Gamma 2.2 for monochrome previews.
    "IFD": 1,
    "key": "PreviewColorSpace",
    "type": 4
  },
  "50971": { // This tag is an ASCII string containing the name of the date/time at which the preview stored in the IFD was rendered. The date/time is encoded using ISO 8601 format.
    "IFD": 1,
    "key": "PreviewDateTime",
    "type": 2
  },
  "50972": { // This tag is an MD5 digest of the raw image data. All pixels in the image are processed in row-scan order. Each pixel is zero padded to 16 or 32 bits deep (16-bit for data less than or equal to 16 bits deep, 32-bit otherwise). The data for each pixel is processed in little-endian, byte order.
    "IFD": 1,
    "key": "RawImageDigest",
    "type": 7
  },
  "50973": { // This tag is an MD5 digest of the data stored in the OriginalRawFileData tag.
    "IFD": 1,
    "key": "OriginalRawFileDigest",
    "type": 7
  },
  "50974": { // Normally the pixels within a tile are stored in simple row-scan order. This tag specifies that the pixels within a tile should be grouped first into rectangular blocks of the specified size. These blocks are stored in row-scan order. Within each block, the pixels are stored in row-scan order. The use of a non-default value for this tag requires setting the DNGBackwardVersion tag to at least 1.2.0.0.
    "IFD": 1,
    "key": "SubTileBlockSize",
    "type": 4
  },
  "50975": { // This tag specifies that rows of the image are stored in interleaved order. The value of the tag specifies the number of interleaved fields. The use of a non-default value for this tag requires setting the DNGBackwardVersion tag to at least 1.2.0.0.
    "IFD": 1,
    "key": "RowInterleaveFactor",
    "type": 4
  },
  "50981": { // This tag specifies the number of input samples in each dimension of a default 'look' table. The data for this table is stored in the ProfileLookTableData tag.
    "IFD": 1,
    "key": "ProfileLookTableDims",
    "type": 4
  },
  "50982": { // This tag contains a default 'look' table that can be applied while processing the image as a starting point for user adjustment. This table uses the same format as the tables stored in the ProfileHueSatMapData1 and ProfileHueSatMapData2 tags, and is applied in the same color space. However, it should be applied later in the processing pipe, after any exposure compensation and/or fill light stages, but before any tone curve stage. Each entry of the table contains three 32-bit IEEE floating-point values. The first entry is hue shift in degrees, the second entry is a saturation scale factor, and the third entry is a value scale factor. The table entries are stored in the tag in nested loop order, with the value divisions in the outer loop, the hue divisions in the middle loop, and the saturation divisions in the inner loop. All zero input saturation entries are required to have a value scale factor of 1.0.
    "IFD": 1,
    "key": "ProfileLookTableData",
    "type": 11
  },
  "51008": { // Specifies the list of opcodes that should be applied to the raw image, as read directly from the file.
    "IFD": 1,
    "key": "OpcodeList1",
    "type": 7,
  },
  "51009": { // Specifies the list of opcodes that should be applied to the raw image, just after it has been mapped to linear reference values.
    "IFD": 1,
    "key": "OpcodeList2",
    "type": 7
  },
  "51022": { // Specifies the list of opcodes that should be applied to the raw image, just after it has been demosaiced.
    "IFD": 1,
    "key": "OpcodeList3",
    "type": 7
  },
  "51041": { // NoiseProfile describes the amount of noise in a raw image. Specifically, this tag models the amount of signal-dependent photon (shot) noise and signal-independent sensor readout noise, two common sources of noise in raw images. The model assumes that the noise is white and spatially independent, ignoring fixed pattern effects and other sources of noise (e.g., pixel response non-uniformity, spatially-dependent thermal effects, etc.).
    "IFD": 1,
    "key": "NoiseProfile",
    "type": 12
  }
};

// Text representation for the different tag values
var tagsStringValues = {
  "ExposureProgram" : {
    0 : "Not defined",
    1 : "Manual",
    2 : "Normal program",
    3 : "Aperture priority",
    4 : "Shutter priority",
    5 : "Creative program",
    6 : "Action program",
    7 : "Portrait mode",
    8 : "Landscape mode"
  },
  "MeteringMode" : {
    0 : "Unknown",
    1 : "Average",
    2 : "CenterWeightedAverage",
    3 : "Spot",
    4 : "MultiSpot",
    5 : "Pattern",
    6 : "Partial",
    255 : "Other"
  },
  "LightSource" : {
    0 : "Unknown",
    1 : "Daylight",
    2 : "Fluorescent",
    3 : "Tungsten (incandescent light)",
    4 : "Flash",
    9 : "Fine weather",
    10 : "Cloudy weather",
    11 : "Shade",
    12 : "Daylight fluorescent (D 5700 - 7100K)",
    13 : "Day white fluorescent (N 4600 - 5400K)",
    14 : "Cool white fluorescent (W 3900 - 4500K)",
    15 : "White fluorescent (WW 3200 - 3700K)",
    17 : "Standard light A",
    18 : "Standard light B",
    19 : "Standard light C",
    20 : "D55",
    21 : "D65",
    22 : "D75",
    23 : "D50",
    24 : "ISO studio tungsten",
    255 : "Other"
  },
  "Flash" : {
    0x0000 : "Flash did not fire",
    0x0001 : "Flash fired",
    0x0005 : "Strobe return light not detected",
    0x0007 : "Strobe return light detected",
    0x0009 : "Flash fired, compulsory flash mode",
    0x000D : "Flash fired, compulsory flash mode, return light not detected",
    0x000F : "Flash fired, compulsory flash mode, return light detected",
    0x0010 : "Flash did not fire, compulsory flash mode",
    0x0018 : "Flash did not fire, auto mode",
    0x0019 : "Flash fired, auto mode",
    0x001D : "Flash fired, auto mode, return light not detected",
    0x001F : "Flash fired, auto mode, return light detected",
    0x0020 : "No flash function",
    0x0041 : "Flash fired, red-eye reduction mode",
    0x0045 : "Flash fired, red-eye reduction mode, return light not detected",
    0x0047 : "Flash fired, red-eye reduction mode, return light detected",
    0x0049 : "Flash fired, compulsory flash mode, red-eye reduction mode",
    0x004D : "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
    0x004F : "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
    0x0059 : "Flash fired, auto mode, red-eye reduction mode",
    0x005D : "Flash fired, auto mode, return light not detected, red-eye reduction mode",
    0x005F : "Flash fired, auto mode, return light detected, red-eye reduction mode"
  },
  "SensingMethod" : {
    1 : "Not defined",
    2 : "One-chip color area sensor",
    3 : "Two-chip color area sensor",
    4 : "Three-chip color area sensor",
    5 : "Color sequential area sensor",
    7 : "Trilinear sensor",
    8 : "Color sequential linear sensor"
  },
  "SceneCaptureType" : {
    0 : "Standard",
    1 : "Landscape",
    2 : "Portrait",
    3 : "Night scene"
  },
  "SceneType" : {
    1 : "Directly photographed"
  },
  "CustomRendered" : {
    0 : "Normal process",
    1 : "Custom process"
  },
  "WhiteBalance" : {
    0 : "Auto white balance",
    1 : "Manual white balance"
  },
  "GainControl" : {
    0 : "None",
    1 : "Low gain up",
    2 : "High gain up",
    3 : "Low gain down",
    4 : "High gain down"
  },
  "Contrast" : {
    0 : "Normal",
    1 : "Soft",
    2 : "Hard"
  },
  "Saturation" : {
    0 : "Normal",
    1 : "Low saturation",
    2 : "High saturation"
  },
  "Sharpness" : {
    0 : "Normal",
    1 : "Soft",
    2 : "Hard"
  },
  "SubjectDistanceRange" : {
    0 : "Unknown",
    1 : "Macro",
    2 : "Close view",
    3 : "Distant view"
  },
  "FileSource" : {
    3 : "DSC"
  },
  "Components" : {
    0 : "",
    1 : "Y",
    2 : "Cb",
    3 : "Cr",
    4 : "R",
    5 : "G",
    6 : "B"
  }
};

// Mapping between orientation flag values and clockwise rotations in degrees
var orientationDegrees = {
  "1" : 0,
  "2" : 0,
  "3" : 180,
  "4" : 180,
  "5" : 90,
  "6" : 90,
  "7" : 270,
  "8" : 270
};

var rotateImage = function(orientation, degrees) {
  var clockWiseRotation = {
    1: 6, 2: 5,
    3: 8, 4: 7,
    5: 4, 6: 3,
    7: 2, 8: 1
  };
  var counterClockWiseRotation = {
    1: 8, 2: 7,
    3: 6, 4: 5,
    5: 2, 6: 1,
    7: 4, 8: 3
  };
  var steps = Math.abs(Math.ceil(degrees / 90));
  var clockWise = degrees > 0;
  while(steps > 0) {
    orientation = clockWise? clockWiseRotation[orientation] : counterClockWiseRotation[orientation];
    steps--;
  }
  return orientation;
};

var getTagId = function(key) {
  var id;
  Object.keys(tags).forEach(function(tagId) {
    if (tags[tagId].key === key) {
      id = tagId;
    }
  });
  return id;
};

this.JPEG = this.JPEG || {};
this.JPEG.exifSpec = {
  rotateImage: rotateImage,
  orientationDegrees: orientationDegrees,
  getTagId: getTagId,
  tags: tags,
  interOperabilityTags: interOperabilityTags,
  tagTypeSize: tagTypeSize
};

}).call(this);

 (function() {

  'use strict';

  // Segment types identified by their markers
  var segmentTypes = {  // Start Of Frame
    0x01 : "TEM",  // TEMporary
    0x02 : "RES",  // REServed ... (2-191) 0x02-0xbf
    0xc0 : "SOF0", 0xc1 : "SOF1", 0xc2 : "SOF2",
    0xc3 : "SOF3", 0xc5 : "SOF5", 0xc6 : "SOF6",
    0xc7 : "SOF7", 0xc9 : "SOF8", 0xca : "SOF10",
    0xcb : "SOF11", 0xcd : "SOF13", 0xce : "SOF14",
    0xcf : "SOF15",
    0xcc : "DAC",  // Define Arithmetic Coding
    0xc4 : "DHT",  // Define Huffman Table
    0xd0 : "RST0", 0xd1 : "RST1", 0xd2 : "RST2",
    0xd3 : "RST3", 0xd4 : "RST4", 0xd5 : "RST5",
    0xd6 : "RST6", 0xd7 : "RST7", // ReSTart Marker
    0xd8 : "SOI",  // Start Of Image
    0xd9 : "EOI",  // End Of Image
    0xda : "SOS",  // Start Of Scan
    0xdb : "DQT",  // Define Quantization Table
    0xdc : "DNL",  // Define Number of Lines
    0xdd : "DRI",  // Define Restart Interval
    0xde : "DHP",  // Define Hierarichal Progression
    0xdf : "EXP",  // EXPand reference compnent
    0xe0 : "APP0", // APPlication segments
    0xe1 : "APP1",
    0xe2 : "APP2",
    0xe3 : "APP3",
    0xe4 : "APP4",
    0xe5 : "APP5",
    0xe6 : "APP6",
    0xe7 : "APP7",
    0xe8 : "APP8",
    0xe9 : "APP9",
    0xea : "APP10",
    0xeb : "APP11",
    0xec : "APP12",
    0xed : "APP13",
    0xee : "APP14",
    0xef : "APP15",
    0xf0 : "JPG0", 0xf1 : "JPG1", 0xf2 : "JPG2", // Jpeg extensions
    0xf3 : "JPG3", 0xf4 : "JPG4", 0xf5 : "JPG5",
    0xf6 : "JPG6", 0xf7 : "JPG7", 0xf8 : "JPG8",
    0xf9 : "JPG9", 0xfa : "JPG10", 0xfb : "JPG11",
    0xfc : "JPG12", 0xfd : "JPG13",
    0xfe : "COM",   // COMment
  };

  var APPSegmentFormats = {
    "JFIF" : { // JPEG File Interchange Format
      "segmentType" : "APP1"
    },
    "JFXX" : { // JPEG File Interchange Format Extension segment
      "segmentType" : "APP1"
    },
    "Exif" : { // Exchangeable image file format
      "segmentType" : "APP0",
    }
  };

  this.JPEG = this.JPEG || {};
  this.JPEG.jpegSpec = {};
  this.JPEG.jpegSpec.segmentTypes = segmentTypes;
  this.JPEG.jpegSpec.APPSegmentFormats = APPSegmentFormats;

}).call(this);
// JPEG File Interchange Format Parser
(function() {

  'use strict';

  var readSegment = function(blobView, offset) {
    var metaData = {};
    var thumbnailBlob;
    metaData.version = blobView.getUint8(offset+9).toString();
    metaData.version += ".0" + blobView.getUint8(offset+10);
    metaData.units = blobView.getUint8(offset+11);
    metaData.XDensity = blobView.getUint16(offset+12);
    metaData.YDensity = blobView.getUint16(offset+14);
    metaData.XThumbnail = blobView.getUint8(offset+16);
    metaData.YThumbnail = blobView.getUint8(offset+17);
    if (metaData.XThumbnail !== 0 && metaData.YThumbnail !== 0) {
      thumbnailBlob = blobView.blob.slice(offset + 18, 3 * metaData.XThumbnail * metaData.YThumbnail);
    }
    return {
      "metaData" : metaData,
      "thumbnailBlob" : thumbnailBlob
    };
  };

  this.JPEG = this.JPEG || {};
  this.JPEG.JFIF = this.JPEG.JFIF || {};
  this.JPEG.JFIF.readSegment = readSegment;

}).call(this);
(function() {

  'use strict';

  var offsets = {
    "segmentMarker" : 0,
    "APP1Marker" : 1,
    "APP1Length" : 2,
    "TIFFHeader" : 10,
    "TIFFByteOrder" : 10,
    "TIFFMagicNumber" : 12,
    "TIFFFirstIFD" : 14
  };

  var exifSpec = JPEG.exifSpec;

  var mergeObjects = function(object1, object2) {
    for (var tag in object2) {
      if (object2.hasOwnProperty(tag)) {
        object1[tag] = object2[tag];
      }
    }
    return object1;
  };

  var parseASCIIString = function(blobView, offset, count) {
    // EXIF encodes arrays of strings by writing them as one long string
    // with NUL separators. We're not going to interpret that here but
    // will return any such array with the NULs in it. When written back
    // out this will be in the correct format so everything should be okay.
    var value = "";
    count -= 1; // The count includes the terminating NUL character
    for(var i = 0; i < count; i++) {
      value += String.fromCharCode(blobView.getUint8(offset + i));
    }
    return value;
  };

  var writeTagValueArray = function(blobView, valueOffset, type, arrayOfValues, byteOrder) {
    var writtenBytes = 0;
    var i;
    if (Array.isArray(arrayOfValues)) {
      for (i=0; i < arrayOfValues.length; ++i) {
        writtenBytes += writeTagValue(
          blobView, valueOffset + writtenBytes,
          type, arrayOfValues[i] , byteOrder
        );
      }
    } else {
      throw "Error writting array, the value is not an array: " + arrayOfValues;
    }
    return writtenBytes;
  };

  var writeTagValue = function(blobView, valueOffset, typeId, newValue, byteOrder) {
    var writtenBytes;
    if (Array.isArray(newValue)) {
      writtenBytes = writeTagValueArray(blobView, valueOffset, typeId, newValue, byteOrder);
    } else {
      switch (typeId) {
        case 1: // BYTE
          blobView.setUint8(valueOffset, newValue);
          writtenBytes = 1;
          break;
        case 2: // ASCII
          writtenBytes = writeString(blobView, valueOffset, newValue);
          break;
        case 3: // SHORT
          blobView.setUint16(valueOffset, newValue, byteOrder);
          writtenBytes = 2;
          break;
        case 4: // LONG
          blobView.setUint32(valueOffset, newValue, byteOrder);
          writtenBytes = 4;
          break;
        case 6: // SBYTE
          blobView.setInt8(valueOffset, newValue);
          writtenBytes = 1;
          break;
        case 7: // UNDEFINED
          blobView.setUint8(valueOffset, newValue);
          writtenBytes = 1;
          break;
        case 8: // SSHORT
          blobView.setInt16(valueOffset, newValue, byteOrder);
          writtenBytes = 2;
          break;
        case 9: // SLONG
          blobView.setInt32(valueOffset, newValue, byteOrder);
          writtenBytes = 4;
          break;
        case 10: // SRATIONAL
        case 5: // RATIONAL
          writeRational(blobView, valueOffset, typeId, newValue, byteOrder);
          writtenBytes = 8;
          break;
        case 11: // FLOAT
          blobView.setFloat32(valueOffset, newValue, byteOrder);
          writtenBytes = 4;
          break;
        case 12: // DOUBLE
          blobView.setFloat64(valueOffset, newValue, byteOrder);
          writtenBytes = 8;
          break;
        default:
          throw "Writting Exif Tag Value: Unkown value type: " + valueType;
      }
    }
    return writtenBytes;
  };

  var parseTagValue = function(blobView, valueOffset, typeId, count) {
    var numerator;
    var denominator;
    switch (typeId) {
      case 1: // BYTE
        return blobView.getUint8(valueOffset);
      case 2: // ASCII
        return parseASCIIString(blobView, valueOffset, count);
      case 3: // SHORT
        return blobView.getUint16(valueOffset);
      case 4: // LONG
        return blobView.getUint32(valueOffset);
      case 5: //RATIONAL
        numerator = blobView.getUint32(valueOffset);
        denominator = blobView.getUint32(valueOffset + 4);
        return {
          "numerator" : numerator,
          "denominator" : denominator
        };
      case 6: // SBYTE
        return blobView.getInt8(valueOffset);
      case 7: // UNDEFINED
        return blobView.getUint8(valueOffset);
      case 8: // SSHORT
        return blobView.getInt16(valueOffset);
      case 9: // SLONG
        return blobView.getInt32(valueOffset);
      case 10: // SRATIONAL
        numerator = blobView.getInt32(valueOffset);
        denominator = blobView.getInt32(valueOffset + 4);
        return {
          "numerator" : numerator,
          "denominator" : denominator
        };
      case 11: // FLOAT
        return blobView.getFloat32(valueOffset);
      case 12: // DOUBLE
       return blobView.getFloat64(valueOffset);
      default:
        throw "Reading Exif Tag Value: Unkown value type: " + typeId;
    }
  };

  var readTagValue = function(blobView, TIFFHeaderOffset, valueOffset, typeId, count) {
    var tagValues;
    var typeSize = exifSpec.tagTypeSize[typeId];
    // If the value doesn't fit here, then read its address
    if (typeSize * count > 4) {
      valueOffset = TIFFHeaderOffset + blobView.getUint32(valueOffset);
    }
    if (count === 1 || typeId === 2) { // typeId === ASCII
      // If there is just one value, parse it
      return parseTagValue(blobView, valueOffset, typeId, count);
    } else {
      // Otherwise, parse an array of values
      tagValues = [];
      for (var i=0; i<count; ++i) {
        tagValues.push(parseTagValue(blobView, valueOffset, typeId, 1));
        valueOffset += typeSize;
      }
      return tagValues;
    }
  };

  var writeRational = function(blobView, valueOffset, typeId, newValue, byteOrder) {
    if (typeId === 10) { // SRATIONAL
      blobView.setInt32(valueOffset, newValue.numerator, byteOrder);
      blobView.setInt32(valueOffset + 4, newValue.denominator, byteOrder);
    }
    if (typeId === 5) { // RATIONAL
      blobView.setUint32(valueOffset, newValue.numerator, byteOrder);
      blobView.setUint32(valueOffset + 4, newValue.denominator, byteOrder);
    }
    return 8;
  };

  var writeString = function(blobView, offset, str) {
    var i;
    for (i = 0; i < str.length; ++i) {
      blobView.setUint8(offset + i, str.charCodeAt(i));
    }
    blobView.setUint8(offset + str.length, 0x0);
    return str.length + 1;
  };

  var readIFD = function(blobView, TIFFHeaderOffset, IFDOffset) {
    var offset = TIFFHeaderOffset + IFDOffset;
    var numberOfEntries = blobView.getUint16(offset);
    offset += 2;
    var i;
    var entries;
    var entry;
    var tag;
    var typeId;
    var count;
    var tagValueOffset;
    var nextIFDOffset;
    if (numberOfEntries > 0) {
      entries = {};
    }
    for (i=0; i<numberOfEntries;++i) {
      tag = blobView.getUint16(offset);
      typeId = blobView.getUint16(offset + 2);
      count = blobView.getUint32(offset + 4);
      entries[tag] = {
        "type" : typeId,
        "count" : count,
        "value" : readTagValue(blobView, TIFFHeaderOffset, offset + 8, typeId, count),
        "valueOffset" : offset + 8
      };
      offset += 12;
    }
    nextIFDOffset = blobView.getUint32(offset);
    return {
      "entries" : entries,
      "nextIFDOffset" : nextIFDOffset
    };
  };

  var writeIFD = function(blobView, TIFFHeaderOffset, IFDOffset, valuesOffset, IFDType, metaData, nextIFD) {
    var count;
    var bytesWritten = 0;
    var bytesWrittenValue;
    var numberOfEntries = 0;
    var offset = IFDOffset + 2;
    Object.keys(metaData).forEach(function(key){
      var tagId = exifSpec.getTagId(key);
      var tagInfo = exifSpec.tags[tagId];
      if (!tagInfo) {
        return;
      }
      var type = tagInfo.type;
      var typeSize = exifSpec.tagTypeSize[type];

      if (tagId && tagInfo.IFD === IFDType) {
        blobView.setUint16(offset, tagId, false); // Tag Id
        blobView.setUint16(offset + 2, type, false); // Tag type
        count = calculateTagValueCount(type, metaData[key]);
        blobView.setUint32(offset + 4, count, false); // Tag Count. Number of values

        if (count * typeSize <= 4) { // It fits in the 4 byte address field
          writeTagValue(blobView, offset + 8, type, metaData[key], false);
        } else {
          blobView.setUint32(offset + 8, valuesOffset - TIFFHeaderOffset, false);
          bytesWrittenValue = writeTagValue(blobView, valuesOffset, type, metaData[key], false);
          // The valuesOffset should always be on a word boundary, so
          // if we just wrote an odd number of bytes, (e.g. an even-length
          // string plus a NUL terminator) we need to skip one so the next
          // value is written at an even offset
          if (bytesWrittenValue % 2 === 1)
            bytesWrittenValue++;
          valuesOffset += bytesWrittenValue;
          bytesWritten += bytesWrittenValue;
        }
        bytesWritten += 12;
        offset += 12;
        numberOfEntries++;
      }
    });
    if (numberOfEntries ||
        (IFDType === 2 && metaData.ExifTag) ||
        (IFDType === 3 && metaData.GPSTag) ||
        (IFDType === 4 && metaData.InteroperabilityTag)) {

      blobView.setUint16(IFDOffset, numberOfEntries, false);
      bytesWritten += 2;
    }
    // IFDType Image (IFD0) holds pointer to IFD1 (Thumbnnail)
    if (IFDType === 1) { // Image
      bytesWritten += 4;
      if (nextIFD) {
        blobView.setUint32(offset, bytesWritten + 8, false);
      } else {
        blobView.setUint32(offset, 0, false);
      }
    }
    return bytesWritten;
  };

  var makeDirectoryEntriesHumanReadable = function(entries) {
    var tags = {};
    var tagInfo;
    Object.keys(entries).forEach(function(tag) {
      tagInfo = entries.IFD === 4? interOperabilityTags.tags[tag] : exifSpec.tags[tag];
      if (!tagInfo) {
        console.log("Error parsing IFD: Tag  " + tag + " is not valid");
        return;
      }
      tags[tagInfo.key] = entries[tag].value;
    });
    return tags;
  };

  var readTIFFByteOrder = function(blobView, TIFFOffset) {
    var byteOrder = blobView.getUint16(TIFFOffset + offsets.TIFFByteOrder);
    if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) {
      throw "TIFF Image parser failed: Invalid byte order in EXIF segment";
    }
    return byteOrder;
  };

  var isTIFFLittleEndian = function(byteOrder) {
    if (byteOrder === 0x4949) {
      return true;
    } else if (byteOrder === 0x4D4D) {
      return false;
    } else {
      throw "TIFF Image parser failed: Invalid byte order in EXIF segment";
    }
  };

  var isValidTIFFFile = function(blobView, TIFFOffset) {
    var TIFFMagicNumber = blobView.getUint16(TIFFOffset + offsets.TIFFMagicNumber);
    if (TIFFMagicNumber !== 42) {
      throw "TIFF Image parser failed: Wrong magic number in TIFF header";
    }
    return true;
  };

  var readExifMetaData = function(blobView, TIFFOffset) {
    var thumbnailBlob;
    var thumbnailIFDEntries;
    var IFD0;
    var IFD1;
    var EXIFIFD;
    var GPSIFD;
    var interoperabilityIFD;
    var JPEGInterchangeFormatLength;
    var JPEGInterchangeFormat;
    var TIFFHeaderOffset = TIFFOffset + offsets.TIFFHeader;
    var byteOrder = readTIFFByteOrder(blobView, TIFFOffset);

    blobView.littleEndian = isTIFFLittleEndian(byteOrder);
    // EXIF metadata is stored in TIFF header format
    if (!isValidTIFFFile(blobView, TIFFOffset)) {
      return;
    }

    // Reads 0th IFD
    offsets.firstIFD = blobView.getUint32(TIFFOffset + offsets.TIFFFirstIFD);
    IFD0 = readIFD(blobView, TIFFHeaderOffset, offsets.firstIFD);

    // Reads 1st IFD (Thumbnail Meta Data)
    if (IFD0.nextIFDOffset) {
      IFD1 = readIFD(blobView, TIFFHeaderOffset, IFD0.nextIFDOffset);
    }

    // Reads THUMBNAIL
    if (IFD1 && IFD1.entries[exifSpec.getTagId("JPEGInterchangeFormat")]) {
      JPEGInterchangeFormatLength = IFD1.entries[exifSpec.getTagId("JPEGInterchangeFormatLength")].value;
      JPEGInterchangeFormat = IFD1.entries[exifSpec.getTagId("JPEGInterchangeFormat")].value;
      thumbnailBlob = blobView.blob.slice(TIFFHeaderOffset + JPEGInterchangeFormat, TIFFHeaderOffset + JPEGInterchangeFormat + JPEGInterchangeFormatLength);
    }

    // Reads EXIF IFD
    if (IFD0.entries[exifSpec.getTagId("ExifTag")]) {
      EXIFIFD = readIFD(blobView, TIFFHeaderOffset, IFD0.entries[exifSpec.getTagId("ExifTag")].value);
    }

    // Reads GPS IFD
    if(IFD0.entries[exifSpec.getTagId("GPSTag")]) {
      GPSIFD = readIFD(blobView, TIFFHeaderOffset, IFD0.entries[exifSpec.getTagId("GPSTag")].value);
    }

    // Reads Interoperability IFD
    if(IFD0.entries[exifSpec.getTagId("InteroperabilityTag")]) {
      interoperabilityIFD = readIFD(blobView, TIFFHeaderOffset, IFD0.entries[exifSpec.getTagId("InteroperabilityTag")].value);
    }

    return {
      "IFD0" : IFD0.entries,
      "IFD1" : IFD1 && IFD1.entries,
      "EXIFIFD" : EXIFIFD && EXIFIFD.entries,
      "GPSIFD"  : GPSIFD && GPSIFD.entries,
      "interoperabilityIFD" : interoperabilityIFD && interoperabilityIFD.entries,
      "thumbnailBlob" : thumbnailBlob,
      "byteOrder" : byteOrder
    };

  };

  var calculateTagValueSize = function(tagName, value) {
    var tagId = exifSpec.getTagId(tagName);
    var tagTypeId = exifSpec.tags[tagId].type;
    var length = 0;

    switch (tagTypeId) {
      case 1: // BYTE
      case 6: // SBYTE
      case 7: // UNDEFINED
        length = 1;
        break;
      case 2: // ASCII
        length = value.length + 1;
        break;
      case 3: // SHORT
      case 8: // SSHORT
        length = 2;
        break;
      case 4: // LONG
      case 9: // SLONG
      case 11:// FLOAT
        length = 4;
        break;
      case 10:// SRATIONAL
      case 5: // RATIONAL
      case 12: // DOUBLE
        length = 8;
        break;
      default:
        throw "Calculating Exif Tag Value Size: Unkown value type: " + tagTypeId;
    }
    if (Array.isArray(value)) {
      length = value.length * length;
    }
    return length;
  };

  var calculateTagValueCount = function(tagType, value) {
    if (Array.isArray(value)) {
      return value.length;
    }
    // ASCII
    if (tagType === 2) {
      return value.length + 1;
    }
    return 1;
  };

  var calculateIFDLengths = function(metaData) {
    var ExifTags;
    var GPSTags;
    var interoperabilityTags;
    var IFD0Tags = false;
    var lengths = {
      IFD0Length: 0,
      IFD0LengthDataSection: 0,
      ExifIFDLength: 0,
      ExifIFDLengthDataSection: 0,
      GPSIFDLength: 0,
      GPSIFDLengthDataSection: 0,
      interoperabilityIFDLength: 0,
      interoperabilityLengthDataSection: 0
    };
    var exifTagAlreadyPresent = false;
    var gpsTagAlreadyPresent = false;
    var interoperabilityTagAlreadyPresent = false;
    var valueSize;
    // 12 bytes is the length of each tag record.
    // 2 bytes tagID + 2 bytes tag type + 4 bytes values count
    // 4 bytes value offset (for indirect addressed tags)
    var IFDSize = 12;
    Object.keys(metaData).forEach(function(key) {
      var tagId = exifSpec.getTagId(key);
      var tagInfo = tagId && exifSpec.tags[tagId];
      if (tagInfo) {
        valueSize = calculateTagValueSize(key, metaData[key]);
        // If value is 4 bytes or less is stored in the IFD and not in the data section
        // If it is greater than 4 bytes it must be an even value to retain
        // proper alignment
        if (valueSize <= 4) {
          valueSize = 0;
        }
        else {
          if (valueSize % 2 === 1)
            valueSize += 1;
        }

        if (tagInfo.IFD === 1) {
          lengths.IFD0Length += IFDSize;
          lengths.IFD0LengthDataSection += valueSize;
          IFD0Tags = true;
        }
        if (tagInfo.IFD === 2) { // Photo
          lengths.ExifIFDLength += IFDSize;
          lengths.ExifIFDLengthDataSection += valueSize;
          ExifTags = true;
        }
        if (tagInfo.IFD === 3) { // GPSInfo
          lengths.GPSIFDLength += IFDSize;
          lengths.GPSIFDLengthDataSection += valueSize;
          GPSTags = true;
        }
        if (tagInfo.IFD === 4) { // Iop
          lengths.interoperabilityIFDLength += IFDSize;
          lengths.interoperabilityLengthDataSection += valueSize;
          interoperabilityTags = true;
        }
      }
    });
    // Pointer to next IFD
    lengths.IFD0Length += 4;
    if (ExifTags && !metaData.ExifTag) {
      lengths.IFD0Length += 12;
    }
    if (GPSTags && !metaData.GPSTag) {
      lengths.IFD0Length += 12;
    }
    if (interoperabilityTags && !metaData.InteroperabilityTag) {
      lengths.IFD0Length += 12;
    }
    // Number of entries counter (2bytes)
    lengths.IFD0Length += 2;
    if (metaData.ExifTag) {
      lengths.ExifIFDLength += 2;
    }
    if (metaData.GPSTag) {
      lengths.GPSIFDLength += 2;
    }
    if (metaData.InteroperabilityTag) {
      lengths.interoperabilityIFDLength += 2;
    }
    return lengths;
  };

  var writeSegmentHeader = function(blobView, offset, length) {
    blobView.setUint16(offset, 0xFFE1, false); // Segment marker
    blobView.setUint16(offset + 2, length, false);
    blobView.setUint8(offset + 4, 0x45); // E
    blobView.setUint8(offset + 5, 0x78); // x
    blobView.setUint8(offset + 6, 0x69); // i
    blobView.setUint8(offset + 7, 0x66); // f
    blobView.setUint8(offset + 8, 0);    // \0
    blobView.setUint8(offset + 9, 0);    // \0
    return 10;
  };

  var writeTiffHeader = function(blobView, offset) {
    blobView.setUint16(offset + 0, 0x4D4D, false); // byte Order
    blobView.setUint16(offset + 2, 42, false); // Magic Number
    blobView.setUint32(offset + 4, 8, false); // Offset to the first tag
    return 8;
  };

  var createSegment = function(metaData, callback, thumbnailBlob, thumbnailMetaData) {
    var IFDBuffer;
    var blob;
    var valuesOffset;
    var offset = 0;
    thumbnailMetaData = thumbnailMetaData || {};
    if (thumbnailBlob) {
      thumbnailMetaData.JPEGInterchangeFormat = 0;
      thumbnailMetaData.JPEGInterchangeFormatLength = thumbnailBlob.size;
      thumbnailMetaData.Orientation = metaData.Orientation;
    }

    var IFD1Lengths = calculateIFDLengths(thumbnailMetaData);
    var IFD1Length = thumbnailBlob? IFD1Lengths.IFD0Length : 0; // Image
    var IFD1LengthDataSection = thumbnailBlob? IFD1Lengths.IFD0LengthDataSection : 0; // Image

    var IFDlengths = calculateIFDLengths(metaData);
    var IFD0Length = IFDlengths.IFD0Length;
    var IFD0LengthDataSection = IFDlengths.IFD0LengthDataSection;
    var ExifIFDLength = IFDlengths.ExifIFDLength;
    var ExifIFDLengthDataSection = IFDlengths.ExifIFDLengthDataSection;
    var GPSIFDLength = IFDlengths.GPSIFDLength;
    var GPSIFDLengthDataSection = IFDlengths.GPSIFDLengthDataSection;
    var interoperabilityIFDLength =  IFDlengths.interoperabilityIFDLength;
    var interoperabilityLengthDataSection = IFDlengths.interoperabilityLengthDataSection;

    var tiffHeaderOffset;
    var exifSegmentBlob;
    var segmentContent = [];
    // 2 bytes segment header + 2 bytes segment length
    // 6 bytes Exif\0\0 string + 2 bytes endiannes code
    // 2 bytes magic number (42) + 4 bytes 0th IFD offset
    // Section 4.5.2 of Exif standard Version 2.2
    var headerLength = 18;
    var IFDLengths = headerLength + IFD0Length + IFD1Length + ExifIFDLength + GPSIFDLength + interoperabilityIFDLength;
    var DataSectionsLength = IFD0LengthDataSection + IFD1LengthDataSection + ExifIFDLengthDataSection + GPSIFDLengthDataSection + interoperabilityLengthDataSection;
    var segmentLength = IFDLengths + DataSectionsLength;
    var segmentLengthWithThumbnail = thumbnailBlob? segmentLength + thumbnailBlob.size : segmentLength;
    var writtenBytesError = "Written bytes and segment length don't match. There was a problem creating the segment";
    IFDBuffer = new ArrayBuffer(segmentLength);
    blob = new Blob([IFDBuffer], {type: "image/jpeg"});
    JPEG.BlobView.get(blob, 0, blob.size, function(blobView) {
      offset += writeSegmentHeader(blobView, offset, segmentLengthWithThumbnail - 2);
      tiffHeaderOffset = offset;
      offset += writeTiffHeader(blobView, offset);

      if (ExifIFDLength) {
        metaData.ExifTag = 8 + IFD0Length + IFD0LengthDataSection +
                           IFD1Length + IFD1LengthDataSection;
      }
      if (GPSIFDLength) {
        metaData.GPSTag = 8 + IFD0Length + IFD0LengthDataSection +
                          IFD1Length + IFD1LengthDataSection +
                          ExifIFDLength + ExifIFDLengthDataSection;
      }
      if (interoperabilityIFDLength) {
        metaData.InteroperabilityTag = 8 + IFD0Length + IFD0LengthDataSection +
                                       IFD1Length + IFD1LengthDataSection +
                                       ExifIFDLength + ExifIFDLengthDataSection +
                                       GPSIFDLength + GPSIFDLengthDataSection;
      }

      // IFDid = 1 (Image)
      offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + IFD0Length, 1, metaData, ExifIFDLength);
      if (IFD1Length) {
        thumbnailMetaData.JPEGInterchangeFormat = segmentLength - 10;
        // IFDid = 1 (Image)
        offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + IFD1Length, 1, thumbnailMetaData, ExifIFDLength);
      }
      // IFDid = 2 (Photo)
      offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + ExifIFDLength, 2, metaData);
      // IFDid = 3 (GPSInfo)
      offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + GPSIFDLength, 3, metaData);
      // IFDid = 4 (InterOperability)
      offset += writeIFD(blobView, tiffHeaderOffset, offset, offset + interoperabilityIFDLength, 4, metaData);
      if (offset !== segmentLength) {
        console.log(writtenBytesError);
        callback(writtenBytesError);
        return;
      }
      segmentContent.push(blobView.buffer);
      if (thumbnailMetaData && thumbnailBlob) {
        segmentContent.push(thumbnailBlob);
      }
      exifSegmentBlob = new Blob(segmentContent);
      callback(null, exifSegmentBlob);
    });
  };

  var createThumbnail = function(file, callback, scaleFactor) {
    var image = new Image();
    var thumbnailCreated = function(thumbnailBlob) {
      callback(null, thumbnailBlob);
    };
    scaleFactor = scaleFactor || 8;
    image.onload = function() {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.height = image.height / scaleFactor;
      canvas.width = image.width / scaleFactor;
      context.drawImage(image,
        0, 0, image.width, image.height,
        0, 0, canvas.width, canvas.height);
      canvas.toBlob(thumbnailCreated, 'image/jpeg');
      URL.revokeObjectURL(image.src);
      image.src = '';
    };
    image.src = URL.createObjectURL(file);
  };

  var readSegment = function(blobView, segmentOffset) {
    var segmentMetaData = readExifMetaData(blobView, segmentOffset);
    var exifMetaData = segmentMetaData.IFD0;
    exifMetaData = mergeObjects(exifMetaData, segmentMetaData.EXIFIFD);
    exifMetaData = mergeObjects(exifMetaData, segmentMetaData.GPSIFD);
    return {
      "metaData" : makeDirectoryEntriesHumanReadable(exifMetaData),
      "thumbnailMetaData" : segmentMetaData.IFD1 && makeDirectoryEntriesHumanReadable(segmentMetaData.IFD1),
      "thumbnailBlob" : segmentMetaData.thumbnailBlob
    };
  };

  this.JPEG = this.JPEG || {};
  this.JPEG.Exif = this.JPEG.Exif || {};
  this.JPEG.Exif.mergeObjects = mergeObjects;
  this.JPEG.Exif.readSegment = readSegment;
  this.JPEG.Exif.createSegment = createSegment;
  this.JPEG.Exif.createThumbnail = createThumbnail;

}).call(this);

(function() {

  'use strict';

  var offsets = {
    "SOIMarker" : 0,
    "segmentMarker" : 0,
    "segmentType" : 1,
    "segmentLength" : 2,
    "segmentFormat" : 4,
    "firstSegment" : 2
  };

  var metaDataTypes = {
    "Exif" : JPEG.Exif,
    "JFIF" : JPEG.JFIF
  };

  var readSegmentMarker = function(blobView, offset) {
    return blobView.getUint8(offset + offsets.segmentMarker);
  };

  var readSegmentType = function(blobView, offset) {
    return blobView.getUint8(offset + offsets.segmentType);
  };

  var readSegmentLength = function(blobView, offset) {
    var segmentType = JPEG.jpegSpec.segmentTypes[readSegmentType(blobView, offset)];
    if (segmentType === "SOS" || segmentType.indexOf("RST") === 0) {
      return findNextSegmentOffset(blobView, offset) - offset;
    }
    return blobView.getUint16(offset + 2, false) + 2;
  };

  var readSegmentFormat = function(blobView, offset) {
    return blobView.getNullTerminatedASCIIString(offset + offsets.segmentFormat);
  };

  var validateJPEGFile = function(blobView) {
    // It reads the SOI (Start Of Image) marker (first two bytes)
    if (blobView.byteLength < 2 ||
        blobView.getUint16(offsets.SOIMarker) !== 0xffd8) {
      return false;
    }
    return true;
  };

  var validateSegment = function(blobView, offset) {
    var segmentMarker = readSegmentMarker(blobView, offset);
    var segmentType = readSegmentType(blobView, offset);
    if (segmentMarker === 0xff && segmentType > 0x00 && segmentType < 0xff) {
      return true;
    }
    return false;
  };

  var findNextSegmentOffset = function(blobView, offset) {
    offset += 2;
    var previousByte = 0x00;
    var currentByte;
    while (true) {
      if (offset >= blobView.sliceLength) {
        break;
      }
      currentByte = blobView.getUint8(offset);
      if (currentByte !== 0x00 && previousByte === 0xff) {
        break;
      }
      previousByte = currentByte;
      offset += 1;
    }
    return offset + 1;
  };

  var isAPPSegment = function(blobView, offset) {
    var segmentType = readSegmentType(blobView, offset);
    if (segmentType >= 0xe0 && segmentType <= 0xef) {
      return true;
    }
    return false;
  };

  var parseAPPSegment = function(blobView, offset) {
    var segmentFormat = readSegmentFormat(blobView, offset);
    var segment;
    if (metaDataTypes[segmentFormat]) {
      segment = metaDataTypes[segmentFormat].readSegment(blobView, offset);
      return {
        "format" : segmentFormat,
        "offset" : offset,
        "metaData" : segment.metaData,
        "thumbnailMetaData" : segment.thumbnailMetaData,
        "thumbnailBlob" : segment.thumbnailBlob
      };
    } else {
      console.log("Unkown APP segment format: " + segmentFormat);
    }
  };

  var parseSegments = function(blobView) {
    var offset = 2;
    var segmentsMetaData = {};
    var APPSegment;
    var segmentLength;
    while (offset + 4 <= blobView.sliceLength) {
      if (!validateSegment(blobView, offset)) {
        throw "Invalid JPEG Segment at offset " + offset;
      }
      if (isAPPSegment(blobView, offset)) {
        APPSegment = parseAPPSegment(blobView, offset);
        if (APPSegment) {
          segmentsMetaData[APPSegment.format] = APPSegment.metaData;
          segmentsMetaData[APPSegment.format].segmentOffset = APPSegment.offset;
          segmentsMetaData[APPSegment.format].segmentLength = readSegmentLength(blobView, offset);
          segmentsMetaData.thumbnailBlob = segmentsMetaData.thumbnailBlob || APPSegment.thumbnailBlob;
          segmentsMetaData.thumbnailMetaData = segmentsMetaData.thumbnailBlob || APPSegment.thumbnailMetaData;
        }
      }
      segmentLength = readSegmentLength(blobView, offset);
      if (segmentLength <= 0) { // Corrupt segment with invalid length
        throw "Invalid length in segement at offset: " + offset;
      }
      offset += segmentLength;
    }
    return segmentsMetaData;
  };

  var validateExifSegment = function(blobView, offset) {
    var firstSegmentType = JPEG.jpegSpec.segmentTypes[readSegmentType(blobView, offset)];
    var firstSegmentFormat = readSegmentFormat(blobView, offset);
    if (firstSegmentType !== "APP1" || firstSegmentFormat !== "Exif") {
      return false;
    }
    return true;
  };

  var readJPEGSegments = function(blob, size, callback, validateFirstSegment) {
    JPEG.BlobView.get(blob, 0, size, function(blobView) {
      if (validateJPEGFile(blobView) === false) {
        callback("Not a valid JPEG file");
      } else {
        if (validateFirstSegment && !validateFirstSegment(blobView, 2)) {
          callback("First segment not valid");
        } else {
          callback(null, parseSegments(blobView), blobView);
        }
      }
    });
  };

  var insertSegment = function(segmentBlob, blob, metaDataType, callback) {
    JPEG.BlobView.get(blob, 0, blob.size, function(blobView) {
      var blobSegments;
      var blob;
      var blobBeforeSegment;
      var blobAfterSegment;
      var existingSegment;
      var fileSegments;
      if (validateJPEGFile(blobView) === false) {
        callback("Not a valid JPEG file");
      } else {
        fileSegments = parseSegments(blobView);
        // If the segment already exists we just replace it
        if (fileSegments[metaDataType]) {
          existingSegment = fileSegments[metaDataType];
          blobBeforeSegment = blobView.blob.slice(0, existingSegment.segmentOffset);
          blobAfterSegment = blobView.blob.slice(
            existingSegment.segmentOffset + existingSegment.segmentLength, blobView.sliceLength);
        } else { // If the segment doesn't exist we push it to the front of the file
          blobBeforeSegment = blobView.blob.slice(0, 2);
          blobAfterSegment = blobView.blob.slice(2, blobView.sliceLength);
        }
        blob = new Blob([blobBeforeSegment, segmentBlob, blobAfterSegment], {type: "image/jpeg"});
        callback(null, blob);
      }
    });
  };

  var readMetaData = function(blob, size, callback, validateFirstSegment) {
    var processSegments = function(error, segmentsMetaData) {
      if (error) {
        callback(error);
      } else {
        segmentsMetaData.fileType = "JPEG";
        segmentsMetaData.fileSize = blob.size;
        callback(null, segmentsMetaData);
      }
    };
    readJPEGSegments(blob, size, processSegments, validateFirstSegment);
  };

  var writeMetaData = function(blob, size, newMetaData, metaDataType, callback, createNewThumbnail) {
    var processSegments = function(error, segmentsMetaData, blobView) {
      var segmentCreated = function(error, segmentBlob) {
        insertSegment(segmentBlob, blob, metaDataType, callback);
      };
      var createSegment = function(thumbnailMetaData, thumbnailBlob) {
        metaDataTypes[metaDataType].createSegment(
            newMetaData, segmentCreated,
            thumbnailBlob, thumbnailMetaData);
      };
      var thumbnailCreated = function(error, thumbnailBlob) {
        createSegment({}, thumbnailBlob);
      };
      if (metaDataTypes[metaDataType]) {
        if (segmentsMetaData[metaDataType]) {
          newMetaData = JPEG.Exif.mergeObjects(segmentsMetaData[metaDataType], newMetaData);
        }
        if (createNewThumbnail) {
          metaDataTypes[metaDataType].createThumbnail(blob, thumbnailCreated, 16);
        } else {
          createSegment(segmentsMetaData.thumbnailMetaData, segmentsMetaData.thumbnailBlob);
        }
      } else {
        throw "Writting MetaData: Unknown type of MetaData " + metaDataType;
      }
    };
    readJPEGSegments(blob, size, processSegments);
  };

  var readExifMetaData = function(blob, callback) {
    var processMetaData = function(error, metaData) {
      var thumbnailMetaData = metaData && metaData.thumbnailMetaData;
      var thumbnailBlob = metaData && metaData.thumbnailBlob;
      metaData = metaData && metaData.Exif;
      callback(error, metaData, thumbnailMetaData, thumbnailBlob);
    };
    // We only read Start Of Image (SOI, 2 bytes) + APP1 segment that contains EXIF metada (64 KB)
    // Pg. 11 of Exif Standard Version 2.2
    // "The size of APP1 shall not exceed the 64 Kbytes specified in the JPEG standard"
    readMetaData(blob, Math.min((64 * 1024) + 2, blob.size), processMetaData);
  };

  var writeExifMetaData = function(blob, metaData, callback) {
    writeMetaData(blob, blob.size, metaData, "Exif", callback);
  };

  this.JPEG = this.JPEG || {};
  this.JPEG.readMetaData = readMetaData;
  this.JPEG.readExifMetaData = readExifMetaData;
  this.JPEG.writeExifMetaData = writeExifMetaData;

}).call(this);
