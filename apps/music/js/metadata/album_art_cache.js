/* global AlbumArt, asyncStorage, ImageUtils, LazyLoader, musicdb */
/* exported AlbumArtCache */
'use strict';

/**
 * Handle fetching album art and thumbnail management for already-parsed audio
 * files.
 */
var AlbumArtCache = (function() {

  // When we generate our own thumbnails, aim for this size. XXX: This should be
  // improved to pick a size based on the resolution of our device.
  var THUMBNAIL_WIDTH = 300;
  var THUMBNAIL_HEIGHT = 300;

  // The level one caches for thumbnails and full-size images; maps a cache key
  // (see below) to a blob: URL. There's also a level two cache for thumbnails,
  // backed by asyncStorage.
  var L1Cache = {'thumbnail': {}, 'fullsize': {}};

  /**
   * Get a URL for a full-sized version of the cover art for a given file (if
   * any).
   *
   * @param {Object} fileinfo The info for the file we want album art for.
   * @param {Boolean} noPlaceholder True if this function should only return an
   *   image if there's cover art for the file. Otherwise, this function will
   *   return a placeholder image if there's no cover art.
   * @return {Promise} A promise returning either the URL for the cover art, or
   *   null.
   */
  function getFullSizeURL(fileinfo, noPlaceholder) {
    // If there's no picture info in the metadata, return null or a placeholder.
    if (!fileinfo.metadata.picture) {
      return Promise.resolve(
        noPlaceholder ? null : getDefaultCoverURL(fileinfo)
      );
    }

    // See if we've already made a URL for this album. If so, return it.
    var cacheKey = makeCacheKey(fileinfo);
    if (cacheKey && cacheKey in L1Cache.fullsize) {
      return Promise.resolve(L1Cache.fullsize[cacheKey]);
    }

    // Otherwise, get the blob from the album art, create a URL for it, and
    // return it in the Promise.
    return getAlbumArtBlob(fileinfo).then(function(blob) {
      return makeAndCacheURL(cacheKey, blob, 'fullsize');
    });
  }

  /**
   * Get a Blob for a full-sized version of the cover art for a given file (if
   * any).
   *
   * @param {Object} fileinfo The info for the file we want album art for.
   * @param {Boolean} noPlaceholder True if this function should only return an
   *   image if there's cover art for the file. Otherwise, this function will
   *   return a placeholder image if there's no cover art.
   * @return {Promise} A promise returning either the Blob for the cover art, or
   *   null.
   */
  function getFullSizeBlob(fileinfo, noPlaceholder) {
    // If there's no picture info in the metadata, return null or a placeholder.
    if (!fileinfo.metadata.picture) {
      if (noPlaceholder) {
        return Promise.resolve(null);
      }
      return getBlobFromURL(getDefaultCoverURL(fileinfo));
    }

    // Skip the L1 cache, since we want to return a blob, not a URL.

    return getAlbumArtBlob(fileinfo);
  }

  /**
   * Get a URL for a thumbnailized version of the cover art for a given file
   * (if any).
   *
   * @param {Object} fileinfo The info for the file we want album art for.
   * @param {Boolean} noPlaceholder True if this function should only return an
   *   image if there's cover art for the file. Otherwise, this function will
   *   return a placeholder image if there's no cover art.
   * @return {Promise} A promise returning either the URL for the thumbnail, or
   *   null.
   */
  function getThumbnailURL(fileinfo, noPlaceholder) {
    // If there's no picture info in the metadata, return null or a placeholder.
    if (!fileinfo.metadata.picture) {
      return Promise.resolve(
        noPlaceholder ? null : getDefaultCoverURL(fileinfo)
      );
    }

    // See if we've already made a URL for this album. If so, return it.
    var cacheKey = makeCacheKey(fileinfo);
    if (cacheKey && cacheKey in L1Cache.thumbnail) {
      return Promise.resolve(L1Cache.thumbnail[cacheKey]);
    }

    // Otherwise, see if we've saved a blob in asyncStorage. If not, create a
    // thumbnail blob and store it in the cache. Finally, create a URL for the
    // blob and return it in the Promise.
    //
    // XXX: There's a (minor) race condition here. If two requests for the same
    // album art get here, the slower one will overwrite the faster one's cached
    // blob URL, meaning that not all instances of a piece of album art will
    // have the same URL. This only really matters to tests, though.
    return checkL2Cache(cacheKey).then(function(cachedBlob) {
      return cachedBlob || createThumbnail(cacheKey, fileinfo);
    }).then(function(blob) {
      return makeAndCacheURL(cacheKey, blob, 'thumbnail');
    });
  }

  /**
   * Get a Blob for a thumbnailized version of the cover art for a given file
   * (if any).
   *
   * @param {Object} fileinfo The info for the file we want album art for.
   * @param {Boolean} noPlaceholder True if this function should only return an
   *   image if there's cover art for the file. Otherwise, this function will
   *   return a placeholder image if there's no cover art.
   * @return {Promise} A promise returning either the Blob for the thumbnail, or
   *   null.
   */
  function getThumbnailBlob(fileinfo, noPlaceholder) {
    // If there's no picture info in the metadata, return null or a placeholder.
    if (!fileinfo.metadata.picture) {
      if (noPlaceholder) {
        return Promise.resolve(null);
      }
      return getBlobFromURL(getDefaultCoverURL(fileinfo));
    }

    // Skip the L1 cache, since we want to return a blob, not a URL.

    // See if we've saved a blob in asyncStorage. If not, create a
    // thumbnail blob and store it in the cache. In either case, return the
    // blob.
    var cacheKey = makeCacheKey(fileinfo);
    return checkL2Cache(cacheKey).then(function(cachedBlob) {
      return cachedBlob || createThumbnail(cacheKey, fileinfo);
    });
  }

  function getDefaultCoverURL(fileinfo) {
    var metadata = fileinfo.metadata;
    // If metadata does not contain both album and artist, then use title
    // instead.
    var infoForHash = (!metadata.album && !metadata.artist) ?
      metadata.title : metadata.album + metadata.artist;
    var hashedNumber = (Math.abs(hash(infoForHash)) % 10) + 1;

    return '/style/images/AlbumArt' + hashedNumber + '_small.png';
  }

  /**
   * Hash a string into an integral value. (This is a Javascript implementation
   * of Java's String.hashCode() method.
   *
   * @param {String} str The string to hash.
   * @return {Number} The hashed value.
   */
  function hash(str) {
    var hashCode = 0;
    if (str.length === 0) { return hashCode; }
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      hashCode = ((hashCode << 5) - hashCode) + c;
      hashCode = hashCode & hashCode; // Convert to 32-bit integer
    }
    return hashCode;
  }

  /**
   * Create a cache key for this file. The cache key should be unique for each
   * album, and (hopefully) the same for tracks in a given album.
   *
   * @param {Object} fileinfo The file's info.
   * @return {String} A cache key for the file, or null if we couldn't generate
   *   one.
   */
  function makeCacheKey(fileinfo) {
    var metadata = fileinfo.metadata;
    if (metadata.picture.filename) {
      return 'external.' + metadata.picture.filename;
    } else if (metadata.picture.flavor === 'embedded') {
      var album = metadata.album;
      var artist = metadata.artist;
      var size = metadata.picture.end - metadata.picture.start;

      if (album || artist) {
        return 'thumbnail.' + album + '.' + artist + '.' + size;
      } else {
        return 'thumbnail.' + (fileinfo.name || fileinfo.blob.name);
      }
    }
    return null;
  }

  /**
   * Check the L2 cache (asyncStorage) to see if we already have a thumbnailized
   * version of the album art.
   *
   * @param {String} cacheKey The cache key generated by makeCacheKey.
   * @return {Promise} A promise returning either the Blob for the thumbnail, or
   *   null.
   */
  function checkL2Cache(cacheKey) {
    if (!cacheKey) {
      return Promise.resolve(null);
    } else {
      return new Promise(function(resolve, reject) {
        asyncStorage.getItem(cacheKey, function(blob) {
          // Note that this can resolve to null if the blob wasn't cached yet.
          resolve(blob);
        });
      });
    }
  }

  /**
   * Create a blob: URL for a Blob and store the URL in our L1 cache.
   *
   * @param {String} cacheKey The cache key generated by makeCacheKey.
   * @param {Blob} blob The blob.
   * @param {String} type Either 'thumbnail' or 'fullsize'.
   * @return {String} The blob: URL.
   */
  function makeAndCacheURL(cacheKey, blob, type) {
    var url = URL.createObjectURL(blob);
    if (cacheKey) {
      L1Cache[type][cacheKey] = url;
    }
    return url;
  }

  /**
   * Create a thumbnail for the album art and store the Blob in our L2 cache.
   *
   * @param {String} cacheKey The cache key generated by makeCacheKey.
   * @param {Object} fileinfo The file's info.
   * @return {Promise} A promise returning the thumbnailized Blob.
   */
  function createThumbnail(cacheKey, fileinfo) {
    // We don't have a saved blob yet, so grab it, thumbnailize it, and store
    // it in asyncStorage.
    return getAlbumArtBlob(fileinfo).then(function(blob) {
      return ImageUtils.resizeAndCropToCover(
        blob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT
      );
    }).then(function(thumbnailBlob) {
      if (cacheKey) {
        asyncStorage.setItem(cacheKey, thumbnailBlob);
      }
      return thumbnailBlob;
    });
  }

  /**
   * Get the (full-size) Blob for this file's album art.
   *
   * @param {Object} fileinfo The file's info.
   * @return {Promise} A promise returning the full-size Blob.
   */
  function getAlbumArtBlob(fileinfo) {
    var picture = fileinfo.metadata.picture;
    return new Promise(function(resolve, reject) {
      if (picture.blob) {
        // We must have an unsynced picture that came from a temporary blob
        // (i.e. from the open activity or a unit test).
        resolve(picture.blob);
      } else if (picture.filename) {
        // Some audio tracks have an external file for their album art, so we
        // need to grab it from deviceStorage. This could also be an unsynced
        // picture that came from a regular file.
        LazyLoader.load('/js/metadata/album_art.js', function() {
          var getreq = AlbumArt.pictureStorage.get(picture.filename);
          getreq.onsuccess = function() {
            resolve(this.result);
          };
          getreq.onerror = function() {
            reject(this.error);
          };
        });
      } else if (picture.start) {
        // Other audio tracks have the album art embedded in the file, so we
        // just need to splice out the part we want.
        getSongBlob(fileinfo).then(function(blob) {
          var embedded = blob.slice(
            picture.start, picture.end, picture.type
          );
          resolve(embedded);
        }).catch(reject);
      } else {
        // If we got here, something strange happened...
        var err = new Error('unknown picture flavor: ' + picture.flavor);
        console.error(err);
        reject(err);
      }
    });
  }

  /**
   * Get the Blob for this file (i.e. the audio track itself).
   *
   * @param {Object} fileinfo The file's info.
   * @return {Promise} A promise returning the audio track's Blob.
   */
  function getSongBlob(fileinfo) {
    return new Promise(function(resolve, reject) {
      if (fileinfo.blob) {
        // This can happen for the open activity.
        resolve(fileinfo.blob);
      } else {
        // This is the normal case.
        musicdb.getFile(fileinfo.name, function(file) {
          if (file) {
            resolve(file);
          } else {
            reject('unable to get file: ' + fileinfo.name);
          }
        });
      }
    });
  }

  /**
   * Get the Blob for a URL.
   *
   * @param {String} url The URL to fetch.
   * @return {Promise} A promise returning the Blob.
   */
  function getBlobFromURL(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onload = function() {
        resolve(xhr.response);
      };
      // I don't think onerror usually gets called, but let's play it safe.
      xhr.onerror = function() {
        reject(null);
      };

      xhr.send();
    });
  }

  return {
    getFullSizeURL: getFullSizeURL,
    getFullSizeBlob: getFullSizeBlob,
    getThumbnailURL: getThumbnailURL,
    getThumbnailBlob: getThumbnailBlob
  };
})();
