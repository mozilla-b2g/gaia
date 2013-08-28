'use strict';

// Parse the specified blob and pass an object of metadata to the
// metadataCallback, or invoke the errorCallback with an error message.
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

  // Map id3v2 tag ids to metadata property names
  var ID3V2TAGS = {
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

  // Map ogg tagnames to metadata property names
  var OGGTAGS = {
    title: TITLE,
    artist: ARTIST,
    album: ALBUM,
    tracknumber: TRACKNUM
  };

  // Map MP4 atom names to metadata property names
  var MP4TAGS = {
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
        // parse ID3v2 tags in an MP3 file
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
        // tags at the end of the file. But even if there is no metadata
        // treat this as a playable file.

        BlobView.get(blob, blob.size - 128, 128, function(footer, error) {
          if (error) {
            errorCallback(error);
            return;
          }

          try {
            var magic = footer.getASCIIText(0, 3);
            if (magic === 'TAG') {
              // It is an MP3 file with ID3v1 tags
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
    var needs_unsynchronization = ((id3flags & 0x80) !== 0);
    var has_extended_header = ((id3flags & 0x40) !== 0);
    var length = header.readID3Uint28BE();

    // XXX
    // For now, we just punt if unsynchronization is required.
    // That's what the old metadata parser did, too.
    // I don't think it is very common in mp3 files today.
    if (needs_unsynchronization) {
      console.warn('mp3 file uses unsynchronization. Can\'t read metadata');
      metadataCallback(metadata);
      return;
    }

    // Get the entire ID3 data block and pass it to parseID3()
    // May be async, or sync, depending on whether we read enough
    // bytes when we read the header
    header.getMore(header.index, length, parseID3);

    function parseID3(id3) {
      // skip the extended header, if there is one
      if (has_extended_header) {
        id3.advance(id3.readUnsignedInt());
      }

      // Now we have a series of frames, each of which is one ID3 tag
      while (id3.index < id3.byteLength) {
        var tagid, tagsize, tagflags;

        // If there is a null byte here, then we've found padding
        // and we're done
        if (id3.getUint8(id3.index) === 0)
          break;

        switch (id3version) {
        case 2:
          tagid = id3.readASCIIText(3);
          tagsize = id3.readUint24();
          tagflags = 0;
          break;
        case 3:
          tagid = id3.readASCIIText(4);
          tagsize = id3.readUnsignedInt();
          tagflags = id3.readUnsignedShort();
          break;
        case 4:
          tagid = id3.readASCIIText(4);
          tagsize = id3.readID3Uint28BE();
          tagflags = id3.readUnsignedShort();
          break;
        }

        var nexttag = id3.index + tagsize;
        var tagname = ID3V2TAGS[tagid];

        // Skip tags we don't care about
        if (!tagname) {
          id3.index = nexttag;
          continue;
        }

        // Skip compressed, encrypted, grouped, or synchronized tags that
        // we can't decode
        if ((tagflags & 0xFF) !== 0) {
          console.warn('Skipping', tagid, 'tag with flags', tagflags);
          id3.index = nexttag;
          continue;
        }

        // Wrap it in try so we don't crash the whole thing on one bad tag
        try {
          // Now get the tag value
          var tagvalue = null;

          switch (tagid) {
          case 'TIT2':
          case 'TT2':
          case 'TPE1':
          case 'TP1':
          case 'TALB':
          case 'TAL':
            tagvalue = readText(id3, tagsize);
            break;
          case 'TRCK':
          case 'TRK':
            tagvalue = parseInt(readText(id3, tagsize));
            break;
          case 'APIC':
          case 'PIC':
            tagvalue = readPic(id3, tagsize, tagid);
            break;
          }

          if (tagvalue !== null)
            metadata[tagname] = tagvalue;
        }
        catch (e) {
          console.warn('Error parsing mp3 metadata tag', tagid, ':', e);
        }

        // Make sure we're at the start of the next tag before continuing
        id3.index = nexttag;
      }

      handleCoverArt(metadata);
    }

    function readPic(view, size, id) {
      var start = view.index;
      var encoding = view.readUnsignedByte();
      var mimetype;
      // mimetype is different for old PIC tags and new APIC tags
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
      var desc = readText(view, size - (view.index - start), encoding);

      var picstart = view.sliceOffset + view.viewOffset + view.index;
      var piclength = size - (view.index - start);

      // Now return an object that specifies where to pull the image from
      // The properties of this object can be passed to blob.slice()
      return {
        start: picstart,
        end: picstart + piclength,
        type: mimetype
      };
    }

    function readText(view, size, encoding) {
      if (encoding === undefined) {
        encoding = view.readUnsignedByte();
        size = size - 1;
      }
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
        var comment_length = page.readUnsignedInt(true);
        var comment = page.readUTF8Text(comment_length);
        var equal = comment.indexOf('=');
        if (equal !== -1) {
          var tag = comment.substring(0, equal).toLowerCase().replace(' ', '');
          var propname = OGGTAGS[tag];
          if (propname) { // Do we care about this tag?
            var value = comment.substring(equal + 1);
            if (seen_fields.hasOwnProperty(propname)) {
              // If we already have a value, append this new one.
              metadata[propname] += ' ' + value;
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
        var tagname = MP4TAGS[type];
        if (tagname) {
          try {
            var value = getMetadataValue(data, next, type);
            metadata[tagname] = value;
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
    function getMetadataValue(data, end, tagtype) {
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
        if (tagtype === 'trkn') {
          data.advance(2);
          return data.readUnsignedShort();
        }

        switch (datatype) {
        case 1: // utf8 text
          return data.readUTF8Text(datasize);
        case 13: // jpeg
          return {
            start: data.sliceOffset + data.viewOffset + data.index,
            end: data.sliceOffset + data.viewOffset + data.index + datasize,
            type: 'image/jpeg'
          };
        case 14: // png
          return {
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

  // Before we call the metadataCallback, we create a thumbnail
  // for the song, if there is not already one cached.  In the normal
  // (cache hit) case, this happens synchronously.
  function handleCoverArt(metadata) {
    var fileinfo = {
      name: blob.name,
      blob: blob,
      metadata: metadata
    };
    // We call getThumbnailURL here even though we don't need the url yet.
    // We do it here to force the thumbnail to be cached now while
    // we know there is just going to be one file at a time.
    getThumbnailURL(fileinfo, function(url) {
      metadataCallback(metadata);
    });
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
}

// When we generate our own thumbnails, aim for this size
var THUMBNAIL_WIDTH = 300;
var THUMBNAIL_HEIGHT = 300;
var offscreenImage = new Image();
var thumbnailCache = {};  // maps keys to blob urls

// Get a thumbnail image for the specified song (reading from the
// cache if possible and storing to the cache if necessary) and pass a
// blob URL for it it to the specified callback. fileinfo is an object
// with metadata from the MediaDB.
function getThumbnailURL(fileinfo, callback) {
  function cacheThumbnail(key, blob, url) {
    asyncStorage.setItem(key, blob);
    thumbnailCache[key] = url;
  }

  var metadata = fileinfo.metadata;

  // If the file doesn't have an embedded image, just pass null
  if (!metadata.picture) {
    callback(null);
    return;
  }

  // We cache thumbnails based on the song artist, album, and image size.
  // If there is no album name, we use the directory name instead.
  var key = 'thumbnail';
  var album = metadata.album;
  var artist = metadata.artist;
  var size = metadata.picture.end - metadata.picture.start;

  if (album || artist) {
    key = 'thumbnail.' + album + '.' + artist + '.' + size;
  }
  else {
    key = 'thumbnail.' + (fileinfo.name || fileinfo.blob.name);
  }

  // If we have the thumbnail url locally, just call the callback
  var url = thumbnailCache[key];
  if (url) {
    callback(url);
    return;
  }

  // Otherwise, see if we've saved a blob in asyncStorage
  asyncStorage.getItem(key, function(blob) {
    if (blob) {
      // If we get a blob, save the URL locally and return the url.
      var url = URL.createObjectURL(blob);
      thumbnailCache[key] = url;
      callback(url);
      return;
    }
    else {
      // Otherwise, create the thumbnail image
      createAndCacheThumbnail();
    }
  });

  function createAndCacheThumbnail() {
    if (fileinfo.blob) {       // this can happen for the open activity
      getImage(fileinfo.blob);
    }
    else {                     // this is the normal case
      musicdb.getFile(fileinfo.name, function(file) {
        getImage(file);
      });
    }

    function getImage(file) {
      // Get the embedded image from the music file
      var embedded = file.slice(metadata.picture.start,
                                metadata.picture.end,
                                metadata.picture.type);
      // Convert to a blob url
      var embeddedURL = URL.createObjectURL(embedded);
      // Load it into an image element
      offscreenImage.src = embeddedURL;
      offscreenImage.onerror = function() {
        URL.revokeObjectURL(embeddedURL);
        offscreenImage.removeAttribute('src');
        // Something went wrong reading the embedded image.
        // Return a default one instead
        console.warn('Album cover art failed to load', file.name);
        callback(null);
      };
      offscreenImage.onload = function() {
        // We've loaded the image, now copy it to a canvas
        var canvas = document.createElement('canvas');
        canvas.width = THUMBNAIL_WIDTH;
        canvas.height = THUMBNAIL_HEIGHT;
        var context = canvas.getContext('2d');
        var scalex = canvas.width / offscreenImage.width;
        var scaley = canvas.height / offscreenImage.height;

        // Take the larger of the two scales: we crop the image to the thumbnail
        var scale = Math.max(scalex, scaley);

        // If the image was already thumbnail size, it is its own thumbnail
        if (scale >= 1) {
          offscreenImage.removeAttribute('src');
          cacheThumbnail(key, embedded, embeddedURL);
          callback(embeddedURL);
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
        offscreenImage.removeAttribute('src');
        URL.revokeObjectURL(embeddedURL);

        canvas.toBlob(function(blob) {
          var url = URL.createObjectURL(blob);
          cacheThumbnail(key, blob, url);
          callback(url);
        }, 'image/jpeg');
      };
    }
  }
}
