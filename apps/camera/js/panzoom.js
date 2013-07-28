/*
 * This module adds pan-and-zoom capability to images displayed by
 * shared/js/media/media_frame.js.  It is used by filmstrip.js and confirm.js
 */
function addPanAndZoomHandlers(frame) {
  // frame is the MediaFrame object. container is its the DOM element.
  var container = frame.container;

  // Generate gesture events for the container
  var gestureDetector = new GestureDetector(container);
  gestureDetector.startDetecting();

  // And handle them with these listeners
  container.addEventListener('dbltap', handleDoubleTap);
  container.addEventListener('transform', handleTransform);
  container.addEventListener('pan', handlePan);

  function handleDoubleTap(e) {
    var scale;
    if (frame.fit.scale > frame.fit.baseScale)
      scale = frame.fit.baseScale / frame.fit.scale;
    else
      scale = 2;

    // If the phone orientation is 0 (unrotated) then the gesture detector's
    // event coordinates match what's on the screen, and we use them to
    // specify a point to zoom in or out on. For other orientations we could
    // calculate the correct point, but instead just use the midpoint.
    var x, y;
    if (Camera._phoneOrientation === 0) {
      x = e.detail.clientX;
      y = e.detail.clientY;
    }
    else {
      x = container.offsetWidth / 2;
      y = container.offsetHeight / 2;
    }

    frame.zoom(scale, x, y, 200);
  }

  function handleTransform(e) {
    // If the phone orientation is 0 (unrotated) then the gesture detector's
    // event coordinates match what's on the screen, and we use them to
    // specify a point to zoom in or out on. For other orientations we could
    // calculate the correct point, but instead just use the midpoint.
    var x, y;
    if (Camera._phoneOrientation === 0) {
      x = e.detail.midpoint.clientX;
      y = e.detail.midpoint.clientY;
    }
    else {
      x = container.offsetWidth / 2;
      y = container.offsetHeight / 2;
    }

    frame.zoom(e.detail.relative.scale, x, y);
  }

  function handlePan(e) {
    // The gesture detector event does not take our CSS rotation into
    // account, so we have to pan by a dx and dy that depend on how
    // the MediaFrame is rotated
    var dx, dy;
    switch (Camera._phoneOrientation) {
    case 0:
      dx = e.detail.relative.dx;
      dy = e.detail.relative.dy;
      break;
    case 90:
      dx = -e.detail.relative.dy;
      dy = e.detail.relative.dx;
      break;
    case 180:
      dx = -e.detail.relative.dx;
      dy = -e.detail.relative.dy;
      break;
    case 270:
      dx = e.detail.relative.dy;
      dy = -e.detail.relative.dx;
      break;
    }

    frame.pan(dx, dy);
  }
}
