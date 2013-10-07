'use strict';

var BlobView = (function() {
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
          if (pos + 2 >= end)
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
