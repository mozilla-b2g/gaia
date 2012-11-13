'use strict';

// Parse the specified blob and pass an object of metadata to the
// metadataCallback, or invoke the errorCallback with an error message.
function parseAudioMetadata(blob, metadataCallback, errorCallback) {
  if (!errorCallback)
    errorCallback = function(s) { console.error(s); }

  // These are the property names we use in the returned metadata object
  var TITLE = 'title';
  var ARTIST = 'artist';
  var ALBUM = 'album';
  var TRACKNUM = 'tracknum';
  var IMAGE = 'picture';
  var THUMBNAIL = 'thumbnail';

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
  var MP4Types = {
    'M4A ' : true,  // iTunes audio.  Note space in property name.
    'M4B ' : true,  // iTunes audio book. Note space.
    'mp42' : true   // MP4 version 2
  };

  // If we generate our own thumbnails, aim for this size
  // Here we choice the size of main tile which is 210px * 210px
  var THUMBNAIL_WIDTH = 210;
  var THUMBNAIL_HEIGHT = 210;
  // To save memory (because of gecko bugs) we want to create only one
  // offscreen image and reuse it.
  var offscreenImage = new Image();

  // Start off with some default metadata
  var metadata = {};
  metadata[ARTIST] = metadata[ALBUM] = metadata[TITLE] = '';
  metadata[RATED] = metadata[PLAYED] = 0;

  // If the blob has a name, use that as a default title in case
  // we can't find one in the file
  if (blob.name) {
    var p1 = blob.name.lastIndexOf('/');
    var p2 = blob.name.lastIndexOf('.');
    if (p2 === -1)
      p2 = blob.name.length;
    metadata[TITLE] = blob.name.substring(p1 + 1, p2);
  }

  // Read the start of the file, figure out what kind it is, and call
  // the appropriate parser.  Start off with an 8kb chunk of data.
  // If the file contains album art, we'll have to go back and read
  // a bigger chunk, but if it doesn't we probably won't need another read.
  var headersize = Math.min(8 * 1024, blob.size);
  BlobView.get(blob, 0, headersize, function(header, error) {
    if (error) {
      errorCallback(error);
      return;
    }

    try {
      var magic = header.getASCIIText(0, 11);

      if (magic.substring(0, 3) === 'ID3') {
        // parse ID3v2 tags in an MP3 file
        parseID3v2Metadata(header);
      }
      else if (magic.substring(0, 4) === 'OggS') {
        // parse metadata from an Ogg Vorbis file
        parseOggMetadata(header);
      }
      else if (magic.substring(4, 8) === 'ftyp' &&
               magic.substring(8, 12) in MP4Types) {
        // parse metadata from an MP4 file
        parseMP4Metadata(header);
      }
      else if ((header.getUint16(0, false) & 0xFFFE) === 0xFFFA) {
        // If this looks like an MP3 file, then look for ID3v1 metadata
        // tags at the end of the file. But even if there is no metadata
        // treat this as a playable file.

        // Read bytes from the end of the file to see if it has
        // ID3v1 tags there. But make sure it is big enough first
        if (blob.size < 128) {
          errorCallback('unknown file type; file is too small');
          return;
        }

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
        var canplay = blob.type && player.canPlayType(blob.type);
        if (canplay === 'probably') {
          metadataCallback(metadata);
        }
        else {
          var url = URL.createObjectURL(blob);
          player.src = url;

          player.onerror = function() {
            URL.revokeObjectURL(url);
            errorCallback('Unplayable music file');
          };

          player.oncanplay = function() {
            URL.revokeObjectURL(url);
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
          var tagvalue;

          switch (tagid) {
          case 'TIT2':
          case 'TT2':
          case 'TPE1':
          case 'TP1':
          case 'TALB':
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

      if (page.readByte() !== 3 || page.readASCIIText(6) !== 'vorbis') {
        errorCallback('malformed ogg comment packet');
      }

      var vendor_string_length = page.readUnsignedInt(true);
      page.advance(vendor_string_length); // skip libvorbis vendor string

      var num_comments = page.readUnsignedInt(true);
      for (var i = 0; i < num_comments; i++) {
        var comment_length = page.readUnsignedInt(true);
        var comment = page.readUTF8Text(comment_length);
        var equal = comment.indexOf('=');
        if (equal !== -1) {
          var tag = comment.substring(0, equal).toLowerCase().replace(' ', '');
          var propname = OGGTAGS[tag];
          if (propname) { // Do we care about this tag?
            var value = comment.substring(equal + 1);
            if (propname in metadata) {          // Do we already have a value?
              metadata[propname] += ' ' + value; // Then append this new one.
            }
            else {                               // Otherwise
              metadata[propname] = value;        // just save the single value.
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

  //
  // XXX: probably not working right. Need a special case for
  //   the track number atom?
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
    // the time to refactor, though...
    //

    function nextAtom(view, callback) {
      // The size of this atom tells us the position of the next. We want to
      // be sure that we always read an extra 8 bytes so we know the size and
      // type of the next atom, too.
      var thisAtomSize = view.getUint32(0);
      var nextAtomSize = view.getUint32(thisAtomSize);
      var nextAtomStart = view.sliceOffset + view.byteOffset + thisAtomSize;
      view.getMore(nextAtomStart, nextAtomSize + 8, callback);
    }

    // Our header view is on the ftyp atom. Read the subsequent atoms
    // until we find the moov atom (likely the next one).
    nextAtom(header, findMoovAtom);

    function findMoovAtom(atom) {
      var size = atom.readUnsignedInt();
      var type = atom.readASCIIText(4);

      if (type === 'moov') {
        try {
          parseMoovAtom(atom, atom.index + size - 8);
          handleCoverArt(metadata);
          return;
        }
        catch (e) {
          console.error('MP4 metadata failure:', e);
          errorCallback(e);
        }
      }
      else {
        // If the next atom is 'mdat', then its a huge data atom
        // that we don't want to read, so quit
        var nexttype = atom.getASCIIText(size + 4, 4);
        if (nexttype === 'mdat') {
          // we didn't find any metadata, return an empty object
          metadataCallback(metadata);
          return;
        }
        // Otherwise, recurse and keep looking for the moov atom
        nextAtom(atom, findMoovAtom);
      }
    }

    // Once we've found the moov atom, here's what we do with it.
    // This function, and the ones that follow are all synchronous.
    // We've read the entire moov atom, so we've got all the bytes
    // we need and don't have to do an async read again.
    function parseMoovAtom(data, end) {
      // Find the udta atom within the moov atom
      while (data.index < end) {
        var size = data.readUnsignedInt();
        var type = data.readASCIIText(4);
        if (type === 'udta') {
          parseUdtaAtom(data, data.index + size - 8);
          data.index = end;
          return;
        }
        else {
          data.advance(size - 8);
        }
      }
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
            console.error('skipping', type, ':', e);
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

  // Load an image from a blob into an <img> tag, and then use that
  // to get its dimensions and create a thumbnail. Store these values in
  // the metadata object if they are not already there, and then continue
  // to the callback function
  function handleCoverArt(metadata) {
    if (!metadata[IMAGE]) {
      metadataCallback(metadata);
      return;
    }

    var imageblob = blob.slice(metadata[IMAGE].start,
                               metadata[IMAGE].end,
                               metadata[IMAGE].type);

    var url = URL.createObjectURL(imageblob);
    offscreenImage.src = url;

    offscreenImage.onerror = function() {
      console.warn('Album image failed to load');
      offscreenImage.src = null;
      URL.revokeObjectURL(url);
      metadataCallback(metadata);
    };

    offscreenImage.onload = function() {
      URL.revokeObjectURL(url);

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
        metadata[THUMBNAIL] = imageblob;
        metadataCallback(metadata);
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

      canvas.toBlob(function(blob) {
        metadata[THUMBNAIL] = blob;
        metadataCallback(metadata);
      }, 'image/jpeg');
    }
  }
}

