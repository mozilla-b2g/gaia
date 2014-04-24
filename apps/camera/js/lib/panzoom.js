define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var GestureDetector = require('GestureDetector');

/**
 * Exports
 */

module.exports = addPanAndZoomHandlers;

/*
 * This module adds pan-and-zoom capability to images displayed by
 * shared/js/media/media_frame.js.
 * It is used by preview-gallery.js and confirm.js
 */
function addPanAndZoomHandlers(frame, swipeCallback) {
  // frame is the MediaFrame object. container is its DOM element.
  var container = frame.container;

  // Generate gesture events for the container
  var gestureDetector = new GestureDetector(container);
  gestureDetector.startDetecting();

  // When the user touches the screen and moves their finger left or
  // right, they might want to pan within a zoomed-in image, or they
  // might want to swipe between multiple items in the camera preview
  // gallery. We pass the amount of motion to the MediaFrame pan() method,
  // and it returns the amount that cannot be used to pan the displayed
  // item. We track this returned amount as how far left or right the
  // image has been swiped, and pass the number to the swipeCallback.
  var swipeAmount = 0;

  // And handle them with these listeners
  container.addEventListener('dbltap', handleDoubleTap);
  container.addEventListener('transform', handleTransform);
  container.addEventListener('pan', handlePan);
  if (swipeCallback) {
    container.addEventListener('swipe', handleSwipe);
  }

  function handleDoubleTap(e) {
    var scale;
    if (frame.fit.scale > frame.fit.baseScale) {
      scale = frame.fit.baseScale / frame.fit.scale;
    }
    else {
      scale = 2;
    }

    frame.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
  }

  function handleTransform(e) {
    frame.zoom(e.detail.relative.scale,
               e.detail.midpoint.clientX, e.detail.midpoint.clientY);
  }

  function handlePan(e) {
    var dx = e.detail.relative.dx;
    var dy = e.detail.relative.dy;

    if (swipeCallback) {
      dx += swipeAmount;
      swipeAmount = frame.pan(dx, dy);
      swipeCallback(swipeAmount);
    } else {
      frame.pan(dx, dy);
    }
  }

  function handleSwipe(e) {
    if (swipeAmount !== 0) {
      swipeCallback(swipeAmount, e.detail.vx);
      swipeAmount = 0;
    }
  }
}

});
