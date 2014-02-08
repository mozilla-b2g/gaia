// This file contains Gallery code related to the fullscreen view

'use strict';

var frames = $('frames');

// These three objects are holders for the previous, current and next
// photos or videos to be displayed. They get swapped around and
// reused when we pan to the next or previous photo: next becomes
// current, current becomes previous etc.  See nextFile() and
// previousFile().  Note also that the Frame object is not a DOM
// element.  Use currentFrame.container to refer to the div
// element. The frame constructor creates an <img> element, a <video>
// element, and video player controls within the div, and you can refer to
// those as currentFrame.image and currentFrame.video.player and
// currentFrame.video.controls.
var previousFrame = new MediaFrame($('frame1'));
var currentFrame = new MediaFrame($('frame2'));
var nextFrame = new MediaFrame($('frame3'));

if (CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH) {
  previousFrame.setMinimumPreviewSize(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,
                                      CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT);
  currentFrame.setMinimumPreviewSize(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,
                                     CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT);
  nextFrame.setMinimumPreviewSize(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,
                                  CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT);
}

// When this variable is set to true, we ignore any user gestures
// so we don't try to pan or zoom during a frame transition.
var transitioning = false;

// Clicking on the back button goes back to the thumbnail view
$('fullscreen-back-button').onclick = setView.bind(null, thumbnailListView);

// Clicking the delete button while viewing a single item deletes that item
$('fullscreen-delete-button').onclick = deleteSingleItem;

// Clicking the Edit button while viewing a photo switches to edit mode
$('fullscreen-edit-button').onclick = function() {
  loader.load('js/ImageEditor.js', function() {
    editPhotoIfCardNotFull(currentFileIndex);
  });
};

// In fullscreen mode, the share button shares the current item
$('fullscreen-share-button').onclick = shareSingleItem;

// Clicking the information button will display information about the photo.
$('fullscreen-info-button').onclick = function() {
  loader.load(['js/info.js', 'shared/style/confirm.css', 'style/info.css'],
              function() {
                showFileInformation(files[currentFileIndex]);
              });
};

// Use the GestureDetector.js library to handle gestures.
// This will generate tap, pan, swipe and transform events
new GestureDetector(frames).startDetecting();

// Handle gesture events
frames.addEventListener('tap', tapHandler);
frames.addEventListener('dbltap', dblTapHandler);
frames.addEventListener('pan', panHandler);
frames.addEventListener('swipe', swipeHandler);
frames.addEventListener('transform', transformHandler);

// When displaying a photo or video, a tap hides or shows the toolbar.
// The video player has its own toolbar, so when a video starts playing
// we want to hide the gallery toolbar. And then restore it on pause.
// All three players need this pair of event handlers.
// Note that we're using the onplaying/onpaused fake handlers the
// VideoPlayer object, not the real onplay/onpause handlers of the <video>
// element. This is because VideoPlayer pauses and plays the <video> when
// the user drags on the slider, and we don't want to trigger these handlers
// in that case.
currentFrame.video.onplaying =
  previousFrame.video.onplaying =
  nextFrame.video.onplaying =
  function hideToolbarOnPlay() {
    this.toolbarWasHidden =
      fullscreenView.classList.contains('toolbarhidden');
    if (!this.isToolbarHidden)
      fullscreenView.classList.add('toolbarhidden');
  };

currentFrame.video.onpaused =
  previousFrame.video.onpaused =
  nextFrame.video.onpaused =
  function restoreToolbarOnPause() {
    if (this.toolbarWasHidden === false)
      fullscreenView.classList.remove('toolbarhidden');
    delete this.toolbarWasHidden;
  };

// Each of the Frame container elements may be subject to animated
// transitions. So give them transitionend event handlers that
// remove the transition style property when the transition ends.
// This helps prevent unexpected transitions.
function removeTransition(event) {
  event.target.style.transition = null;
}

previousFrame.container.addEventListener('transitionend', removeTransition);
currentFrame.container.addEventListener('transitionend', removeTransition);
nextFrame.container.addEventListener('transitionend', removeTransition);

// Clicking the delete button while viewing a single item deletes that item
function deleteSingleItem() {
  var msg;
  if (files[currentFileIndex].metadata.video) {
    msg = navigator.mozL10n.get('delete-video?');
  }
  else {
    msg = navigator.mozL10n.get('delete-photo?');
  }
  if (confirm(msg)) {
    // disable delete and share button to prevent operations while delete item
    $('fullscreen-delete-button').classList.add('disabled');
    $('fullscreen-share-button').classList.add('disabled');

    deleteFile(currentFileIndex);
  }
}

// In fullscreen mode, the share button shares the current item
function shareSingleItem() {
  share([currentFrame.imageblob || currentFrame.videoblob]);
}

// In order to distinguish single taps from double taps, we have to
// wait after a tap arrives to make sure that a dbltap event isn't
// coming soon.
var taptimer = null;
function tapHandler(e) {
  // If there is already a timer set, then this is is the second tap
  // and we're about to get a dbl tap event, so ignore this one
  if (taptimer)
    return;
  // If we don't get a second tap soon, then treat this as a single tap
  taptimer = setTimeout(function() {
    taptimer = null;
    singletap(e);
  }, GestureDetector.DOUBLE_TAP_TIME);
}

// Dispatch double tap events, but only when displaying a photo
function dblTapHandler(e) {
  if (currentFrame.displayingVideo)
    return;

  clearTimeout(taptimer);
  taptimer = null;
  doubletapOnPhoto(e);
}

function singletap(e) {
  if (currentView === fullscreenView) {
    if (currentFrame.displayingImage || currentFrame.video.player.paused) {
      fullscreenView.classList.toggle('toolbarhidden');
    }
  }
}

// Quick zoom in and out with dbltap events
function doubletapOnPhoto(e) {
  // Don't allow zooming while we're still scanning for photos and
  // have found large photos without previews on the card.  Zooming in
  // decodes the full-size version of the photo and that can cause OOM
  // errors if there is also metadata scanning going on with large images.
  // XXX: Remove this when bug 854795 is fixed.
  if (photodb.parsingBigFiles)
    return;

  var scale;
  if (currentFrame.fit.scale > currentFrame.fit.baseScale)   // If zoomed in
    scale = currentFrame.fit.baseScale / currentFrame.fit.scale; // zoom out
  else                                                       // Otherwise
    scale = 2;                                                   // zoom in

  currentFrame.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
}

// Pan the item sideways when the user moves their finger across the screen
function panHandler(event) {
  if (transitioning)
    return;

  var dx = event.detail.relative.dx;
  var dy = event.detail.relative.dy;
  var oldFrameOffset = frameOffset;

  // If the frames are already being shifted in the same direction as
  // dx then this just continues the shift.  Otherwise, dx might shift
  // them back toward the center. If the frames are unshifted to begin
  // with or become unshifted after applying dx, then we have got to
  // pass dx to the pan() method of the frame, because it might pan
  // the image within the frame. But that method returns any dx it
  // can't use, and we apply that to shifting the frames.

  // If the frames are already shifted and dx is in the same direction, or
  // if dx is in the opposite direction but isn't big enough to bring
  // the frames back to the center, just adjust the frame positions.
  // There is no need to pan the content of the frame in this case.
  if ((frameOffset > 0 && dx > 0) ||
      (frameOffset < 0 && dx < 0) ||
      (frameOffset !== 0 && frameOffset > -dx)) {
    frameOffset += dx;
  }
  else {
    // If the frame is shifted, this dx brings it back to center
    if (frameOffset !== 0) {
      dx += frameOffset;
      frameOffset = 0;
    }

    // Now let the frame pan its content, and add any dx that it doesn't use
    // to the frame offset
    frameOffset += currentFrame.pan(dx, dy);
  }

  // Don't swipe past the end of the last item or past the start of the first
  if ((currentFileIndex === 0 && frameOffset > 0) ||
      (currentFileIndex === files.length - 1 && frameOffset < 0)) {
    frameOffset = 0;
  }

  // If the frameOffset has changed since we started, reposition the frames
  if (frameOffset !== oldFrameOffset)
    setFramesPosition();
}

// When the user lifts their finger after panning we get this event
function swipeHandler(event) {
  // If we just panned within a zoomed-in photo, and the frames are not
  // shifted at all, then we don't have to do anything here.
  if (frameOffset === 0)
    return;

  // 1 means we're going to the next item -1 means the previous
  var direction = (frameOffset < 0) ? 1 : -1;

  // If we're in a right-to-left locale, reverse those directions
  if (languageDirection === 'rtl')
    direction *= -1;

  // Did we pan far enough or swipe fast enough to transition to
  // a different item?
  var farenough =
    Math.abs(frameOffset) > window.innerWidth * TRANSITION_FRACTION;
  var velocity = event.detail.vx;
  var fastenough = Math.abs(velocity) > TRANSITION_SPEED;

  // Make sure that that the speed and pan amount are in the same direction
  var samedirection = velocity === 0 || frameOffset / velocity >= 0;

  // Is there a next or previous item to transition to?
  var fileexists =
    (direction === 1 && currentFileIndex + 1 < files.length) ||
    (direction === -1 && currentFileIndex > 0);

  // If all of these conditions hold, then we'll transition to the
  // next photo or the previous photo
  if (direction !== 0 && (farenough || fastenough) &&
      samedirection && fileexists) {

    // Compute how long the transition should take based on the velocity
    var speed = Math.max(Math.abs(velocity), TRANSITION_SPEED);
    var time = (window.innerWidth - Math.abs(frameOffset)) / speed;

    // Transition frames in the appropriate direction
    if (direction === 1)
      nextFile(time);
    else
      previousFile(time);
  }
  else if (frameOffset !== 0) {
    // Otherwise, just restore the current item by undoing
    // the translations we added during panning
    var time = Math.abs(frameOffset) / TRANSITION_SPEED;

    currentFrame.container.style.transition =
      nextFrame.container.style.transition =
      previousFrame.container.style.transition =
      'transform ' + time + 'ms ease';

    resetFramesPosition();

    // Ignore  pan and zoom gestures while the transition happens
    transitioning = true;
    setTimeout(function() { transitioning = false; }, time);
  }
}

// We also support pinch-to-zoom
function transformHandler(e) {
  if (transitioning)
    return;

  // Don't allow zooming while we're still scanning for photos and
  // have found large photos without previews on the card.  Zooming in
  // decodes the full-size version of the photo and that can cause OOM
  // errors if there is also metadata scanning going on with large images.
  // XXX: Remove this when bug 854795 is fixed.
  if (photodb.parsingBigFiles)
    return;

  currentFrame.zoom(e.detail.relative.scale,
                    e.detail.midpoint.clientX,
                    e.detail.midpoint.clientY);
}

// A utility function to display the nth image or video in the specified frame
// Used in showFile(), nextFile() and previousFile().
function setupFrameContent(n, frame) {
  // Make sure n is in range
  if (n < 0 || n >= files.length) {
    frame.clear();
    delete frame.filename;
    return;
  }

  var fileinfo = files[n];

  // If we're already displaying this file in this frame, then do nothing
  if (fileinfo.name === frame.filename)
    return;

  // Remember what file we're going to display
  frame.filename = fileinfo.name;

  photodb.getFile(fileinfo.name, function(imagefile) {
    if (fileinfo.metadata.video) {
      // If this is a video, then the file we just got is the poster image
      // and we still have to fetch the actual video
      getVideoFile(fileinfo.metadata.video, function(videofile) {
        frame.displayVideo(videofile, imagefile,
                           fileinfo.metadata.width,
                           fileinfo.metadata.height,
                           fileinfo.metadata.rotation || 0);
      });
    }
    else {
      // Otherwise, just display the image
      frame.displayImage(
        imagefile,
        fileinfo.metadata.width,
        fileinfo.metadata.height,
        fileinfo.metadata.preview,
        fileinfo.metadata.rotation,
        fileinfo.metadata.mirrored);
    }
  });
}

var FRAME_BORDER_WIDTH = 3;
var frameOffset = 0; // how far are the frames swiped side-to-side?

function setFramesPosition() {
  // XXX for RTL languages we should swap next and previous sides
  var width = window.innerWidth + FRAME_BORDER_WIDTH;
  currentFrame.container.style.transform =
    'translateX(' + frameOffset + 'px)';
  nextFrame.container.style.transform =
    'translateX(' + (frameOffset + width) + 'px)';
  previousFrame.container.style.transform =
    'translateX(' + (frameOffset - width) + 'px)';
}

function resetFramesPosition() {
  frameOffset = 0;
  setFramesPosition();
}

// Switch from thumbnail list view to single-picture fullscreen view
// and display the specified file
function showFile(n) {
  setView(fullscreenView); // Switch to fullscreen mode if not already there

  setupFrameContent(n - 1, previousFrame);
  setupFrameContent(n, currentFrame);
  setupFrameContent(n + 1, nextFrame);
  currentFileIndex = n;

  resetFramesPosition();

  // Disable the edit button if this is a video or mediaDB is scanning
  // Enable otherwise
  if (files[n].metadata.video || photodb.scanning)
    $('fullscreen-edit-button').classList.add('disabled');
  else
    $('fullscreen-edit-button').classList.remove('disabled');
  // Always bring delete and share button back after show file
  $('fullscreen-delete-button').classList.remove('disabled');
  $('fullscreen-share-button').classList.remove('disabled');
}

// Transition to the next file, animating it over the specified time (ms).
// This is used when the user pans.
function nextFile(time) {
  // If already displaying the last one, do nothing.
  if (currentFileIndex === files.length - 1)
    return;

  // If the current frame is using a <video> element instead of just
  // displaying a poster image, reset it back to just the image
  if (currentFrame.displayingVideo && currentFrame.video.playerShowing)
    currentFrame.video.init();

  // Set a flag to ignore pan and zoom gestures during the transition.
  transitioning = true;
  setTimeout(function() { transitioning = false; }, time);

  // Set transitions for the visible frames
  var transition = 'transform ' + time + 'ms ease';
  currentFrame.container.style.transition = transition;
  nextFrame.container.style.transition = transition;

  // Cycle the three frames so next becomes current,
  // current becomes previous, and previous becomes next.
  var tmp = previousFrame;
  previousFrame = currentFrame;
  currentFrame = nextFrame;
  nextFrame = tmp;
  currentFileIndex++;

  // Move (transition) the frames to their new position
  resetFramesPosition();

  // Update the frame for the new next item
  setupFrameContent(currentFileIndex + 1, nextFrame);

  // When the transition is done, cleanup
  currentFrame.container.addEventListener('transitionend', function done(e) {
    this.removeEventListener('transitionend', done);

    // Reposition the item that just transitioned off the screen
    // to reset any zooming and panning
    previousFrame.reset();
  });

  // Disable the edit button if this is a video or
  // mediaDB is scanning, enable otherwise
  if (currentFrame.displayingVideo || photodb.scanning)
    $('fullscreen-edit-button').classList.add('disabled');
  else
    $('fullscreen-edit-button').classList.remove('disabled');
}

// Just like nextFile() but in the other direction
function previousFile(time) {
  // if already displaying the first one, do nothing.
  if (currentFileIndex === 0)
    return;

  // If the current frame is using a <video> element instead of just
  // displaying a poster image, reset it back to just the image.
  if (currentFrame.displayingVideo && currentFrame.video.playerShowing)
    currentFrame.video.init();

  // Set a flag to ignore pan and zoom gestures during the transition.
  transitioning = true;
  setTimeout(function() { transitioning = false; }, time);

  // Set transitions for the visible frames
  var transition = 'transform ' + time + 'ms ease';
  previousFrame.container.style.transition = transition;
  currentFrame.container.style.transition = transition;

  // Transition to the previous item: previous becomes current, current
  // becomes next, etc.
  var tmp = nextFrame;
  nextFrame = currentFrame;
  currentFrame = previousFrame;
  previousFrame = tmp;
  currentFileIndex--;

  // Move (transition) the frames to their new position
  resetFramesPosition();

  // Preload the new previous item
  setupFrameContent(currentFileIndex - 1, previousFrame);

  // When the transition is done do some cleanup
  currentFrame.container.addEventListener('transitionend', function done(e) {
    this.removeEventListener('transitionend', done);
    // Reset the size and position of the item that just panned off
    nextFrame.reset();
  });

  // Disable the edit button if we're now viewing a video or mediaDB
  // is scanning, enable otherwise
  if (currentFrame.displayingVideo || photodb.scanning)
    $('fullscreen-edit-button').classList.add('disabled');
  else
    $('fullscreen-edit-button').classList.remove('disabled');
}
