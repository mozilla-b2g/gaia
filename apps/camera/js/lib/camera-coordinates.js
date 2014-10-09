/*

This module contains functions to deal with android camera coordinates.

Example use cases:

1. In the camera application we want to convert to screen coordinates
the top left corner of the faces detected by the camera so we can position a
DOM element to highlight the corresponding area.

2. We have to transform screen to android camera coordinates when
the user touches the screen to focus on a specific area.

In both cases we have to take into account the possible mismatch between the
screen pixels order and the order of the pixels sent by the driver.

ANDROID CAMERA COORDINATES

This documentation contain how android coordinates work and how the screen,
sensor and scene coordinates relate to one another.

The following is *always* true: the active rectangles of
the phone/screen and the sensor always -physically- line up.
It  has to be thus, otherwise it would be impossible to
fill a portrait  viewfinder with a portrait view, or a
landscape viewfinder with a  landscape view.

Visually, this looks like:

phone/screen
+------+
|      |
|      |
|      |
|      |
|      |
|      |
|      |
|      |
+------+

sensor
+----+
|    |
|    |
|    |
|    |
+----+

detected face reported by the camera driver
-------------------------------------------

        top
      +-----+
      |     |
 left |     | right
      |     |
      +-----+
       bottom

The driver also reports width and height

If sensor orientation is 0, the sensor and the screen are scanned like this:

phone/screen
+------+
|aabbcc|
|aabbcc|
|ddeeff|
|ddeeff|
|gghhii|
|gghhii|
|jjkkll|
|jjkkll|
+------+

sensor
O---+    O = Origin of sensor coordinates (-1000, -1000)
|abc|    X = (1000, 1000)
|def|    sensor-to-screen conversion => none (x = x, y = y)
|ghi|    face coordinate to convert => top, left
|jkl|
+---X

If there is an arrow pointing right:
o-->
...the sensor sees this arrow as such:

+----+
|    |
|o-->|
|    |
|    |
+----+

...and if the sensor orientation is 0, the
arrow appears on the screen (magnified) like this:

+--------+
|        |
|        |
|        |
|()====>>|
|        |
|        |
|        |
|        |
+--------+

If the sensor orientation is, e.g., 90-degrees--that is,
the "top" of the sensor corresponds to the "right" of the
screen--then without applying any rotation to the UI,
the arrow appears on the screen like this:

+--------+
|        |
|        |
|   ^    |
|   |    |
|   O    |
|        |
|        |
|        |
+--------+

The arrow is smaller, because the frames need to be
shrunk so that the entire height of the sensor image
fits into the width of the screen.
In this case, rotating the UI by 90-degrees clockwise,
and stretching it to fill the screen, gives:

+--------+
|        |
|        |
|        |
|()====>>|
|        |
|        |
|        |
|        |
+--------+

This is because, in the 90-degree sensor
orientation case, the scanning is like this:

sensor
+---O    O = Origin of sensor coordinates (-1000, -1000)
|iea|    X = (1000, 1000)
|jfb|    sensor-to-screen conversion => x = -y, y = x
|kgc|    face coordinate to convert => bottom, left
|lhd|
X---+

And without compensating for this rotation,
the image on the screen would appear like this:
+------+
|      |
|      |
| abcd |
| efgh |
| ijkl |
|      |
|      |
|      |
+------+

Thus sensor orientation has nothing to do with the physical
orientation of the sensor. Rather, it has to do with which
scan-line in the sensor is considered the "top".
Given all this, the coordinates of the "top-left" of
the sensor view, (-1000, -1000), are the coordinates of the
first pixel of the first scan-line. Similarly, the "bottom-right"
of the sensor is the last pixel of the last scan-line,
and has coordinates (1000, 1000).

----- 8< -----
As requested, the 180-degree case is:

phone/screen
+------+
|aabbcc|
|aabbcc|
|ddeeff|
|ddeeff|
|gghhii|
|gghhii|
|jjkkll|
|jjkkll|
+------+

sensor
X---+    O = Origin of sensor coordinates (-1000, -1000)
|jkl|    X = (1000, 1000)
|ihg|    sensor-to-screen conversion => x = -x, y = -y
|fed|    face coordinate to convert => bottom, right
|cba|
+---O

And the 270-degree case is:

phone/screen
+------+
|      |
|      |
| abcd |
| efgh |
| ijkl |
|      |
|      |
|      |
+------+

sensor
+---X    O = Origin of sensor coordinates (-1000, -1000)
|dhl|    X = (1000, 1000)
|cgk|    sensor-to-screen conversion => x = y, y = -x
|bfj|    face coordinate to convert => bottom, right
|aei|
O---+

*/
define(function(require, exports, module) {
/*jshint maxlen:false*/
'use strict';

/**
 * It transforms camera coordinates to pixels
 *
 *  @private
 */
function toPixels(x, y, viewportWidth, viewportHeight) {
  // In camera coordinate system, (-1000, -1000) represents the
  // top-left of the camera field of view, and (1000, 1000) represents
  // the bottom-right.
  // For convenience we assume that coordinates go from 0-2000
  var cameraCoordinatesRange = 2000;

  // How many pixels per camera unit?
  var pixelsPerCameraUnitWidth = viewportWidth / cameraCoordinatesRange;
  var pixelsPerCameraUnitHeight = viewportHeight / cameraCoordinatesRange;
  // It makes the faces coordinates to go from 0-2000 for convenience
  var xCameraCoordinates = x + 1000;
  var yCameraCoordinates = y + 1000;
  var xPixelCoordinates = xCameraCoordinates * pixelsPerCameraUnitWidth;
  var yPixelCoordinates = yCameraCoordinates * pixelsPerCameraUnitHeight;
  return {
    x: Math.round(xPixelCoordinates),
    y: Math.round(yPixelCoordinates)
  };
}

/**
 *  It transforms pixels to camera coordinates
 *
 *  @private
 */
function toCamera(x, y, viewportWidth, viewportHeight) {
  // In camera coordinate system, (-1000, -1000) represents the
  // top-left of the camera field of view, and (1000, 1000) represents
  // the bottom-right.
  var cameraCoordinatesRange = 2000;
  // How many camera units per pixel?
  var cameraUnitsPerPixelWidth = cameraCoordinatesRange / viewportWidth;
  var cameraUnitsPerPixelHeight = cameraCoordinatesRange / viewportHeight;
  return {
    x: Math.round(x * cameraUnitsPerPixelWidth) - 1000,
    y: Math.round(y * cameraUnitsPerPixelHeight) - 1000
  };
}

/**
 *  It rotates camera coordinates given an angle 0, 90, 180, 270
 *
 *  @private
*/
function rotatePoint(x, y, angle) {
  // It clamps the angle to +/- 0-270
  angle = (Math.round((angle % 360) / 90) % 4) * 90;
  switch (angle) {
    case 0:
      return {
        x: x,
        y: y
      };
    case 90:
    case -270:
      return {
        x: -y,
        y: x
      };
    case 180:
    case -180:
     return {
        x: -x,
        y: -y
      };
    case 270:
    case -90:
      return {
        x: y,
        y: -x
      };
    default:
      console.error('wrong angle value');
  }
}

 /**
  *  The sensor orientation is the orientation of the camera output
  *  (the order of the pixels sent from the sensor to the preview stream) with
  *  respect to the device screen in portrait orientation.
  *  This function matches the orientation of the sensor and screen coordinates
  *  We're interested on the top left and bottom-rignt corners of the
  *  area as observed through the lenses (scene coordinates).
  *  We take into account the orientation of the sensor to pick the correct
  *  corner that corresponds to the top most, left most, right most and
  *  bottom most coordinates in the physical/scene space as observed through the camera preview.
  *
  *  @private
  */
function rotateArea(area, sensorOrientation) {
  var topLeft = rotatePoint(area.left, area.top, sensorOrientation);
  var bottomRight = rotatePoint(area.right, area.bottom, sensorOrientation);
  // It picks the top left and bottom right corners on the scene / physical space
  return {
      top: Math.min(topLeft.y, bottomRight.y),
      left: Math.min(topLeft.x, bottomRight.x),
      bottom: Math.max(topLeft.y, bottomRight.y),
      right: Math.max(topLeft.x, bottomRight.x),
      width: Math.abs(topLeft.x - bottomRight.x),
      height: Math.abs(topLeft.y - bottomRight.y)
  };
}

/**
 *  It mirrors a given area in camera coordinates
 *  Use case: Display detected faces by the front camera.
 *
 *  @private
 */
function mirrorAreaCamera(area) {
  return {
    top: area.top,
    left: -area.right,
    bottom: area.bottom,
    right: -area.left,
    width: area.width,
    height: area.height
  };
}

/**
 *  It mirrors a given area in camera coordinates
 *  Use case: Display detected faces by the front camera.
 *
 *  @private
 */
function mirrorAreaPixels(area, viewportWidth) {
  return {
    top: area.top,
    left: viewportWidth - area.right,
    bottom: area.bottom,
    right: viewportWidth - area.left,
    width: area.width,
    height: area.height
  };
}


/**
 *  Given a distance in pixels and a screen size it returns
 *  the distance in camera units.
 *
 *  @private
 */
function sizeToCamera(width, height, viewportWidth, viewportHeight) {
  // In camera coordinate system, (-1000, -1000) represents the
  // top-left of the camera field of view, and (1000, 1000) represents
  // the bottom-right of the field of view.
  // There are 2000 units in each axis of the camera coordinates
  var cameraCoordinatesRange = 2000;
  // How many camera units per pixel?
  var cameraUnitsPerPixelWidth = cameraCoordinatesRange/ viewportWidth;
  var cameraUnitsPerPixelHeight = cameraCoordinatesRange / viewportHeight;
  return {
    width: Math.round(width * cameraUnitsPerPixelWidth),
    height: Math.round(height * cameraUnitsPerPixelHeight)
  };
}

/**
 *  Given a distance in camera units and a screen size it returns
 *  the distance in pixels.
 *
 *  @private
 */
function sizeToPixels(width, height, viewportWidth, viewportHeight) {
  // In camera coordinate system, (-1000, -1000) represents the
  // top-left of the camera field of view, and (1000, 1000) represents
  // the bottom-right of the field of view.
  // There are 2000 units in each axis of the camera coordinates
  var cameraCoordinatesRange = 2000;
  // How many pixels per camera coordinates unit?
  var pixelsPerCameraUnitWidth = viewportWidth / cameraCoordinatesRange;
  var pixelsPerCameraUnitHeight = viewportHeight / cameraCoordinatesRange;
  return {
    width: Math.round(width * pixelsPerCameraUnitWidth),
    height: Math.round(height * pixelsPerCameraUnitHeight)
  };
}

/**
 *  Given an area in screen camera units (-1000, 1000)
 *  and viewport dimensions it returns the same area
 *  in pixels
 *
 *  @private
 */
function areaToPixels(area, viewportWidth, viewportHeight) {
  // It converts the face from Android camera coordinates to pixels
  var areaPixels = toPixels(
    area.left, area.top, viewportWidth, viewportHeight);
  // It converts the face size from Android camera units to pixels
  var areaPixelSize = sizeToPixels(
    area.width, area.height,
    viewportWidth, viewportHeight);
  var width = areaPixelSize.width;
  var height = areaPixelSize.height;
  return {
    top: areaPixels.y,
    left: areaPixels.x,
    bottom: areaPixels.y + height,
    right: areaPixels.x + width,
    width: width,
    height: height
  };
}

/**
 *  Given an area in screen pixel coordinates
 *  and viewport dimensions it returns the same area
 *  in android camera coordinates (-1000, 1000)
 *
 *  @public
 */
function areaToCamera(area, viewportWidth, viewportHeight) {
  var topLeft = toCamera(
    area.left, area.top, viewportWidth, viewportHeight);
  // It converts the size from pixels to camera units
  var areaCameraUnits = sizeToCamera(
    area.width, area.height,
    viewportWidth, viewportHeight);
  var width = areaCameraUnits.width;
  var height = areaCameraUnits.height;
  var areaCamera = {
    top: topLeft.y,
    left: topLeft.x,
    bottom: topLeft.y + height,
    right: topLeft.x + width,
    height: height,
    width: width
  };
  return areaCamera;
}

/**
 *  Given face coordinates in pixels
 *  a viewport width and height it returns the face coordinates
 *  and area in camera units
 *
 *  @public
 */
function faceToCamera(face, viewportWidth, viewportHeight, sensorOrientation, mirrored) {
  if (mirrored) {
    face = mirrorAreaPixels(face, viewportWidth);
  }
  face = areaToCamera(face, viewportWidth, viewportHeight);
  // The orientation of the screen and the sensor might not match.
  // We rotate the face so it matches screen coordinates orientation
  if (sensorOrientation) {
    face = rotateArea(face, -sensorOrientation);
  }
  return face;
}

/**
 *  Given face coordinates as provided by camera controller and
 *  a viewport width and height it returns the face coordinates, diameter
 *  and area in pixel units
 *
 *  @public
 */
function faceToPixels(face, viewportWidth, viewportHeight, sensorOrientation, mirrored) {
  // The orientation of the screen and the sensor might not match.
  // We rotate the face so it matches screen coordinates orientation
  if (sensorOrientation) {
    face = rotateArea(face, sensorOrientation);
  }
  if (mirrored) {
    face = mirrorAreaCamera(face);
  }
  return areaToPixels(face, viewportWidth, viewportHeight);
}

return {
  // Face transformations
  faceToCamera: faceToCamera,
  faceToPixels: faceToPixels,
  // Area transformations
  private: {
    // Area transformations
    areaToCamera: areaToCamera,
    areaToPixels: areaToPixels,
    mirrorAreaCamera: mirrorAreaCamera,
    mirrorAreaPixels: mirrorAreaPixels,
    rotateArea: rotateArea,
    // Size transformations
    sizeToCamera: sizeToCamera,
    sizeToPixels: sizeToPixels,
    // Point transformations
    toCamera: toCamera,
    toPixels: toPixels,
    rotatePoint: rotatePoint
  }
};

});