'use strict';

var pictureStorage = navigator.getDeviceStorage('pictures');

// A cache of metadata Picture objects for albums with external cover art. The
// key is the directory name for the song in question.
var externalCoverCache = {};

// A cache of filenames for saved cover art (generated from unsycned ID3 tags).
// The value is the absolute path name.
var savedCoverCache = new Set();

// XXX We're hiding the fact that these are JSdoc comments because our linter
// refuses to accept "property" as a valid tag. Grumble grumble.

/*
 * Metadata for a track.
 *
 * @typedef {Object} Metadata
 * @property {String} tag_format The format of the tag (e.g. id3v2.4).
 * @property {string} artist The track's artist.
 * @property {string} album The track's album.
 * @property {number} tracknum The number of the track on the album.
 * @property {string} title The track's title.
 * @property {Picture} [picture] The cover art, if any.
 * @property {number} rated The track's rating; starts at 0.
 * @property {number} played The track's play count; starts at 0.
 */

/*
 * Metadata describing the cover art for a track. Cover art comes in one of
 * three flavors: embedded (stored in the audio track's metadata), unsynced
 * (like embedded, but stored in an unsynchronized block of ID3 data; we
 * ultimately save it in an external file), or external (stored as a separate
 * file in the same directory as the audio track).
 *
 * @typedef {Object} Picture
 * @property {string} flavor How the art was stored; one of "embedded",
 *   "unsynced", or "external".
 * @property {number} [start] The offset in bytes to where the picture is
 *   stored in the audio file; only applies when flavor="embedded".
 * @property {number} [end] The offset in bytes to the end of where the
 *   picture is stored in the audio file; only applies when flavor="embedded".
 * @property {number} [type] The mimetype of the picture; only applies when
 *   flavor="embedded".
 * @property {string} [filename] The path on the filesystem to the original
 *   (full-size) picture; only applies when flavor="external" or "unsynced".
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
  var TAG_FORMAT = 'tag_format';
  var TITLE = 'title';
  var ARTIST = 'artist';
  var ALBUM = 'album';
  var TRACKNUM = 'tracknum';
  var TRACKCOUNT = 'trackcount';
  var DISCNUM = 'discnum';
  var DISCCOUNT = 'disccount';
  var IMAGE = 'picture';

  // Fields that should be stored as integers, not strings
  var INTFIELDS = [
    TRACKNUM, TRACKCOUNT, DISCNUM, DISCCOUNT
  ];

  // These two properties are for playlist functionalities
  // not originally metadata from the files
  var RATED = 'rated';
  var PLAYED = 'played';

  // Map ogg field names to metadata property names
  var OGGFIELDS = {
    title: TITLE,
    artist: ARTIST,
    album: ALBUM,
    tracknumber: TRACKNUM,
    tracktotal: TRACKCOUNT,
    discnumber: DISCNUM,
    disctotal: DISCCOUNT
  };

  // Map MP4 atom names to metadata property names
  var MP4ATOMS = {
    '\xa9alb': ALBUM,
    '\xa9art': ARTIST,
    '\xa9ART': ARTIST,
    'aART': ARTIST,
    '\xa9nam': TITLE,
    'trkn': TRACKNUM,
    'disk': DISCNUM,
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
    if (p2 === -1) {
      p2 = filename.length;
    }
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
        console.log("HIIIIIII");
        LazyLoader.load('js/metadata/id3v2.js', function() {
          ID3v2Metadata.parse(header, metadata).then(
            handleCoverArt, errorCallback
          );
        });
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
    if (p !== -1) {
      title = title.substring(0, p);
    }
    p = artist.indexOf('\0');
    if (p !== -1) {
      artist = artist.substring(0, p);
    }
    p = album.indexOf('\0');
    if (p !== -1) {
      album = album.substring(0, p);
    }

    metadata[TAG_FORMAT] = 'id3v1';
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
          metadata[TAG_FORMAT] = 'vorbis';
          break;
        case 79:
          valid = page.readASCIIText(7) === 'pusTags';
          metadata[TAG_FORMAT] = 'opus';
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
            if (INTFIELDS.indexOf(propname) !== -1) {
              value = parseInt(value, 10);
            }
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
    metadata[TAG_FORMAT] = 'mp4';
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
            // Track number and disc number are of the form
            // "x/y".
            if (type === 'trkn' || type === 'disk') {
              metadata[propname] = value.number;
              if (value.count) {
                metadata[(propname === TRACKNUM) ? TRACKCOUNT : DISCCOUNT] =
                  value.count;
              }
            }
            else {
              metadata[propname] = value;
            }
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

        // Special case for track number and disk number
        // They have two values: number and count.
        if (atomtype === 'trkn' || atomtype === 'disk') {
          data.advance(2);
          var number = data.readUnsignedShort();
          var count = data.readUnsignedShort();
          return { number: number, count: count };
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

  function handleCoverArt(metadata) {
    // Media files that aren't backed by actual files get the picture as a Blob,
    // since they're just temporary. We also use this in our tests.
    if (!filename) {
      if (metadata.picture && !metadata.picture.blob) {
        metadata.picture.blob = blob.slice(
          metadata.picture.start, metadata.picture.end, metadata.picture.type
        );
      }
      metadataCallback(metadata);
      return;
    }

    if (!metadata.picture) {
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
          metadata.picture = { flavor: 'external',
                               filename: externalCoverFilename };
          // Cache the picture object we generated to make things faster.
          externalCoverCache[dirName] = metadata.picture;
          metadataCallback(metadata);
        };
        getcoverrequest.onerror = function() {
          tryFetchExternalCover(index + 1);
        };
      };
      tryFetchExternalCover(0);
    } else if (metadata.picture.blob) {
      // We have album art in a separate blob that we need to save somewhere;
      // generally, this is because we had an unsynced ID3 frame with the art
      // and needed to de-unsync it.
      //
      // First, try to make a unique filename for the image based on the artist,
      // album, and file size. The file size is essentially a poor man's
      // checksum to make sure we aren't reusing an inappropriate image, such as
      // if the user updated the embedded art.
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

      var coverBlob = metadata.picture.blob;
      delete metadata.picture.blob;

      // coverBlob is always a JPEG or PNG.
      var extension = coverBlob.type === 'image/jpeg' ? '.jpg' : '.png';
      var imageFilename = vfatEscape(albumKey) + '.' + coverBlob.size +
                          extension;
      checkSaveCover(coverBlob, imageFilename, function() {
        metadataCallback(metadata);
      });
    } else {
      // We have embedded album art! All the processing is already done, so we
      // can just return.
      metadataCallback(metadata);
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
     * Check for the existence of an image on the audio file's storage area,
     * and if it's not present, try to save it.
     *
     * @param {Blob} coverBlob The blob for the full-size cover art.
     * @param {string} imageFilename A relative filename for the image.
     * @param {function} callback A callback to call when finished.
     */
    function checkSaveCover(coverBlob, imageFilename, callback) {
      var storageName = '';

      // We want to put the image in the same storage area as the audio track
      // it's for. Since the audio track could be in any storage area, we'll
      // examine its filename to get the storage name; the storage name is
      // always the first part of the (absolute) filename, so we'll grab that
      // and build an absolute path for the image. This will ensure that the
      // generic deviceStorage we use for pictures ("pictureStorage") puts the
      // image where we want it.
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

      var imageAbsPath = storageName + '.music/covers/' + imageFilename;
      if (savedCoverCache.has(imageAbsPath)) {
        metadata.picture.filename = imageAbsPath;
        callback();
        return;
      }

      var getrequest = pictureStorage.get(imageAbsPath);

      // We already have the image. We're done!
      getrequest.onsuccess = function() {
        savedCoverCache.add(imageAbsPath);
        metadata.picture.filename = imageAbsPath;
        callback();
      };

      // We don't have the image yet. Let's save it.
      getrequest.onerror = function() {
        var saverequest = pictureStorage.addNamed(coverBlob, imageAbsPath);
        saverequest.onerror = function() {
          console.error('Could not save cover image', filename);
        };

        // Don't bother waiting for saving to finish. Just return.
        savedCoverCache.add(imageAbsPath);
        metadata.picture.filename = imageAbsPath;
        callback();
      };
    }
  }
}
