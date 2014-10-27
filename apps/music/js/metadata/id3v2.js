/* global BlobView */
'use strict';

var ID3v2Metadata = (function() {
  // TODO: remove these
  var TAG_FORMAT = 'tag_format';
  var TITLE = 'title';
  var ARTIST = 'artist';
  var ALBUM = 'album';
  var TRACKNUM = 'tracknum';
  var TRACKCOUNT = 'trackcount';
  var DISCNUM = 'discnum';
  var DISCCOUNT = 'disccount';
  var IMAGE = 'picture';

  // Map id3v2 frame ids to metadata property names
  var ID3V2FRAMES = {
    TPE1: ARTIST,
    TP1:  ARTIST,
    TALB: ALBUM,
    TAL:  ALBUM,
    TIT2: TITLE,
    TT2:  TITLE,
    TRCK: TRACKNUM,
    TRK:  TRACKNUM,
    TPA:  DISCNUM,
    TPOS: DISCNUM,
    APIC: IMAGE,
    PIC:  IMAGE
  };

  function parse(blobview, metadata) {
    var header = parseHeader(blobview);
    if (header.version > 4) {
      console.warn('mp3 file with unknown metadata version');
      return Promise.resolve(metadata);
    }
    metadata[TAG_FORMAT] = header.versionString;
    return new Promise(function(resolve, reject) {
      blobview.getMore(blobview.index, header.length, function(moreview) {
        parseFrames(header, moreview, metadata);
        resolve(metadata);
      });
    });
  }

  function parseHeader(blobview) {
    // First three bytes are "ID3" or we wouldn't be here
    blobview.index = 3;

    var header = {
      get versionString() {
        return 'id3v2.' + this.version + '.' + this.revision;
      },

      get tag_unsynchronized() {
        return (this.flags & 0x80) !== 0;
      },

      get has_extended_header() {
        return (this.flags & 0x40) !== 0;
      }
    };

    header.version = blobview.readUnsignedByte();
    header.revision = blobview.readUnsignedByte();

    header.flags = blobview.readUnsignedByte();
    header.length = blobview.readID3Uint28BE();

    return header;
  }

  function parseFrames(header, blobview, metadata) {
    // In id3v2.3, the "unsynchronized" flag in the tag header applies to
    // the whole tag (excluding the tag header). In id3v2.4, the flag is just
    // an indicator that we should expect to see the "unsynchronized" flag
    // set on all the frames.
    if (header.tag_unsynchronized && header.version === 3) {
      blobview = deunsync(blobview, header.length);
    }

    // Skip the extended header, if there is one.
    if (header.has_extended_header) {
      var extended_header_size;
      if (header.version === 4) {
        // In id3v2.4, the size includes itself, i.e. the rest of the header
        // is |extended_header_size - 4|.
        extended_header_size = blobview.readID3Uint28BE() - 4;
      }
      else { // id3version === 3
        // In id3v2.3, the size *excludes* itself, i.e. the rest of the header
        // is |extended_header_size|.
        extended_header_size = blobview.readUnsignedInt();
      }
      blobview.advance(extended_header_size);
    }

    while (blobview.index < blobview.byteLength) {
      // If there is a null byte here, then we've found padding and we're done.
      if (blobview.getUint8(blobview.index) === 0) {
        break;
      }
      parseFrame(header, blobview, metadata);
    }
  }

  function parseFrame(header, blobview, metadata) {
    var frameid, framesize, frameflags, frame_unsynchronized = false;

    switch (header.version) {
    case 2:
      frameid = blobview.readASCIIText(3);
      framesize = blobview.readUint24();
      frameflags = 0;
      break;
    case 3:
      frameid = blobview.readASCIIText(4);
      framesize = blobview.readUnsignedInt();
      frameflags = blobview.readUnsignedShort();
      break;
    case 4:
      frameid = blobview.readASCIIText(4);
      framesize = blobview.readID3Uint28BE();
      frameflags = blobview.readUnsignedShort();
      frame_unsynchronized = ((frameflags & 0x02) !== 0);
      break;
    }

    var nextframe = blobview.index + framesize;
    var propname = ID3V2FRAMES[frameid];

    // Skip frames we don't care about
    if (!propname) {
      blobview.index = nextframe;
      return;
    }

    // Skip compressed, encrypted, or grouped frames that we can't decode.
    if ((frameflags & 0xFD) !== 0) {
      console.warn('Skipping', frameid, 'frame with flags', frameflags);
      blobview.index = nextframe;
      return;
    }

    try {
      var frameview, framevalue;

      if (frame_unsynchronized) {
        frameview = deunsync(blobview, framesize);
        framesize = frameview.sliceLength;
      } else {
        frameview = blobview;
      }

      switch (frameid) {
      case 'TPE1': case 'TP1': // artist
      case 'TALB': case 'TAL': // album
      case 'TIT2': case 'TT2': // title
        framevalue = readTextFrame(header, frameview, framesize);
        break;
      case 'TRCK': case 'TRK': // track
        framevalue = readNumericPairFrame(header, frameview, framesize);
        if (framevalue[1] !== null) {
          metadata[TRACKCOUNT] = framevalue[1];
        }
        framevalue = framevalue[0];
        break;
      case 'TPOS': case 'TPA': // disc
        framevalue = readNumericPairFrame(header, frameview, framesize);
        if (framevalue[1] !== null) {
          metadata[DISCCOUNT] = framevalue[1];
        }
        framevalue = framevalue[0];
        break;
      case 'APIC': case 'PIC': // picture
        framevalue = readPicFrame(header, frameview, framesize);
        break;
      default:
        console.error('Should not have gotten here');
      }

      if (framevalue !== null) {
        console.log("PARSED FRAME", propname, framevalue);
        metadata[propname] = framevalue;
      }
    } catch (e) {
      console.warn('Error parsing mp3 metadata frame', frameid, ':', e);
    }

    // Make sure we're at the start of the next frame before continuing
    blobview.index = nextframe;
  }

  /**
   * Reverse the ID3 unsynchronization so that we get the unescaped data. This
   * will advance the view to the end of the unsynchronized block so that you
   * can continue to use the original view once you're finished with the
   * deunsynced view.
   *
   * @param {BlobView} view The original BlobView for the ID3 tag.
   * @param {Number} framesize The size of the unsynchronized frame.
   * @return {BlobView} A new BlobView with the deunsynced data.
   */
  function deunsync(view, framesize) {
    // To de-unsychronize a frame, we need to convert all instances of
    // |0xff 00| to |0xff|.
    var data = new Uint8Array(framesize), was0xff = false, dataIndex = 0;
    for (var i = 0; i < framesize; i++) {
      var b = view.readUnsignedByte();
      if (was0xff && b === 0x00) {
        continue;
      }
      was0xff = (b === 0xff);
      data[dataIndex++] = b;
    }

    // Create a new BlobView with the de-unsynchronized data.
    var deunsynced_view = new BlobView.getFromArrayBuffer(
      data.buffer, 0, dataIndex, view.littleEndian
    );
    deunsynced_view.deunsynced = true;
    return deunsynced_view;
  }

  function readTextFrame(header, view, size, encoding) {
    if (encoding === undefined) {
      encoding = view.readUnsignedByte();
      size = size - 1;
    }
    if (header.version === 4) {
      // In id3v2.4, all text frames can have multiple values, separated by
      // the null character. For now, we join them together to make one big
      // string.
      return readEncodedTextArray(view, size, encoding);
    } else {
      // In id3v2.3, some text frames can have multiple values, separated by
      // '/', so we don't need to do anything special here. In fact, even if
      // we start treating multi-value text frames as an array, we probably
      // shouldn't do anything, since '/' is a bad delimiter.
      return readEncodedText(view, size, encoding);
    }
  }

  function readNumericPairFrame(header, view, size, encoding) {
    var text = readTextFrame(header, view, size, encoding);
    var pair = text.split('/', 2).map(function(val) {
      var i = parseInt(val, 10);
      return isNaN(i) ? null : i;
    });
    if (pair.length === 1) {
      pair.push(null);
    }
    return pair;
  }

  function readPicFrame(header, view, size) {
    var start = view.index;
    var encoding = view.readUnsignedByte();
    var mimetype;
    // mimetype is different for old PIC frames and new APIC frames
    if (header.version === 2) {
      mimetype = view.readASCIIText(3);
      if (mimetype === 'JPG') {
        mimetype = 'image/jpeg';
      } else if (mimetype === 'PNG') {
        mimetype = 'image/png';
      }
    } else {
      mimetype = view.readNullTerminatedLatin1Text(size - 1);
    }

    // We ignore these next two fields
    view.readUnsignedByte(); // kind
    readEncodedText(view, size - (view.index - start), encoding); // desc

    var picstart = view.sliceOffset + view.viewOffset + view.index;
    var picsize = size - (view.index - start);
    var picend = picstart + picsize;

    if (view.deunsynced) {
      return {
        flavor: 'unsynced',
        blob: new Blob(
          [view.buffer.slice(picstart, picend)],
          {type: mimetype}
        )
      };
    } else {
      // Now return an object that specifies where to pull the image from
      // The properties of this object can be passed to blob.slice()
      return {
        flavor: 'embedded',
        start: picstart,
        end: picend,
        type: mimetype
      };
    }
  }

  function readEncodedTextArray(view, size, encoding) {
    var text;
    switch (encoding) {
    case 0:
      text = view.readASCIIText(size);
      break;
    case 1:
      text = view.readUTF16Text(size, undefined);
      break;
    case 2:
      text = view.readUTF16Text(size, false);
      break;
    case 3:
      text = view.readUTF8Text(size);
      break;
    default:
      throw Error('unknown text encoding');
    }

    // Remove any trailing nulls and replace nulls in the middle with ' / '.
    // XXX: When the database supports arrays of values for each field, we
    // should split this into a proper array!
    return text.replace(/\0+$/, '').replace('\0', ' / ');
  }

  function readEncodedText(view, size, encoding) {
    switch (encoding) {
    case 0:
      return view.readNullTerminatedLatin1Text(size);
    case 1:
      return view.readNullTerminatedUTF16Text(size, undefined);
    case 2:
      return view.readNullTerminatedUTF16Text(size, false);
    case 3:
      return view.readNullTerminatedUTF8Text(size);
    default:
      throw Error('unknown text encoding');
    }
  }

  return {
    parse: parse
  };

})();
