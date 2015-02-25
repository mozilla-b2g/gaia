/* global BlobView, MetadataFormats */
/* exported AudioMetadata */
'use strict';

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

/**
 * Parse the metadata for an audio file.
 */
var AudioMetadata = (function() {
  /**
   * Parse the specified blob and return a Promise with the metadata.
   *
   * @param {Blob} blob The audio file to parse.
   * @return {Promise} A Promise returning the parsed metadata object.
   */
  function parse(blob) {
    var filename = blob.name;

    // If blob.name exists, it should be an audio file from system
    // otherwise it should be an audio blob that probably from network/process
    // we can still parse it but we don't need to care about the filename
    if (filename) {
      // If the file is in the DCIM/ directory and has a .3gp extension
      // then it is a video, not a music file and we ignore it
      if (filename.slice(0, 5) === 'DCIM/' &&
          filename.slice(-4).toLowerCase() === '.3gp') {
        return Promise.reject('skipping 3gp video file');
      }
    }

    // If the file is too small to be a music file then ignore it
    if (blob.size < 128) {
      return Promise.reject('file is empty or too small');
    }

    // Read the start of the file, figure out what kind it is, and call
    // the appropriate parser.  Start off with an 64kb chunk of data.
    // If the metadata is in that initial chunk we won't have to read again.
    return new Promise(function(resolve, reject) {
      var headersize = Math.min(64 * 1024, blob.size);
      BlobView.get(blob, 0, headersize, function(header, error) {
        if (error) {
          reject(error);
          return;
        }

        try {
          var parser = MetadataFormats.findParser(header);
          var promise;
          if (parser) {
            promise = parser.parse(header);
          } else {
            // This is some kind of file that we don't know about.
            // Let's see if we can play it.
            promise = checkPlayability(blob);
          }

          resolve(promise.then(function(metadata) {
            return addDefaultMetadata(metadata || {}, filename);
          }));
        } catch (e) {
          console.error('AudioMetadata.parse:', e, e.stack);
          reject(e);
        }
      });
    });
  }

  /**
   * Fill in any default metadata fields, such as a fallback for the title, and
   * the rating/playcount.
   *
   * @param {Object} metadata The metadata from one of our parsers.
   * @param {String} filename The name of the underlying file, if any.
   * @return {Object} The updated metdata object.
   */
  function addDefaultMetadata(metadata, filename) {
    if (!metadata.artist) {
      metadata.artist = '';
    }
    if (!metadata.album) {
      metadata.album = '';
    }
    if (!metadata.title) {
      // If the blob has a name, use that as a default title in case
      // we can't find one in the file
      if (filename) {
        var p1 = filename.lastIndexOf('/');
        var p2 = filename.lastIndexOf('.');
        if (p2 <= p1) {
          p2 = filename.length;
        }
        metadata.title = filename.substring(p1 + 1, p2);
      } else {
        metadata.title = '';
      }
    }

    metadata.rated = metadata.played = 0;
    return metadata;
  }

  /**
   * Check if a blob can be played as an audio file.
   *
   * @param {Blob} blob The file to test.
   * @return {Promise} A promise that resolves successfully if the file is
   *   playable.
   */
  function checkPlayability(blob) {
    var player = new Audio();
    player.mozAudioChannelType = 'content';
    var canplay = blob.type && player.canPlayType(blob.type);
    if (canplay === 'probably') {
      return Promise.resolve();
    } else {
      return new Promise(function(resolve, reject) {
        var url = URL.createObjectURL(blob);
        player.src = url;

        player.onerror = function() {
          URL.revokeObjectURL(url);
          player.removeAttribute('src');
          player.load();
          reject('Unplayable music file');
        };

        player.oncanplay = function() {
          URL.revokeObjectURL(url);
          player.removeAttribute('src');
          player.load();
          resolve();
        };
      });
    }
  }

  return {
    parse: parse
  };
})();
