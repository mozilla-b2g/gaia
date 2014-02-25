'use strict';

/*
 * This file defines an object that determines properties related to
 * the size of a thumbnail.
 * 
 * CONSTRUCTOR - Determines the width and height of a thumbnail based on the 
 *               current window's inner width and height and whether or not 
 *               the device is a phone.
 *  
 * The object exposes this API:
 * 
 * width - The width of a thumbnail given the current window properties
 *
 * height - The height of a thumbnail given the current window properties
 *
 * isSmall(metadata) - Given metadata representing an image,
 *                     determines if the image is equal to
 *                     or smaller than the size of a thumbnail.
 */
var thumbnailSizeWidth = 0;
var thumbnailSizeHeight = 0;

var ThumbnailSize = (function() {

  function ThumbnailSize(isPhone) {
    if (isPhone === null) {
      throw new Error('isPhone should not be null or undefined.');
    }

    // Make sure this works regardless of current device orientation
    var portraitWidth = Math.min(window.innerWidth, window.innerHeight);
    var landscapeWidth = Math.max(window.innerWidth, window.innerHeight);
    var thumbnailsPerRowPortrait = isPhone ? 3 : 4;
    var thumbnailsPerRowLandscape = isPhone ? 4 : 6;

    // If we generate our own thumbnails, aim for this size.
    // Calculate needed size from longer side of the screen.
    thumbnailSizeWidth = 
        Math.round(window.devicePixelRatio *
          Math.max(portraitWidth / thumbnailsPerRowPortrait,
                   landscapeWidth / thumbnailsPerRowLandscape));

    thumbnailSizeHeight = thumbnailSizeWidth;
  }
  
  ThumbnailSize.prototype = {

      width: function width() {
        return thumbnailSizeWidth;
      },

      height: function height() {
        return thumbnailSizeHeight;
      },

      isSmall: function isSmall(metadata) {
        if (metadata && metadata.width && metadata.height &&
            metadata.width <= thumbnailSizeWidth &&
            metadata.height <= thumbnailSizeHeight) {
          return true;
        }

      return false;
    }
  };

  return ThumbnailSize;
  
}());
