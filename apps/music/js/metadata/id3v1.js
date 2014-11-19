/* global BlobView */
/* exported ID3v1Metadata */
'use strict';

/**
 * Parse files with ID3v1 metadata. Metadata includes title, artist, album,
 * and possibly the track number. Year, comment and genre are ignored.
 *
 * Format information:
 *   http://www.id3.org/ID3v1
 *   http://en.wikipedia.org/wiki/ID3
 */
var ID3v1Metadata = (function() {
  /**
   * Parse a file and return a Promise with the metadata.
   *
   * @param {BlobView} blobview The audio file to parse.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   * @return {Promise} A Promise returning the parsed metadata object.
   */
  function parse(blobview, metadata) {
    // If this looks like an MP3 file, then look for ID3v1 metadata
    // tag at the end of the file. But even if there is no metadata
    // treat this as a playable file.
    var blob = blobview.blob;
    return new Promise(function(resolve, reject) {
      BlobView.get(blob, blob.size - 128, 128, function(footer, error) {
        if (error) {
          reject(error);
          return;
        }

        try {
          var magic = footer.getASCIIText(0, 3);
          if (magic === 'TAG') {
            // It is an MP3 file with an ID3v1 tag
            resolve(parseID3v1Metadata(footer, metadata));
          } else {
            // It is an MP3 file with no metadata. We return the default
            // metadata object that just contains the filename as the title
            resolve(metadata);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
   * Parse ID3v1 metadata from the 128 bytes footer at the end of a file.
   *
   * @param {BlobView} footer The last 128 bytes of the file.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   * @return {Metadata} The parsed metadata object.
   */
  function parseID3v1Metadata(footer, metadata) {
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

    metadata.tag_format = 'id3v1';
    metadata.title = title || undefined;
    metadata.artist = artist || undefined;
    metadata.album = album || undefined;
    var b1 = footer.getUint8(125);
    var b2 = footer.getUint8(126);
    if (b1 === 0 && b2 !== 0) {
      metadata.tracknum = b2;
    }
    return metadata;
  }

  return {
    parse: parse
  };

})();
