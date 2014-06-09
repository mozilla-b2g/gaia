define(function(require, exports, module) {
'use strict';

/**
 * Given a position in camera coordinates
 * it clamps the value into the available range
 */
var clamp = function(position) {
  if (position < 0) {
    position = 0;
  } else if (position > 2000) {
    position = 2000;
  }
  return position;
};

/**
 * Exports
 */

/**
 *  Given a point in screen pixel coordinates
 *  a viewport width/height and an area
 *  size in pixel units it returns an
 *  area in android camera coordinates (-1000, 1000)
 *  -----------------------------------------------
 *  ---------------- IMPORTANT --------------------
 *  -----------------------------------------------
 *  The vieport size in DOM coordinates is reported with
 *  origin on the top-left corner of the screen with the
 *  device in portrait orientation. Camera coordinates
 *  use the top-left corner on landscape orientation
 *  The transformation of the coordinates take into account
 *  the different origins of coordinates.
 *
 *    Portrait           Landscape
 *  P ........ C     C ...............
 *    .      .         .             .
 *    .      .         .             .
 *    .      .         .             .
 *    .      .       P ...............
 *    ........
 *  P = Origin of Pixel Coordinates
 *  C = Origin of Camera Coordinates
 */
module.exports = function(x, y, viewportWidth, viewportHeight, focusAreaSide) {
  // In camera coordinate system, (-1000, -1000) represents the
  // top-left of the camera field of view, and (1000, 1000) represents
  // the bottom-right of the field of view. So, the Focus area should
  // start at -1000 and end at 1000.
  // For the convenience of avoiding negative values
  // we assume that coordinates go from 0 to 2000
  // We correct by substracting 1000 before returning the final value
  var cameraRange = 2000;

  // Using Square Focus area. In pixels
  var focusAreaHalfSide = focusAreaSide? focusAreaSide / 2 : 10;

  // How many camera units is one pixel?
  var cameraUnitsPerPixelWidth = cameraRange / viewportWidth;
  var cameraUnitsPerPixelHeight = cameraRange / viewportHeight;

  // Converts position to camera coordinates
  // Due to different origin of coordinates x in pixel coordinates
  // is the oposite in camera coordinates
  var xCameraCoordinates = cameraRange - x * cameraUnitsPerPixelWidth;
  var yCameraCoordinates = y * cameraUnitsPerPixelHeight;

  // Converts area size from pixel to camera units
  // Units break down below (do you remember your physics lectures?)
  // screen-pixels * (camera-units / screen-pixels) = camera-units
  var horizontalMargin = focusAreaHalfSide * cameraUnitsPerPixelWidth;
  var verticalMargin = focusAreaHalfSide * cameraUnitsPerPixelHeight;

  // Returns the area in camera coordinates after checking boundary conditions
  // This takes into account the different origins of coordinates as
  // described above
  return {
    left: clamp(yCameraCoordinates - verticalMargin) - 1000,
    right: clamp(yCameraCoordinates + verticalMargin) - 1000,
    top: clamp(xCameraCoordinates - horizontalMargin) - 1000,
    bottom: clamp(xCameraCoordinates + horizontalMargin) - 1000
  };

};

});
