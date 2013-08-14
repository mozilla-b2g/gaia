'use strict';

/**
 * This script can identify the size and orientation
 * of screen.
 *
 * isSmall       : 0 ~ 767px, return boolean
 * isMedium      : 768px ~ 991px, return boolean
 * isLarge       : 992px ~, return boolean
 * (Refer to famous library, like bootstrap and fundation
 *  we choose 768 and 992 width as our breakpoints)
 */

var ScreenLayout = (function() {
  // store this value when this script first included, so that it
  // won't be affected by window resizing
  var height = window.innerHeight;
  var width = window.innerWidth;
  // we don't use screen.width/height here, because app might
  // run on tv or bigger screen and app itself doesn't require
  // fullscreen.
  var maxWidth = Math.max(height, width);
  var screenOrientation = 0;
  var ScreenLayout = {
    isLarge: function sl_isLarge() {
      return (maxWidth > 991) ? true : false;
    },

    isSmall: function sl_isSmall() {
      return (maxWidth < 768) ? true : false;
    },

    isMedium: function sl_isMedium() {
      return (maxWidth < 992 && maxWidth > 767) ? true : false;
    }
  };
  return ScreenLayout;
}());
