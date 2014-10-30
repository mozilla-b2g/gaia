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
  // These two properties are for playlist functionalities
  // not originally metadata from the files
  var RATED = 'rated';
  var PLAYED = 'played';

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
      } else if (magic.substring(0, 3) === 'ID3') {
        LazyLoader.load('js/metadata/id3v2.js', function() {
          ID3v2Metadata.parse(header, metadata).then(
            handleCoverArt, errorCallback
          );
        });
      } else if (magic.substring(0, 4) === 'OggS') {
        LazyLoader.load('js/metadata/ogg.js', function() {
          OggMetadata.parse(header, metadata).then(
            handleCoverArt, errorCallback
          );
        });
      } else if (magic.substring(4, 8) === 'ftyp') {
        LazyLoader.load('js/metadata/mp4.js', function() {
          MP4Metadata.parse(header, metadata).then(
            handleCoverArt, errorCallback
          );
        });
      } else if ((header.getUint16(0, false) & 0xFFFE) === 0xFFFA) {
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
            } else {
              // It is an MP3 file with no metadata. We return the default
              // metadata object that just contains the filename as the title
              metadataCallback(metadata);
            }
          }
          catch (e) {
            errorCallback(e);
          }
        });
      } else {
        // This is some kind of file that we don't know about.
        // Let's see if we can play it.
        var player = new Audio();
        player.mozAudioChannelType = 'content';
        var canplay = blob.type && player.canPlayType(blob.type);
        if (canplay === 'probably') {
          metadataCallback(metadata);
        } else {
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
    } catch (e) {
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

  function handleLockedFile(locked) {
    ForwardLock.getKey(function(secret) {
      ForwardLock.unlockBlob(secret, locked, callback, errorCallback);

      function callback(unlocked, unlockedMetadata) {
        // Now that we have the unlocked content of the locked file,
        // convert it back to a blob and recurse to parse the metadata.
        // When we're done, add metadata to indicate that this is locked
        // content (so it isn't shared) and to specify the vendor that
        // locked it.
        parseAudioMetadata(
          unlocked,
          function(metadata) {
            metadata.locked = true;
            if (unlockedMetadata.vendor) {
              metadata.vendor = unlockedMetadata.vendor;
            }
            if (!metadata[TITLE]) {
              metadata[TITLE] = unlockedMetadata.name;
            }
            metadataCallback(metadata);
          },
          errorCallback
        );
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
