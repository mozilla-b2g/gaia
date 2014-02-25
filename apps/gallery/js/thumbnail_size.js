/**
 * ThumbnailSize.js: Properties and functions related to size of thumbnails
 *
 * CONSTRUCTOR
 *
 * Create a ThumbnailSize object with a ThumbnailSize() constructor. Takes
 * one argument:
 *
 *   isPhone - whether or not app is running on a phone
 *
 * METHODS
 *
 * ThumbnailSize defines the following methods:
 *
 * - isSmale(metadata): Determines if the image described by the metadata
 *                      is small enough to be its own thumbnail
 *
 * - width(): Returns the width of a thumbnail given the current window
 *            dimensions, whether app is on a phone, and the orientation
 *
 * - height(): Returns the height of a thumbnail given the current window
 *             dimensions, whether app is on a phone, and the orientation
 */
'use strict';

var thumbnailSizeWidth;
var thumbnailSizeHeight;

var ThumbnailSize = (function() {

  function ThumbnailSize(isPhone) {
    var portraitWidth = Math.min(window.innerWidth, window.innerHeight);
    var landscapeWidth = Math.max(window.innerWidth, window.innerHeight);

    // If we generate our own thumbnails, aim for this size.
    // Calculate needed size from longer side of the screen.
    // Make sure this works regardless of current device orientation
    var thumbnailsPerRowPortrait = isPhone ? 3 : 4;
    var thumbnailsPerRowLandscape = isPhone ? 4 : 6;

    thumbnailSizeWidth =
        Math.round(window.devicePixelRatio *
          Math.max(portraitWidth / thumbnailsPerRowPortrait,
                   landscapeWidth / thumbnailsPerRowLandscape));

    thumbnailSizeHeight = thumbnailSizeWidth;
  }

  ThumbnailSize.prototype = {

    isSmall: function isSmall(metadata) {
      if (metadata && metadata.width && metadata.height &&
          metadata.width <= thumbnailSizeWidth &&
          metadata.height <= thumbnailSizeHeight) {
        return true;
      }

      return false;
    },

    width: function width() {
      return thumbnailSizeWidth;
    },

    height: function height() {
      return thumbnailSizeHeight;
    }
  };

  return ThumbnailSize;

}());
