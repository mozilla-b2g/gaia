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
 * Parse the metadata for an audio file.
 */
var AudioMetadata = (function() {
  var pictureStorage = navigator.getDeviceStorage('pictures');

  // A cache of metadata Picture objects for albums with external cover art. The
  // key is the directory name for the song in question.
  var externalCoverCache = {};

  // A cache of filenames for saved cover art (generated from unsynced ID3
  // tags). The value is the absolute path name.
  var savedCoverCache = new Set();

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

    // Start off with some default metadata
    var metadata = {};
    metadata.artist = metadata.album = metadata.title = '';
    metadata.rated = metadata.played = 0;

    // If the blob has a name, use that as a default title in case
    // we can't find one in the file
    if (filename) {
      var p1 = filename.lastIndexOf('/');
      var p2 = filename.lastIndexOf('.');
      if (p2 <= p1) {
        p2 = filename.length;
      }
      metadata.title = filename.substring(p1 + 1, p2);
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
          if (parser) {
            resolve(parser.parse(header, metadata).then(function(metadata) {
              return handleCoverArt(blob, metadata);
            }));
          } else {
            // This is some kind of file that we don't know about.
            // Let's see if we can play it.
            resolve(checkPlayability(blob).then(function() {
              return metadata;
            }));
          }
        } catch (e) {
          console.error('AudioMetadata.parse:', e, e.stack);
          reject(e);
        }
      });
    });
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

  /**
   * Perform additional processing for cover art, such as checking for external
   * artwork and saving temporary image blobs (for unsynchronized ID3 data).
   *
   * @param {Blob} blob The audio file.
   * @param {Metadata} metadata The metadata for the file.
   * @return {Promise} A Promise resolving to the metadata object with any
   *   additional cover art fields added as necessary.
   */
  function handleCoverArt(blob, metadata) {
    // If a blob isn't backed by an actual file, we can't do anything here
    // except return what we have.
    var filename = blob.name;
    if (!filename) {
      return Promise.resolve(metadata);
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
        return Promise.resolve(metadata);
      }

      // Try to find external album art using a handful of common names. The
      // possibilities listed here appear to be the most common, based on a
      // brief survey of what people use in the wild.
      return new Promise(function(resolve, reject) {
        var possibleFilenames = ['folder.jpg', 'cover.jpg', 'front.jpg'];
        var tryFetchExternalCover = function(index) {
          if (index === possibleFilenames.length) {
            // We couldn't find any external album art.
            externalCoverCache[dirName] = null;
            resolve(metadata);
            return;
          }

          var externalCoverFilename = dirName + possibleFilenames[index];
          var getcoverrequest = pictureStorage.get(externalCoverFilename);
          getcoverrequest.onsuccess = function() {
            metadata.picture = { flavor: 'external',
                                 filename: externalCoverFilename };
            // Cache the picture object we generated to make things faster.
            externalCoverCache[dirName] = metadata.picture;
            resolve(metadata);
          };
          getcoverrequest.onerror = function() {
            tryFetchExternalCover(index + 1);
          };
        };
        tryFetchExternalCover(0);
      });
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
      var storageName = getStorageName(filename);
      return checkSaveCover(coverBlob, imageFilename, storageName).then(
        function(savedFile) {
          metadata.picture.filename = savedFile;
          return metadata;
        }, function(err) {
          delete metadata.picture;
          return metadata;
        }
      );
    } else {
      // We have embedded album art! All the processing is already done, so we
      // can just return.
      return Promise.resolve(metadata);
    }
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
   * Get the name of the storage area for an absolute filename, with leading
   * and trailing slashes (e.g. '/sdcard/'). If the filename is relative,
   * return the empty string (i.e. use the default storage area.)
   *
   * @param {string} filename The path to the file.
   * @return {string} The file's storage area, or the empty string if the path
   *   was relative.
   */
  function getStorageName(filename) {
    // `filename` is usually a fully qualified name (perhaps something like
    // /sdcard/Music/file.mp3). On desktop, it's a relative name, but desktop
    // only has one storage area anyway.
    if (filename[0] === '/') {
      var slashIndex = filename.indexOf('/', 1);
      if (slashIndex < 0) {
        var err = Error('handleCoverArt: Bad filename: "' + filename + '"');
        console.error(err);
        return Promise.reject(err);
      }

      // Get the storage name, e.g. /sdcard/
      return filename.substring(0, slashIndex + 1);
    }

    return '';
  }

  /**
   * Check for the existence of an image on the audio file's storage area,
   * and if it's not present, try to save it.
   *
   * @param {Blob} coverBlob The blob for the full-size cover art.
   * @param {string} imageFilename A relative filename for the image.
   * @param {string} storageName The name of the storage area too use for
   *   saving the image. May be an empty string or a path with trailing '/'.
   *   For instance, to store on the SD card, pass '/sdcard/'.
   * @return {Promise} A Promise that resolves when finished, providing the
   *   filename of the saved image.
   */
  function checkSaveCover(coverBlob, imageFilename, storageName) {
    // We want to put the image in the same storage area as the audio track it's
    // for. Since the audio track could be in any storage area, we examine its
    // filename to get the storage name; the storage name is always the first
    // part of the (absolute) filename, so we grab that and build an absolute
    // path for the image. This will ensure that the generic deviceStorage we
    // use for pictures ("pictureStorage") puts the image where we want it.
    var imageAbsPath = storageName + '.music/covers/' + imageFilename;
    if (savedCoverCache.has(imageAbsPath)) {
      return Promise.resolve(imageAbsPath);
    }

    return new Promise(function(resolve, reject) {
      var getrequest = pictureStorage.get(imageAbsPath);

      // We already have the image. We're done!
      getrequest.onsuccess = function() {
        savedCoverCache.add(imageAbsPath);
        resolve(imageAbsPath);
      };

      // We don't have the image yet. Let's save it.
      getrequest.onerror = function() {
        var saverequest = pictureStorage.addNamed(coverBlob, imageAbsPath);
        saverequest.onerror = function() {
          console.error('Could not save cover image', imageFilename);
        };

        // Don't bother waiting for saving to finish. Just return.
        savedCoverCache.add(imageAbsPath);
        resolve(imageAbsPath);
      };
    });
  }

  return {
    parse: parse,
    pictureStorage: pictureStorage
  };
})();
