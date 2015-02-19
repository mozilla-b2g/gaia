/* exported MP4Metadata */
'use strict';

/**
 * Parse files with MP4 metadata.
 *
 * Format information:
 *   https://developer.apple.com/library/mac/#documentation/QuickTime/QTFF/
 *     QTFFChap1/qtff1.html
 *   http://en.wikipedia.org/wiki/MPEG-4_Part_14
 *   http://atomicparsley.sourceforge.net/mpeg-4files.html
 */
var MP4Metadata = (function() {
  // Map MP4 atom names to metadata property names
  var MP4ATOMS = {
    '\xa9alb' : 'album',
    '\xa9art' : 'artist',
    '\xa9ART' : 'artist',
    'aART'    : 'artist',
    '\xa9nam' : 'title',
    'trkn'    : 'tracknum',
    'disk'    : 'discnum',
    'covr'    : 'picture'
  };

  // These MP4 atoms are stored as pairs of integers, so they get mapped to
  // two metadata fields
  var MP4INTPAIRATOMS = {
    'trkn': 'trackcount',
    'disk': 'disccount'
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

  /**
   * Parse a file and return a Promise with the metadata.
   *
   * @param {BlobView} blobview The audio file to parse.
   * @return {Promise} A Promise returning the parsed metadata object.
   */
  function parse(blobview) {
    if (!checkMP4Type(blobview, MP4Types)) {
      // The MP4 file might be a video or it might be some
      // kind of audio that we don't support. We used to treat
      // files like these as unknown files and see (in the code below)
      // whether the <audio> tag could play them. But we never parsed
      // metadata from them, so even if playable, we didn't have a title.
      // And, the <audio> tag was treating videos as playable.
      return Promise.reject(new Error('Unknown MP4 file type'));
    }

    var metadata = {};
    metadata.tag_format = 'mp4';
    return findMoovAtom(blobview, metadata).then(function(result) {
      if (!result) {
        return metadata;
      }
      return parseMoovAtom(result.atom, result.size, metadata);
    });
  }

  /**
   * Check the type of MP4 file to ensure we should play it. (MP4 files use
   * 'ftyp' to identify the type of encoding. For more information, see:
   * <http://www.ftyps.com/what.html>.)
   *
   * @param {BlobView} blobview The audio file to parse.
   * @param {Object} types A list of types we support.
   * @return {Boolean} True if the file should be parsed, false otherwise.
   */
  function checkMP4Type(blobview, types) {
    // The major brand is the four bytes right after 'ftyp'.
    var majorbrand = blobview.getASCIIText(8, 4);

    if (majorbrand in types) {
      return true;
    } else {
      // Check the rest for the compatible brands. They are every four bytes
      // after the version of major brand. Usually there are two optional
      // compatible brands, but an arbitrary number of other compatible brands
      // are also acceptable, so we will check all the compatible brands until
      // the header ends.
      var index = 16;
      var size = blobview.getUint32(0);

      while (index < size) {
        var compatiblebrand = blobview.getASCIIText(index, 4);
        index += 4;
        if (compatiblebrand in types) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Find the "moov" atom in the MP4 container.
   *
   * @param {BlobView} atom The file we're parsing.
   * @return {Promise} A promise that resolves when we've found the move atom.
   */
  function findMoovAtom(atom) {
    // XXX: I think I could probably restructure this somehow. The atoms or
    // "boxes" we're reading and parsing here for a tree that I need to
    // traverse. Maybe nextBox() and firstChildBox() functions would be
    // helpful. Or even make these methods of BlobView? Not sure if it is worth
    // the time to refactor, though... See also the approach in
    // shared/js/get_video_rotation.js
    return new Promise(function(resolve, reject) {
      var offset = atom.sliceOffset + atom.viewOffset; // position in blob
      var size = atom.readUnsignedInt();
      var type = atom.readASCIIText(4);

      if (size === 0) {
        // A size of 0 means the rest of the file
        size = atom.blob.size - offset;
      } else if (size === 1) {
        // A size of 1 means the size is in bytes 8-15
        size = atom.readUnsignedInt() * 4294967296 + atom.readUnsignedInt();
      }

      if (type === 'moov') {
        // Get the full contents of this atom
        atom.getMore(offset, size, function(moov) {
          resolve({atom: moov, size: size});
        });
      } else {
        // Otherwise, get the start of the next atom and recurse
        // to continue the search for the moov atom.
        // If we're reached the end of the blob without finding
        // anything, just call the metadata callback with no metadata
        if (offset + size + 16 <= atom.blob.size) {
          atom.getMore(offset + size, 16, function(moov) {
            try {
              findMoovAtom(moov).then(function(result) {
                resolve(result);
              });
            } catch (e) {
              reject(e);
            }
          });
        } else {
          resolve(null);
        }
      }
    });
  }

  /**
   * Parse the moov atom. This function, and the ones that follow are all
   * synchronous. We've read the entire moov atom, so we've got all the bytes
   * we need and don't have to do an async read again.
   *
   * @param {BlobView} data The data for the moov atom.
   * @param {Number} end The offset at which the moov atom ends.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   * @return {Metadata} The completed metadata object.
   */
  function parseMoovAtom(data, end, metadata) {
    data.advance(8); // skip the size and type of this atom

    // Find the udta and trak atoms within the moov atom
    // There will only be one udta atom, but there may be multiple trak
    // atoms. In that case, this is probably a movie file and we'll reject
    // it when we find a track that is not an mp4 audio codec.
    while (data.index < end) {
      var size = data.readUnsignedInt();
      var type = data.readASCIIText(4);
      var nextindex = data.index + size - 8;
      if (type === 'udta') {         // Metadata is inside here
        parseUdtaAtom(data, end, metadata);
      } else if (type === 'trak') {  // We find the audio format inside here
        data.advance(-8); // skip back to beginning
        if (seekChildAtoms(data, ['mdia', 'minf'])) {
          if (searchChildAtom(data, 'vmhd')) {
            throw Error('Found video track in MP4 container');
          }
          if (searchChildAtom(data, 'smhd')) {
            if (seekChildAtoms(data, ['stbl', 'stsd'])) {
              data.advance(20);
              var codec = data.readASCIIText(4);
              if (!(codec in MP4Codecs)) {
                throw Error('Unsupported format in MP4 container: ' + codec);
              }
            }
          }
        } else {
          // There is not enough information for us to identify the MP4
          throw Error('Not enough metadata in MP4 container!');
        }
      }
      data.seek(nextindex);
    }
    return metadata;
  }

  /**
   * Find the specified hierarchy of atoms and stop at the last one's file
   * offset.
   *
   * @param {BlobView} data The data for the moov atom.
   * @param {Array} atoms The names of the atoms to find.
   * @return {Boolean} True if we found the atoms, false otherwise.
   */
  function seekChildAtoms(data, atoms) {
    return atoms.every(function(atom) {
      return seekChildAtom(data, atom);
    });
  }

  /**
   * Find a child atom and stop at its file offset.
   *
   * @param {BlobView} data The data for the moov atom.
   * @param {String} atom The name of the atom to find.
   * @return {Boolean} True if we found the atom, false otherwise.
   */
  function seekChildAtom(data, atom) {
    var start = data.index;
    var length = data.readUnsignedInt();
    data.advance(4);

    while (data.index < start + length) {
      var size = data.readUnsignedInt();
      var type = data.readASCIIText(4);
      if (type === atom) {
        data.advance(-8);
        return true;
      }
      else {
        data.advance(size - 8);
      }
    }

    return false;
  }

  /**
   * Find a child atom, but reset the file offset to the start after completion.
   *
   * @param {BlobView} data The data for the moov atom.
   * @param {String} atom The name of the atom to find.
   * @return {Boolean} True if we found the atom, false otherwise.
   */
  function searchChildAtom(data, atom) {
    var start = data.index;
    var result = seekChildAtom(data, atom);
    data.seek(start);

    return result;
  }

  /**
   * Parse the udta atom.
   *
   * @param {BlobView} data The data for the moov atom.
   * @param {Number} end The offset at which the moov atom ends.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   */
  function parseUdtaAtom(data, end, metadata) {
    // Find the meta atom within the udta atom
    while (data.index < end) {
      var size = data.readUnsignedInt();
      var type = data.readASCIIText(4);
      if (type === 'meta') {
        parseMetaAtom(data, data.index + size - 8, metadata);
        data.seek(end);
        return;
      } else {
        data.advance(size - 8);
      }
    }
  }

  /**
   * Parse the meta atom.
   *
   * @param {BlobView} data The data for the moov atom.
   * @param {Number} end The offset at which the moov atom ends.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   */
  function parseMetaAtom(data, end, metadata) {
    // The meta atom apparently has a slightly different structure.
    // Have to skip flag bytes before reading children atoms
    data.advance(4);

    // Find the ilst atom within the meta atom
    while (data.index < end) {
      var size = data.readUnsignedInt();
      var type = data.readASCIIText(4);
      if (type === 'ilst') {
        parseIlstAtom(data, data.index + size - 8, metadata);
        data.seek(end);
        return;
      }
      else {
        data.advance(size - 8);
      }
    }
  }

  /**
   * Parse the ilst atom, which (finally) contains all our metadata atom.
   *
   * @param {BlobView} data The data for the moov atom.
   * @param {Number} end The offset at which the moov atom ends.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   */
  function parseIlstAtom(data, end, metadata) {
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
          // Track number and disc number are of the form "x/y".
          if (type in MP4INTPAIRATOMS) {
            metadata[propname] = value.number;
            if (value.count) {
              metadata[MP4INTPAIRATOMS[type]] = value.count;
            }
          } else {
            metadata[propname] = value;
          }
        } catch (e) {
          console.warn('skipping', type, ':', e);
        }
      }
      data.seek(next);
    }
  }

  /**
   * Get the value for a single metadata atom.
   *
   * @param {BlobView} data The data for the moov atom.
   * @param {Number} end The offset at which the moov atom ends.
   * @param {String} atomtype The name of this atom.
   * @return {Object} The parsed value.
   */
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
      if (atomtype in MP4INTPAIRATOMS) {
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

  return {
    parse: parse
  };

})();
