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
   * @return {Promise} A Promise returning the parsed metadata object.
   */
  function parse(blobview) {
    return new Promise(function(resolve, reject) {
      var blob = blobview.blob;
      BlobView.get(blob, blob.size - 128, 128, function(footer, error) {
        if (error) {
          reject(error);
          return;
        }

        try {
          var magic = footer.getBinaryText(0, 3);
          if (magic === 'TAG') {
            // It's an MP3 file with an ID3v1 tag.
            resolve(parseID3v1Metadata(footer));
          } else {
            // It's an MP3 file with no metadata. Just resolve to an empty
            // metatada object.
            resolve({});
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
   * @return {Metadata} The parsed metadata object.
   */
  function parseID3v1Metadata(footer) {
    footer.seek(3); // Skip the "TAG" prefix.
    var title = footer.readNullTerminatedLatin1Text(30, true);
    var artist = footer.readNullTerminatedLatin1Text(30, true);
    var album = footer.readNullTerminatedLatin1Text(30, true);

    footer.advance(32); // Skip year and comment.
    var zerobyte = footer.readUnsignedByte();
    var track = footer.readUnsignedByte();

    var metadata = {
      tag_format: 'id3v1',
      title: title || undefined,
      artist: artist || undefined,
      album: album || undefined
    };
    if (zerobyte === 0 && track !== 0) {
      metadata.tracknum = track;
    }

    return metadata;
  }

  return {
    parse: parse
  };

})();
