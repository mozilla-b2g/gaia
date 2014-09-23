'use strict';

// When we generate our own thumbnails, aim for this size
var THUMBNAIL_WIDTH = 300;
var THUMBNAIL_HEIGHT = 300;
var offscreenImage = new Image();
var externalCoverCache = {};
var pictureStorage = navigator.getDeviceStorage('pictures');

// XXX We're hiding the fact that these are JSdoc comments because our linter
// refuses to accept "property" as a valid tag. Grumble grumble.

/*
 * Metadata for a track.
 *
 * @typedef {Object} Metadata
 * @property {string} artist The track's artist.
 * @property {string} album The track's album.
 * @property {number} tracknum The number of the track on the album.
 * @property {string} title The track's title.
 * @property {Picture} [picture] The cover art, if any.
 * @property {number} rated The track's rating; starts at 0.
 * @property {number} played The track's play count; starts at 0.
 */

/*
 * Metadata describing the cover art for a track.
 *
 * @typedef {Object} Picture
 * @property {string} flavor How the art was stored; one of "embedded",
 *   "unsync", or "external".
 * @property {string} [thumbnail] The path on the filesystem to the thumbnail
 *   for the picture, if any.
 * @property {number} [start] The offset in bytes to where the picture is
 *   stored in the audio file; only applies when flavor="embedded".
 * @property {number} [end] The offset in bytes to the end of where the
 *   picture is stored in the audio file; only applies when flavor="embedded".
 * @property {number} [type] The mimetype of the picture; only applies when
 *   flavor="embedded".
 * @property {string} [original] The path on the filesystem to the original
 *   (full-size) picture; only applies when flavor="external".
 */

/**
 * Parse the specified blob and pass an object of metadata to the
 * metadataCallback, or invoke the errorCallback with an error message.
 */
function parseAudioMetadata(blob, metadataCallback, errorCallback) {
  var filename = blob.name;

  // If blob.name exists, it should be an audio file from system
  // otherwise it should be an audio blob that probably from network/process
  // we can still parse it but we don't need to care about the filename
  if (filename) {
    // If the file is in the DCIM/ directory and has a .3gp extension
    // then it is a video, not a music file and we ignore it
    if (filename.slice(0, 5) === 'DCIM/' &&
        filename.slice(-4).toLowerCase() === '.3gp') {
      errorCallback('skipping 3gp video file');
      return;
    }

    // If the file has a .m4v extension then it is almost certainly a video.
    // Device Storage should not even return these files to us:
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=826024
    if (filename.slice(-4).toLowerCase() === '.m4v') {
      errorCallback('skipping m4v video file');
      return;
    }
  }

  // If the file is too small to be a music file then ignore it
  if (blob.size < 128) {
    errorCallback('file is empty or too small');
    return;
  }

  // These are the property names we use in the returned metadata object
  var TITLE = 'title';
  var ARTIST = 'artist';
  var ALBUM = 'album';
  var TRACKNUM = 'tracknum';
  var IMAGE = 'picture';

  // These two properties are for playlist functionalities
  // not originally metadata from the files
  var RATED = 'rated';
  var PLAYED = 'played';

  // Map id3v2 frame ids to metadata property names
  var ID3V2FRAMES = {
    TIT2: TITLE,
    TT2: TITLE,
    TPE1: ARTIST,
    TP1: ARTIST,
    TALB: ALBUM,
    TAL: ALBUM,
    TRCK: TRACKNUM,
    TRK: TRACKNUM,
    APIC: IMAGE,
    PIC: IMAGE
  };

  // Map ogg field names to metadata property names
  var OGGFIELDS = {
    title: TITLE,
    artist: ARTIST,
    album: ALBUM,
    tracknumber: TRACKNUM
  };

  // Map MP4 atom names to metadata property names
  var MP4ATOMS = {
    '\xa9alb': ALBUM,
    '\xa9art': ARTIST,
    '\xa9ART': ARTIST,
    'aART': ARTIST,
    '\xa9nam': TITLE,
    'trkn': TRACKNUM,
    'covr': IMAGE
  };

  // These are 'ftyp' values that we recognize
  // See http://www.mp4ra.org/filetype.html
  // Also see gecko code in /toolkit/components/mediasniffer/nsMediaSniffer.cpp
  // Gaia will accept the supported compatible brands in gecko as well
  var MP4Types = {
    'M4A ' : true,  // iTunes audio.  Note space in property name.
    'M4B ' : true,  // iTunes audio book. Note space.
    'mp41' : true,  // MP4 version 1
    'mp42' : true,  // MP4 version 2
    'isom' : true,  // ISO base media file format, version 1
    'iso2' : true   // ISO base media file format, version 2
  };

  // MP4 and 3GP containers both use ISO base media file format.
  // Also see what audio codecs/formats are supported in 3GPP specification.
  // Format information:
  //   https://en.wikipedia.org/wiki/ISO_base_media_file_format
  //   http://tools.ietf.org/html/rfc6381
  //   http://www.3gpp.org/ftp/Specs/html-info/26244.htm
  //
  var MP4Codecs = {
    'mp4a' : true, // MPEG-4 audio
    'samr' : true, // AMR narrow-band speech
    'sawb' : true, // AMR wide-band speech
    'sawp' : true  // Extended AMR wide-band audio
  };

  // Start off with some default metadata
  var metadata = {};
  metadata[ARTIST] = metadata[ALBUM] = metadata[TITLE] = '';
  metadata[RATED] = metadata[PLAYED] = 0;

  // If the blob has a name, use that as a default title in case
  // we can't find one in the file
  if (filename) {
    var p1 = filename.lastIndexOf('/');
    var p2 = filename.lastIndexOf('.');
    if (p2 === -1)
      p2 = filename.length;
    metadata[TITLE] = filename.substring(p1 + 1, p2);
  }

  // Read the start of the file, figure out what kind it is, and call
  // the appropriate parser.  Start off with an 64kb chunk of data.
  // If the metadata is in that initial chunk we won't have to read again.
  var headersize = Math.min(64 * 1024, blob.size);
  BlobView.get(blob, 0, headersize, function(header, error) {
    if (error) {
      errorCallback(error);
      return;
    }

    try {
      var magic = header.getASCIIText(0, 12);

      if (magic.substring(0, 9) === 'LOCKED 1 ') {
        handleLockedFile(blob);
        return;
      }

      if (magic.substring(0, 3) === 'ID3') {
        // parse ID3v2 tag in an MP3 file
        parseID3v2Metadata(header);
      }
      else if (magic.substring(0, 4) === 'OggS') {
        // parse metadata from an Ogg Vorbis file
        parseOggMetadata(header);
      }
      else if (magic.substring(4, 8) === 'ftyp') {
        // This is an MP4 file
        if (checkMP4Type(header, MP4Types)) {
          // It is a type of MP4 file that we support
          parseMP4Metadata(header);
        }
        else {
          // The MP4 file might be a video or it might be some
          // kind of audio that we don't support. We used to treat
          // files like these as unknown files and see (in the code below)
          // whether the <audio> tag could play them. But we never parsed
          // metadata from them, so even if playable, we didn't have a title.
          // And, the <audio> tag was treating videos as playable.
          errorCallback('Unknown MP4 file type');
        }
      }
      else if ((header.getUint16(0, false) & 0xFFFE) === 0xFFFA) {
        // If this looks like an MP3 file, then look for ID3v1 metadata
        // tag at the end of the file. But even if there is no metadata
        // treat this as a playable file.

        BlobView.get(blob, blob.size - 128, 128, function(footer, error) {
          if (error) {
            errorCallback(error);
            return;
          }

          try {
            var magic = footer.getASCIIText(0, 3);
            if (magic === 'TAG') {
              // It is an MP3 file with an ID3v1 tag
              parseID3v1Metadata(footer);
            }
            else {
              // It is an MP3 file with no metadata. We return the default
              // metadata object that just contains the filename as the title
              metadataCallback(metadata);
            }
          }
          catch (e) {
            errorCallback(e);
          }
        });
      }
      else {
        // This is some kind of file that we don't know about.
        // Let's see if we can play it.
        var player = new Audio();
        player.mozAudioChannelType = 'content';
        var canplay = blob.type && player.canPlayType(blob.type);
        if (canplay === 'probably') {
          metadataCallback(metadata);
        }
        else {
          var url = URL.createObjectURL(blob);
          player.src = url;

          player.onerror = function() {
            URL.revokeObjectURL(url);
            player.removeAttribute('src');
            player.load();
            errorCallback('Unplayable music file');
          };

          player.oncanplay = function() {
            URL.revokeObjectURL(url);
            player.removeAttribute('src');
            player.load();
            metadataCallback(metadata);
          };
        }
      }
    }
    catch (e) {
      console.error('parseAudioMetadata:', e, e.stack);
      errorCallback(e);
    }
  });

  //
  // Parse ID3v1 metadata from the 128 bytes footer at the end of a file.
  // Metadata includes title, artist, album and possibly the track number.
  // Year, comment and genre are ignored.
  //
  // Format information:
  //   http://www.id3.org/ID3v1
  //   http://en.wikipedia.org/wiki/ID3
  //
  function parseID3v1Metadata(footer) {
    var title = footer.getASCIIText(3, 30);
    var artist = footer.getASCIIText(33, 30);
    var album = footer.getASCIIText(63, 30);
    var p = title.indexOf('\0');
    if (p !== -1)
      title = title.substring(0, p);
    p = artist.indexOf('\0');
    if (p !== -1)
      artist = artist.substring(0, p);
    p = album.indexOf('\0');
    if (p !== -1)
      album = album.substring(0, p);

    metadata[TITLE] = title || undefined;
    metadata[ARTIST] = artist || undefined;
    metadata[ALBUM] = album || undefined;
    var b1 = footer.getUint8(125);
    var b2 = footer.getUint8(126);
    if (b1 === 0 && b2 !== 0)
      metadata[TRACKNUM] = b2;
    metadataCallback(metadata);
  }

  //
  // Format information:
  //   http://www.id3.org/id3v2.3.0
  //   http://phoxis.org/2010/05/08/what-are-id3-tags-all-about/
  //   https://github.com/aadsm/JavaScript-ID3-Reader/
  //
  function parseID3v2Metadata(header) {

    // First three bytes are "ID3" or we wouldn't be here
    header.index = 3;
    var id3version = header.readUnsignedByte();

    if (id3version > 4) {
      console.warn('mp3 file with unknown metadata version');
      metadataCallback(metadata);
      return;
    }

    var id3revision = header.readUnsignedByte();
    var id3flags = header.readUnsignedByte();
    var tag_unsynchronized = ((id3flags & 0x80) !== 0);
    var has_extended_header = ((id3flags & 0x40) !== 0);
    var length = header.readID3Uint28BE();

    // Get the entire ID3 data block and pass it to parseID3()
    // May be async, or sync, depending on whether we read enough
    // bytes when we read the header
    header.getMore(header.index, length, parseID3);

    function parseID3(id3) {
      // In id3v2.3, the "unsynchronized" flag in the tag header applies to
      // the whole tag (excluding the tag header). In id3v2.4, the flag is just
      // an indicator that we should expect to see the "unsynchronized" flag
      // set on all the frames.
      if (tag_unsynchronized && id3version === 3)
        id3 = deunsync(id3, length);

      // skip the extended header, if there is one
      if (has_extended_header) {
        if (id3version === 4) {
          var extended_header_size = id3.readID3Uint28BE();
          // In id3v2.4, the size includes itself, i.e. the rest of the header
          // is |extended_header_size - 4|.
          id3.advance(extended_header_size - 4);
        }
        else { // id3version === 3
          var extended_header_size = id3.readUnsignedInt();
          // In id3v2.3, the size *excludes* itself, i.e. the rest of the header
          // is |extended_header_size|.
          id3.advance(extended_header_size);
        }
      }

      // If this tag has cover art in an unsynchronized block, we'll store it
      // here. Otherwise, this will be null.
      var coverBlob;

      // Now we have a series of frames, each of which is one ID3 field
      while (id3.index < id3.byteLength) {
        var frameid, framesize, frameflags, frame_unsynchronized = false;

        // If there is a null byte here, then we've found padding
        // and we're done
        if (id3.getUint8(id3.index) === 0)
          break;

        switch (id3version) {
        case 2:
          frameid = id3.readASCIIText(3);
          framesize = id3.readUint24();
          frameflags = 0;
          break;
        case 3:
          frameid = id3.readASCIIText(4);
          framesize = id3.readUnsignedInt();
          frameflags = id3.readUnsignedShort();
          break;
        case 4:
          frameid = id3.readASCIIText(4);
          framesize = id3.readID3Uint28BE();
          frameflags = id3.readUnsignedShort();
          frame_unsynchronized = ((frameflags & 0x02) !== 0);
          break;
        }

        var nextframe = id3.index + framesize;
        var propname = ID3V2FRAMES[frameid];

        // Skip frames we don't care about
        if (!propname) {
          id3.index = nextframe;
          continue;
        }

        // Skip compressed, encrypted, or grouped frames that
        // we can't decode
        if ((frameflags & 0xFD) !== 0) {
          console.warn('Skipping', frameid, 'frame with flags', frameflags);
          id3.index = nextframe;
          continue;
        }

        // Wrap it in try so we don't crash the whole thing on one bad frame
        try {
          var frameview, framevalue;

          if (frame_unsynchronized) {
            frameview = deunsync(id3, framesize);
            framesize = frameview.sliceLength;
          }
          else {
            frameview = id3;
          }

          // Now get the frame value
          switch (frameid) {
          case 'TIT2':
          case 'TT2':
          case 'TPE1':
          case 'TP1':
          case 'TALB':
          case 'TAL':
            framevalue = readTextFrame(frameview, framesize);
            break;
          case 'TRCK':
          case 'TRK':
            framevalue = parseInt(readTextFrame(frameview, framesize), 10);
            break;
          case 'APIC':
          case 'PIC':
            framevalue = readPicFrame(frameview, framesize, frameid);

            // If the picture is unsynchronized, we need to grab the slice for
            // it immediately, before we lose the deunsynced state.
            if (tag_unsynchronized || frame_unsynchronized) {
              coverBlob = new Blob(
                [frameview.buffer.slice(framevalue.start, framevalue.end)],
                { type: framevalue.type }
              );
              framevalue = { flavor: 'unsynced' };
            }
            break;
          }

          if (framevalue !== null)
            metadata[propname] = framevalue;
        }
        catch (e) {
          console.warn('Error parsing mp3 metadata frame', frameid, ':', e);
        }

        // Make sure we're at the start of the next frame before continuing
        id3.index = nextframe;
      }

      handleCoverArt(metadata, coverBlob);
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
        if (was0xff && b === 0x00)
          continue;
        was0xff = (b === 0xff);
        data[dataIndex++] = b;
      }

      // Create a new BlobView with the de-unsynchronized data.
      return new BlobView.getFromArrayBuffer(data.buffer, 0, dataIndex,
                                             view.littleEndian);
    }

    function readPicFrame(view, size, id) {
      var start = view.index;
      var encoding = view.readUnsignedByte();
      var mimetype;
      // mimetype is different for old PIC frames and new APIC frames
      if (id === 'PIC') {
        mimetype = view.readASCIIText(3);
        if (mimetype === 'JPG')
          mimetype = 'image/jpeg';
        else if (mimetype === 'PNG')
          mimetype = 'image/png';
      }
      else {
        mimetype = view.readNullTerminatedLatin1Text(size - 1);
      }

      // We ignore these next two fields
      var kind = view.readUnsignedByte();
      var desc = readEncodedText(view, size - (view.index - start), encoding);

      var picstart = view.sliceOffset + view.viewOffset + view.index;
      var piclength = size - (view.index - start);

      // Now return an object that specifies where to pull the image from
      // The properties of this object can be passed to blob.slice()
      return {
        flavor: 'embedded',
        start: picstart,
        end: picstart + piclength,
        type: mimetype
      };
    }

    function readTextFrame(view, size, encoding) {
      if (encoding === undefined) {
        encoding = view.readUnsignedByte();
        size = size - 1;
      }
      if (id3version === 4) {
        // In id3v2.4, all text frames can have multiple values, separated by
        // the null character. For now, we join them together to make one big
        // string.
        return readEncodedTextArray(view, size, encoding);
      }
      else {
        // In id3v2.3, some text frames can have multiple values, separated by
        // '/', so we don't need to do anything special here. In fact, even if
        // we start treating multi-value text frames as an array, we probably
        // shouldn't do anything, since '/' is a bad delimiter.
        return readEncodedText(view, size, encoding);
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
  }

  //
  // Format information:
  //   http://en.wikipedia.org/wiki/Ogg
  //   http://xiph.org/vorbis/doc/Vorbis_I_spec.html
  //   http://www.xiph.org/vorbis/doc/v-comment.html
  //   http://wiki.xiph.org/VorbisComment
  //   http://tools.ietf.org/html/draft-ietf-codec-oggopus-00
  //
  function parseOggMetadata(header) {
    function sum(x, y) { return x + y; } // for Array.reduce() below

    // Ogg metadata is in the second header packet.  We need to read
    // the first packet to find the start of the second.
    var p1_num_segments = header.getUint8(26);
    var p1_segment_lengths = header.getUnsignedByteArray(27, p1_num_segments);
    var p1_length = Array.reduce(p1_segment_lengths, sum, 0);

    var p2_header = 27 + p1_num_segments + p1_length;
    var p2_num_segments = header.getUint8(p2_header + 26);
    var p2_segment_lengths = header.getUnsignedByteArray(p2_header + 27,
                                                         p2_num_segments);
    var p2_length = Array.reduce(p2_segment_lengths, sum, 0);
    var p2_offset = p2_header + 27 + p2_num_segments;

    // Now go fetch page 2
    header.getMore(p2_offset, p2_length, function(page, error) {
      if (error) {
        errorCallback(error);
        return;
      }

      // Look for a comment packet from a supported codec
      var first_byte = page.readByte();
      var valid = false;
      switch (first_byte) {
        case 3:
          valid = page.readASCIIText(6) === 'vorbis';
          break;
        case 79:
          valid = page.readASCIIText(7) === 'pusTags';
          break;
      }
      if (!valid) {
        errorCallback('malformed ogg comment packet');
        return;
      }

      var vendor_string_length = page.readUnsignedInt(true);
      page.advance(vendor_string_length); // skip libvorbis vendor string

      var num_comments = page.readUnsignedInt(true);
      // |metadata| already has some of its values filled in (namely the title
      // field). To make sure we overwrite the pre-filled metadata, but also
      // append any repeated fields from the file, we keep track of the fields
      // we've seen in the file separately.
      var seen_fields = {};
      for (var i = 0; i < num_comments; i++) {
        if (page.remaining() < 4) { // 4 bytes for comment-length variable
          // TODO: handle metadata that uses multiple pages
          break;
        }
        var comment_length = page.readUnsignedInt(true);
        if (comment_length > page.remaining()) {
          // TODO: handle metadata that uses multiple pages
          break;
        }
        var comment = page.readUTF8Text(comment_length);
        var equal = comment.indexOf('=');
        if (equal !== -1) {
          var fieldname = comment.substring(0, equal).toLowerCase()
                                 .replace(' ', '');
          var propname = OGGFIELDS[fieldname];
          if (propname) { // Do we care about this field?
            var value = comment.substring(equal + 1);
            if (seen_fields.hasOwnProperty(propname)) {
              // If we already have a value, append this new one.
              metadata[propname] += ' / ' + value;
            }
            else {
              // Otherwise, just save the single value.
              metadata[propname] = value;
              seen_fields[propname] = true;
            }
          }
          // XXX
          // How do we do album art in ogg?
          // http://wiki.xiph.org/VorbisComment
          // http://flac.sourceforge.net/format.html#metadata_block_picture
        }
      }

      // We've read all the comments, so call the callback
      handleCoverArt(metadata);
    });
  }

  // MP4 files use 'ftyp' to identify the type of encoding.
  // 'ftyp' information
  //   http://www.ftyps.com/what.html
  function checkMP4Type(header, types) {
    // The major brand is the four bytes right after 'ftyp'.
    var majorbrand = header.getASCIIText(8, 4);

    if (majorbrand in types) {
      return true;
    }
    else {
      // Check the rest part for the compatible brands,
      // they are every four bytes after the version of major brand.
      // Usually there are two optional compatible brands,
      // but arbitrary number of other compatible brands are also acceptable,
      // so we will check all the compatible brands until the header ends.
      var index = 16;
      var size = header.getUint32(0);

      while (index < size) {
        var compatiblebrand = header.getASCIIText(index, 4);
        index += 4;
        if (compatiblebrand in types)
          return true;
      }
      return false;
    }
  }
  //
  // XXX: Need a special case for the track number atom?
  //
  // https://developer.apple.com/library/mac/#documentation/QuickTime/QTFF/QTFFChap1/qtff1.html
  // http://en.wikipedia.org/wiki/MPEG-4_Part_14
  // http://atomicparsley.sourceforge.net/mpeg-4files.html
  //
  function parseMP4Metadata(header) {
    //
    // XXX
    // I think I could probably restructure this somehow. The atoms or "boxes"
    // we're reading and parsing here for a tree that I need to traverse.
    // Maybe nextBox() and firstChildBox() functions would be helpful.
    // Or even make these methods of BlobView?  Not sure if it is worth
    // the time to refactor, though... See also the approach in
    // shared/js/get_video_rotation.js
    //

    findMoovAtom(header);

    function findMoovAtom(atom) {
      try {
        var offset = atom.sliceOffset + atom.viewOffset; // position in blob
        var size = atom.readUnsignedInt();
        var type = atom.readASCIIText(4);

        if (size === 0) {
          // A size of 0 means the rest of the file
          size = atom.blob.size - offset;
        }
        else if (size === 1) {
          // A size of 1 means the size is in bytes 8-15
          size = atom.readUnsignedInt() * 4294967296 + atom.readUnsignedInt();
        }

        if (type === 'moov') {
          // Get the full contents of this atom
          atom.getMore(offset, size, function(moov) {
            try {
              parseMoovAtom(moov, size);
              handleCoverArt(metadata);
              return;
            }
            catch (e) {
              errorCallback(e);
            }
          });
        }
        else {
          // Otherwise, get the start of the next atom and recurse
          // to continue the search for the moov atom.
          // If we're reached the end of the blob without finding
          // anything, just call the metadata callback with no metadata
          if (offset + size + 16 <= atom.blob.size) {
            atom.getMore(offset + size, 16, findMoovAtom);
          }
          else {
            metadataCallback(metadata);
          }
        }
      }
      catch (e) {
        errorCallback(e);
      }
    }

    // Once we've found the moov atom, here's what we do with it.
    // This function, and the ones that follow are all synchronous.
    // We've read the entire moov atom, so we've got all the bytes
    // we need and don't have to do an async read again.
    function parseMoovAtom(data, end) {
      data.advance(8); // skip the size and type of this atom

      // Find the udta and trak atoms within the moov atom
      // There will only be one udta atom, but there may be multiple trak
      // atoms. In that case, this is probably a movie file and we'll reject
      // it when we find a track that is not an mp4 audio codec.
      while (data.index < end) {
        var size = data.readUnsignedInt();
        var type = data.readASCIIText(4);
        var nextindex = data.index + size - 8;
        if (type === 'udta') {       // Metadata is inside here
          parseUdtaAtom(data, end);
          data.index = nextindex;
        }
        else if (type === 'trak') {  // We find the audio format inside here
          data.advance(-8); // skip back to beginning
          var mdia = findChildAtom(data, 'mdia');
          if (mdia) {
            var minf = findChildAtom(mdia, 'minf');
            if (minf) {
              var vmhd = searchChildAtom(minf, 'vmhd');
              if (vmhd)
                throw 'Found video track in MP4 container';
              var smhd = searchChildAtom(minf, 'smhd');
              if (smhd) {
                var stbl = findChildAtom(minf, 'stbl');
                if (stbl) {
                  var stsd = findChildAtom(stbl, 'stsd');
                  if (stsd) {
                    stsd.advance(20);
                    var codec = stsd.readASCIIText(4);
                    if (!(codec in MP4Codecs)) {
                      throw 'Unsupported format in MP4 container: ' + codec;
                    }
                  }
                }
              }
            }
          }
          else {
            // There is no enough information for us to identify the MP4
            throw 'Not enough metadata in MP4 container!';
          }
          data.index = nextindex;
        }
        else {
          data.advance(size - 8);
        }
      }
    }

    function findChildAtom(data, atom) {
      var start = data.index;
      var length = data.readUnsignedInt();
      data.advance(4);

      while (data.index < start + length) {
        var size = data.readUnsignedInt();
        var type = data.readASCIIText(4);
        if (type === atom) {
          data.advance(-8);
          return data;
        }
        else {
          data.advance(size - 8);
        }
      }

      return null;  // not found
    }

    // This function searches the child atom just like findChildAtom().
    // But the internal pointer/index will be reset to the start
    // after the searching finishes.
    function searchChildAtom(data, atom) {
      var start = data.index;
      var target = findChildAtom(data, atom);
      data.index = start;

      return target;
    }

    function parseUdtaAtom(data, end) {
      // Find the meta atom within the udta atom
      while (data.index < end) {
        var size = data.readUnsignedInt();
        var type = data.readASCIIText(4);
        if (type === 'meta') {
          parseMetaAtom(data, data.index + size - 8);
          data.index = end;
          return;
        }
        else {
          data.advance(size - 8);
        }
      }
    }

    function parseMetaAtom(data, end) {
      // The meta atom apparently has a slightly different structure.
      // Have to skip flag bytes before reading children atoms
      data.advance(4);

      // Find the ilst atom within the meta atom
      while (data.index < end) {
        var size = data.readUnsignedInt();
        var type = data.readASCIIText(4);
        if (type === 'ilst') {
          parseIlstAtom(data, data.index + size - 8);
          data.index = end;
          return;
        }
        else {
          data.advance(size - 8);
        }
      }
    }

    function parseIlstAtom(data, end) {
      // Now read all child atoms of ilst, looking for metadata
      // we care about
      while (data.index < end) {
        var size = data.readUnsignedInt();
        var type = data.readASCIIText(4);
        var next = data.index + size - 8;
        var propname = MP4ATOMS[type];
        if (propname) {
          try {
            var value = getMetadataValue(data, next, type);
            metadata[propname] = value;
          }
          catch (e) {
            console.warn('skipping', type, ':', e);
          }
        }
        data.index = next;
      }
    }

    // Find the data atom and return its value or throw an error
    // We handle UTF-8 strings, numbers, and blobs
    function getMetadataValue(data, end, atomtype) {
      // Loop until we find a data atom
      while (data.index < end) {
        var size = data.readUnsignedInt();
        var type = data.readASCIIText(4);
        if (type !== 'data') {
          data.advance(size - 8);
          continue;
        }

        // We've found the data atom.
        // Return its (first) value or throw an error.
        var datatype = data.readUnsignedInt() & 0xFFFFFF;
        data.advance(4); // Ignore locale

        var datasize = size - 16; // the rest of the atom is the value

        // Special case for track number
        if (atomtype === 'trkn') {
          data.advance(2);
          return data.readUnsignedShort();
        }

        switch (datatype) {
        case 1: // utf8 text
          return data.readUTF8Text(datasize);
        case 13: // jpeg
          return {
            flavor: 'embedded',
            start: data.sliceOffset + data.viewOffset + data.index,
            end: data.sliceOffset + data.viewOffset + data.index + datasize,
            type: 'image/jpeg'
          };
        case 14: // png
          return {
            flavor: 'embedded',
            start: data.sliceOffset + data.viewOffset + data.index,
            end: data.sliceOffset + data.viewOffset + data.index + datasize,
            type: 'image/png'
          };
        default:
          throw Error('unexpected type in data atom');
        }
      }
      throw Error('no data atom found');
    }
  }

  function handleLockedFile(locked) {
    ForwardLock.getKey(function(secret) {
      ForwardLock.unlockBlob(secret, locked, callback, errorCallback);

      function callback(unlocked, unlockedMetadata) {
        // Now that we have the unlocked content of the locked file,
        // convert it back to a blob and recurse to parse the metadata.
        // When we're done, add metadata to indicate that this is locked
        // content (so it isn't shared) and to specify the vendor that
        // locked it.
        parseAudioMetadata(unlocked,
                           function(metadata) {
                             metadata.locked = true;
                             if (unlockedMetadata.vendor)
                               metadata.vendor = unlockedMetadata.vendor;
                             if (!metadata[TITLE])
                               metadata[TITLE] = unlockedMetadata.name;
                             metadataCallback(metadata);
                           },
                           errorCallback);
      }
    });
  }

  function handleCoverArt(metadata, coverBlob) {
    // First, get the cover blob if we don't already have it.
    if (!coverBlob && metadata.picture) {
      coverBlob = blob.slice(metadata.picture.start,
                             metadata.picture.end,
                             metadata.picture.type);
    }

    // Media files that aren't backed by actual files get the picture as a Blob,
    // since they're just temporary. We also use this in our tests.
    if (!filename) {
      if (coverBlob) {
        thumbnailizePicture(coverBlob, function(type, blob) {
          metadata.picture.blob = blob;
          metadataCallback(metadata);
        });
      } else {
        metadataCallback(metadata);
      }
      return;
    }

    if (coverBlob) {
      // We have embedded album art! First, try to make a unique filename for
      // the thumbnail based on the artist, album, and file size. The file size
      // is essentially a poor man's checksum to make sure we aren't reusing an
      // inappropriate image, such as if the user updated the embedded art.
      var albumKey;
      if (metadata.artist || metadata.album) {
        // Don't let the artist or album strings be too long; VFAT has a maximum
        // of 255 characters for the path, and we need some room for the rest of
        // it!
        var artist = (metadata.artist || '').substr(0, 64);
        var album = (metadata.album || '').substr(0, 64);
        albumKey = artist + '.' + album;
      } else {
        // If there's no album or artist, use the path to the file instead; we
        // truncate from the end to help ensure uniqueness.
        albumKey = filename.substr(-128);
      }

      var size = metadata.picture.end - metadata.picture.start;
      var thumbnailFilename = vfatEscape(albumKey) + '.' + size + '.jpg';

      checkSaveThumbnail(coverBlob, thumbnailFilename, function() {
        metadataCallback(metadata);
      });
    } else {
      // We don't have any embedded album art; see if there's any external album
      // art in the same directory.
      var lastSlash = filename.lastIndexOf('/');
      var dirName = filename.substring(0, lastSlash + 1);

      // First, check if we've recently fetched this cover; if so, just use the
      // cached results so we're not going out to the disk more than necessary.
      if (dirName in externalCoverCache) {
        metadata.picture = externalCoverCache[dirName];
        metadataCallback(metadata);
        return;
      }

      // Try to find external album art using a handful of common names. The
      // possibilities listed here appear to be the most common, based on a
      // brief survey of what people use in the wild.
      var possibleFilenames = ['folder.jpg', 'cover.jpg', 'front.jpg'];
      var tryFetchExternalCover = function(index) {
        if (index === possibleFilenames.length) {
          externalCoverCache[dirName] = null;
          metadataCallback(metadata);
          return;
        }

        var externalCoverFilename = dirName + possibleFilenames[index];
        var getcoverrequest = pictureStorage.get(externalCoverFilename);
        getcoverrequest.onsuccess = function() {
          var externalBlob = this.result;
          // Create a filename for the thumbnail; truncate from the end to help
          // ensure uniqueness.
          var thumbnailFilename = vfatEscape(dirName.substr(-128)) + '.' +
                                  externalBlob.size + '.jpg';

          metadata.picture = { flavor: 'external',
                               original: externalCoverFilename };
          checkSaveThumbnail(externalBlob, thumbnailFilename, function() {
            // Cache the picture object we generated to make things faster.
            externalCoverCache[dirName] = metadata.picture;
            metadataCallback(metadata);
          });
        };
        getcoverrequest.onerror = function() {
          tryFetchExternalCover(index + 1);
        };
      };
      tryFetchExternalCover(0);
    }

    /**
     * Escape any characters that are illegal on the VFAT filesystem.
     *
     * @param {string} str The string to escape.
     * @return {string} The escaped string.
     */
    function vfatEscape(str) {
      return str.replace(/["*\/:<>?\|]/g, '_');
    }

    /**
     * Shrink a picture down to a thumbnail or, if the picture is already
     * thumbnail-size, do nothing.
     *
     * @param {Blob} pictureBlob The full-size picture.
     * @param {function} callback A callback taking a result type ('error',
     *   'original', or 'thumbnail'), and a Blob for the thumbnailized picture.
     */
    function thumbnailizePicture(pictureBlob, callback) {
      var blobURL = URL.createObjectURL(pictureBlob);

      // Load the blob into an image element
      offscreenImage.src = blobURL;
      offscreenImage.onerror = function() {
        URL.revokeObjectURL(blobURL);
        offscreenImage.removeAttribute('src');
        // Something went wrong reading the embedded image.
        console.warn('Album cover art failed to load', filename);
        callback('error', null);
      };
      offscreenImage.onload = function() {
        // We've loaded the image, now copy it to a canvas.
        var canvas = document.createElement('canvas');
        canvas.width = THUMBNAIL_WIDTH;
        canvas.height = THUMBNAIL_HEIGHT;
        var context = canvas.getContext('2d');
        var scalex = canvas.width / offscreenImage.width;
        var scaley = canvas.height / offscreenImage.height;

        // Take the larger of the two scales: we'll crop the image to the
        // thumbnail.
        var scale = Math.max(scalex, scaley);

        // If the image was already thumbnail size, it is its own thumbnail.
        if (scale >= 1) {
          offscreenImage.removeAttribute('src');
          callback('original', pictureBlob);
          return;
        }

        // Calculate the region of the image that will be copied to the
        // canvas to create the thumbnail.
        var w = Math.round(THUMBNAIL_WIDTH / scale);
        var h = Math.round(THUMBNAIL_HEIGHT / scale);
        var x = Math.round((offscreenImage.width - w) / 2);
        var y = Math.round((offscreenImage.height - h) / 2);

        // Draw that region of the image into the canvas, scaling it down.
        context.drawImage(offscreenImage, x, y, w, h,
                          0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

        // We're done with the image now.
        offscreenImage.removeAttribute('src');
        URL.revokeObjectURL(blobURL);

        canvas.toBlob(function(canvasBlob) {
          callback('thumbnail', canvasBlob);
        }, 'image/jpeg');
      };
    }

    /**
     * Check for the existence of a thumbnail on the audio file's storage area,
     * and if it's not present, save it.
     *
     * @param {Blob} coverBlob The blob for the full-size cover art.
     * @param {string} thumbnailFilename A relative filename for the thumbnail.
     * @param {function} callback A callback to call when finished.
     */
    function checkSaveThumbnail(coverBlob, thumbnailFilename, callback) {
      var storageName = '';

      // Look at the filename for the audio file to figure out where we should
      // put the thumbnail. Since the first part of the filename is the storage
      // name, we can use that to ensure deviceStorage puts the thumbnail on the
      // same storage area (no matter which deviceStorage we have).
      //
      // Filename is usually a fully qualified name (perhaps something like
      // /sdcard/Music/file.mp3). On desktop, it's a relative name, but desktop
      // only has one storage area anyway.
      if (filename[0] === '/') {
        var slashIndex = filename.indexOf('/', 1);
        if (slashIndex < 0) {
          console.error("handleCoverArt: Bad filename: '" + filename + "'");
          delete metadata.picture;
          callback();
          return;
        }

        // Get the storage name, e.g. /sdcard/
        var storageName = filename.substring(0, slashIndex + 1);
      }

      var thumbnailAbsPath = storageName + '.music/covers/' + thumbnailFilename;
      var getthumbrequest = pictureStorage.get(thumbnailAbsPath);

      // We already have the thumbnail. We're done!
      getthumbrequest.onsuccess = function() {
        metadata.picture.thumbnail = thumbnailAbsPath;
        callback();
      };

      // We don't have the thumbnail yet. Let's save it.
      getthumbrequest.onerror = function() {
        thumbnailizePicture(coverBlob, function(type, thumbnailBlob) {
          if (type === 'error') {
            delete metadata.picture;
          } else if (type === 'thumbnail' ||
                     metadata.picture.flavor === 'unsynced') {
            var saverequest = pictureStorage.addNamed(thumbnailBlob,
                                                      thumbnailAbsPath);
            saverequest.onerror = function() {
              console.error('Could not save cover image', filename);
            };

            // Don't bother waiting for saving to finish. Just return.
            metadata.picture.thumbnail = thumbnailAbsPath;
          }

          callback();
        });
      };
    }
  }
}

var thumbnailCache = {};
function getThumbnailURL(fileinfo, callback) {
  var picture = fileinfo.metadata.picture;

  if (!picture) {
    callback(null);
    return;
  }

  // Audio tracks without an associated file are just temporary, so they store
  // their art in a blob.
  if (picture.blob) {
    var url = URL.createObjectURL(picture.blob);
    callback(url);
    return;
  }

  var cacheKey;

  // Check if we have an external file on the filesystem for the cover art.
  var pictureFilename = picture.thumbnail || picture.original;
  if (pictureFilename) {
    cacheKey = 'external:' + pictureFilename;
    if (cacheKey in thumbnailCache) {
      callback(thumbnailCache[cacheKey]);
      return;
    }

    var getreq = pictureStorage.get(pictureFilename);
    getreq.onsuccess = function() {
      var url = URL.createObjectURL(this.result);
      thumbnailCache[cacheKey] = url;
      callback(url);
    };
    return;
  }

  // Check if the cover art is embedded in the audio file.
  if (picture.flavor === 'embedded') {
    var album = fileinfo.metadata.album;
    var artist = fileinfo.metadata.artist;
    var size = fileinfo.metadata.picture.end - fileinfo.metadata.picture.start;

    if (album || artist) {
      cacheKey = 'embedded:' + album + '.' + artist + '.' + size;
    } else {
      cacheKey = 'embedded:' + (fileinfo.name || fileinfo.blob.name);
    }

    if (cacheKey in thumbnailCache) {
      callback(thumbnailCache[cacheKey]);
      return;
    }

    var embedded = fileinfo.blob.slice(
      picture.start, picture.end, picture.type
    );
    var embeddedURL = URL.createObjectURL(embedded);
    thumbnailCache[cacheKey] = embeddedURL;
    callback(embeddedURL);
  }

  // We should never get here!
  throw Error('unknown picture flavor: ' + picture.flavor);
}
