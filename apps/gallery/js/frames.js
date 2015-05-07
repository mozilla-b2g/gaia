// This file contains Gallery code related to the fullscreen view
'use strict';
/* global
  $,
  CONFIG_MAX_IMAGE_PIXEL_SIZE,
  CONFIG_MAX_PICK_PIXEL_SIZE,
  CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT,
  CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,
  cropResizeRotate,
  currentFileIndex,
  currentView,
  deleteFile,
  Dialogs,
  editPhotoIfCardNotFull,
  ensureFileBackedBlob,
  files,
  frames:true,
  fullscreenButtons,
  fullscreenView,
  GestureDetector,
  getCurrentFile,
  getVideoFile,
  isPhone,
  LAYOUT_MODE,
  LazyLoader,
  MediaFrame,
  NFC,
  photodb,
  setView,
  share,
  showFileInformation,
  Spinner,
  TRANSITION_FRACTION,
  TRANSITION_SPEED,
  updateFocusThumbnail
*/
/* exported
  clearFrames,
  showFile
*/

var frames = $('frames');

// These three objects are holders for the previous, current and next
// photos or videos to be displayed. They get swapped around and
// reused when we pan to the next or previous photo: next becomes
// current, current becomes previous etc.  See nextFile() and
// previousFile().  Note also that the Frame object is not a DOM
// element.  Use currentFrame.container to refer to the section
// element. The frame constructor creates an <img> element, a <video>
// element, and video player controls within the section, and you can refer to
// those as currentFrame.image and currentFrame.video.player and
// currentFrame.video.controls.
var maxImageSize = CONFIG_MAX_IMAGE_PIXEL_SIZE;
var previousFrame = new MediaFrame($('frame1'), true, maxImageSize);
var currentFrame = new MediaFrame($('frame2'), true, maxImageSize);
var nextFrame = new MediaFrame($('frame3'), true, maxImageSize);

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

// Clicking on the back button will go to the preview view
// Note that tablet doesn't have a back button, it's bind to header instead,
// so we don't try to register click event on a non-existent button
if (fullscreenButtons.back) {
  fullscreenButtons.back.onclick = setView.bind(null, LAYOUT_MODE.list);
}

// Clicking the delete button while viewing a single item deletes that item
fullscreenButtons.delete.onclick = deleteSingleItem;

// Clicking the Edit button while viewing a photo switches to edit mode
fullscreenButtons.edit.onclick = function() {
  LazyLoader.load(['js/ImageEditor.js',
                   'js/image_processor_thread.js',
                   'shared/js/media/crop_resize_rotate.js',
                   'shared/style/action_menu.css'
                  ], function() {
                    editPhotoIfCardNotFull(currentFileIndex);
                  });
};

// In fullscreen mode, the share button shares the current item
fullscreenButtons.share.onclick = shareSingleItem;

// Clicking the information button will display information about the photo.
fullscreenButtons.info.onclick = function() {
  LazyLoader.load(['js/info.js', 'shared/style/confirm.css', 'style/info.css'],
                  function() {
                    showFileInformation(files[currentFileIndex]);
                  });
};

// Use the GestureDetector.js library to handle gestures.
// This will generate tap, pan, swipe and transform events
new GestureDetector(frames).startDetecting();

var frameOffset = 0; // how far are the frames swiped side-to-side?

// Handle gesture events
frames.addEventListener('tap', tapHandler);
frames.addEventListener('dbltap', dblTapHandler);
frames.addEventListener('pan', panHandler);
frames.addEventListener('swipe', swipeHandler);
frames.addEventListener('transform', transformHandler);
frames.addEventListener('wheel', wheelHandler);

currentFrame.video.onfullscreentap =
  previousFrame.video.onfullscreentap =
  nextFrame.video.onfullscreentap =
  function fullscreenRequested(ev) {
    setView(LAYOUT_MODE.fullscreen);
    resizeFrames();
  };

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
    this.isToolbarHidden =
      fullscreenView.classList.contains('toolbar-hidden');
    if (!this.isToolbarHidden) {
      fullscreenView.classList.add('toolbar-hidden');
    }
  };

currentFrame.video.onpaused =
  previousFrame.video.onpaused =
  nextFrame.video.onpaused =
  function restoreToolbarOnPause() {
    this.isToolbarHidden =
      fullscreenView.classList.contains('toolbar-hidden');
    if (this.isToolbarHidden === true) {
      fullscreenView.classList.remove('toolbar-hidden');
    }
    delete this.isToolbarHidden;
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
    msg = 'delete-video?';
  }
  else {
    msg = 'delete-photo?';
  }
  // We need to disable NFC sharing when showing delete confirmation dialog
  NFC.unshare();

  Dialogs.confirm({
    messageId: msg,
    cancelId: 'cancel',
    confirmId: 'delete',
    danger: true,
    bodyClass: 'showing-dialog'
  }, function() { // onSuccess
    // disable delete, edit and share button to prevent
    // operations while delete item
    fullscreenButtons.delete.classList.add('disabled');
    fullscreenButtons.share.classList.add('disabled');
    fullscreenButtons.edit.classList.add('disabled');

    deleteFile(currentFileIndex);
    // Enable NFC sharing when done deleting and returns to fullscreen view
    NFC.share(getCurrentFile);
  }, function() { // onCancel
    // Enable NFC sharing when cancels delete and returns to fullscreen view
    NFC.share(getCurrentFile);
  });
}

// In fullscreen mode, the share button shares the current item
function shareSingleItem() {
  // This is the item we're sharing
  var fileinfo = files[currentFileIndex];

  // If the item is a video, just share it
  if (fileinfo.metadata.video) {
    share([currentFrame.videoblob]);
  }
  else {
    // Otherwise it is an image.
    // If it does not have any EXIF orientation, and if we don't need
    // to downsample it, then just share it as it is.
    if (!fileinfo.metadata.rotation &&
        !fileinfo.metadata.mirrored &&
        !CONFIG_MAX_PICK_PIXEL_SIZE) {
      share([currentFrame.imageblob]);
    }
    else {
      // This is only tricky case. If we are sharing an image that uses
      // EXIF orientation for correct display, rotate it before sharing
      // so that the recieving app doesn't have to know about EXIF
      LazyLoader.load(['shared/js/media/crop_resize_rotate.js'],
                      shareModifiedImage);
    }
  }

  function shareModifiedImage() {
    var metadata = fileinfo.metadata;
    var button = fullscreenButtons.share;
    button.classList.add('disabled');
    Spinner.show();
    var maxsize = CONFIG_MAX_PICK_PIXEL_SIZE || CONFIG_MAX_IMAGE_PIXEL_SIZE;
    cropResizeRotate(currentFrame.imageblob, null,
                     maxsize || null, null, metadata,
                     function(error, rotatedBlob) {
                       if (error) {
                         console.error('Error while rotating image: ', error);
                         rotatedBlob = currentFrame.imageblob;
                       }
                       ensureFileBackedBlob(rotatedBlob, function(file) {
                         Spinner.hide();
                         button.classList.remove('disabled');
                         share([file], currentFrame.imageblob.name);
                       });
                     });
  }
}

// In order to distinguish single taps from double taps, we have to
// wait after a tap arrives to make sure that a dbltap event isn't
// coming soon.
var taptimer = null;
function tapHandler(e) {
  // Ignore tap event if 1. there is already a timer set, then this
  // is the second tap and we're about to get a double tap event
  // 2. currentFrame has not yet loaded any image or video.
  if (taptimer ||
      (!currentFrame.displayingImage && !currentFrame.displayingVideo)) {
    return;
  }

  // If we don't get a second tap soon, then treat this as a single tap
  taptimer = setTimeout(function() {
    taptimer = null;
    singletap(e);
  }, GestureDetector.DOUBLE_TAP_TIME);
}

// Dispatch double tap events, but only when displaying a photo
function dblTapHandler(e) {
  if (currentFrame.displayingVideo) {
    return;
  }

  clearTimeout(taptimer);
  taptimer = null;
  doubletapOnPhoto(e);
}

// Resize all the frames' content, if its container's size is changed
function resizeFrames() {
  nextFrame.reset();
  previousFrame.reset();
  currentFrame.reset();
}

// Handle single tap event on frames
// We manage the display of toolbar on the header and footer after user
// tap the image or video. If it's in preview mode, it simply switch to
// fullscreen mode directly.
function singletap(e) {
  if (currentView === LAYOUT_MODE.fullscreen) {
    if ((currentFrame.displayingImage || currentFrame.video.player.paused) &&
         isPhone) {
      fullscreenView.classList.toggle('toolbar-hidden');
    }
  } else if (currentView === LAYOUT_MODE.list &&
             !files[currentFileIndex].metadata.video) {
    // We don't separate cases by screen size, because we don't show
    // preview screen on tiny device.
    setView(LAYOUT_MODE.fullscreen);
    resizeFrames();
  }
}

// Quick zoom in and out with dbltap events
function doubletapOnPhoto(e) {
  // Don't allow zooming while we're still scanning for photos and
  // have found large photos without previews on the card.  Zooming in
  // decodes the full-size version of the photo and that can cause OOM
  // errors if there is also metadata scanning going on with large images.
  // XXX: Remove this when bug 854795 is fixed.
  if (photodb.parsingBigFiles) {
    return;
  }

  var scale;
  if (currentFrame.fit.scale > currentFrame.fit.baseScale) {   // If zoomed in
    scale = currentFrame.fit.baseScale / currentFrame.fit.scale; // zoom out
  } else {                                                       // Otherwise
    scale = 2;                                                   // zoom in
  }

  currentFrame.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
}

// Pan the item sideways when the user moves their finger across the screen
function panHandler(event) {
  if (transitioning) {
    return;
  }

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
  // Handle frameOffset reset in RTL when directions are reversed. See 1099458
  if (navigator.mozL10n.language.direction === 'ltr') {
    if ((currentFileIndex === 0 && frameOffset > 0) ||
        (currentFileIndex === files.length - 1 && frameOffset < 0)) {
      frameOffset = 0;
    }
  } else {
    if ((currentFileIndex === 0 && frameOffset < 0) ||
        (currentFileIndex === files.length - 1 && frameOffset > 0)) {
      frameOffset = 0;
    }
  }

  // If the frameOffset has changed since we started, reposition the frames
  if (frameOffset !== oldFrameOffset) {
    setFramesPosition();
  }
}

// When the user lifts their finger after panning we get this event
function swipeHandler(event) {
  // If we just panned within a zoomed-in photo, and the frames are not
  // shifted at all, then we don't have to do anything here.
  if (frameOffset === 0) {
    return;
  }

  // 1 means we're going to the next item -1 means the previous
  var direction = (frameOffset < 0) ? 1 : -1;

  // If we're in a right-to-left locale, reverse those directions
  if (navigator.mozL10n.language.direction === 'rtl') {
    direction *= -1;
  }

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
  var time;
  if (direction !== 0 && (farenough || fastenough) &&
      samedirection && fileexists) {

    // Compute how long the transition should take based on the velocity
    var speed = Math.max(Math.abs(velocity), TRANSITION_SPEED);
    time = (window.innerWidth - Math.abs(frameOffset)) / speed;

    // Transition frames in the appropriate direction
    if (direction === 1) {
      nextFile(time);
    } else {
      previousFile(time);
    }
  }
  else if (frameOffset !== 0) {
    // Otherwise, just restore the current item by undoing
    // the translations we added during panning
    time = Math.abs(frameOffset) / TRANSITION_SPEED;

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

// When a screen reader swipes with two fingers
function wheelHandler(event) {
  if (event.deltaMode !== event.DOM_DELTA_PAGE || !event.deltaX) {
    return;
  }

  if (event.deltaX > 0) {
    nextFile(150);
  } else {
    previousFile(150);
  }
}

// We also support pinch-to-zoom
function transformHandler(e) {
  if (transitioning) {
    return;
  }

  // Don't allow zooming while we're still scanning for photos and
  // have found large photos without previews on the card.  Zooming in
  // decodes the full-size version of the photo and that can cause OOM
  // errors if there is also metadata scanning going on with large images.
  // XXX: Remove this when bug 854795 is fixed.
  if (photodb.parsingBigFiles) {
    return;
  }

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
  if (fileinfo.name === frame.filename) {
    return;
  }

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

function setFramesPosition() {
  var width = window.innerWidth + FRAME_BORDER_WIDTH;
  currentFrame.container.style.transform =
    'translateX(' + frameOffset + 'px)';
  if (navigator.mozL10n.language.direction === 'ltr') {
    nextFrame.container.style.transform =
      'translateX(' + (frameOffset + width) + 'px)';
    previousFrame.container.style.transform =
      'translateX(' + (frameOffset - width) + 'px)';
  }
  else {
    // For RTL languages we swap next and previous sides
    nextFrame.container.style.transform =
      'translateX(' + (frameOffset - width) + 'px)';
    previousFrame.container.style.transform =
      'translateX(' + (frameOffset + width) + 'px)';
  }

  // XXX Bug 1021782 add 'current' class to currentFrame
  nextFrame.container.classList.remove('current');
  previousFrame.container.classList.remove('current');
  currentFrame.container.classList.add('current');

  // Hide adjacent frames from screen reader
  nextFrame.container.setAttribute('aria-hidden', true);
  previousFrame.container.setAttribute('aria-hidden', true);
  currentFrame.container.removeAttribute('aria-hidden');
}

function resetFramesPosition() {
  frameOffset = 0;
  setFramesPosition();
}

// Switch from thumbnail list view to single-picture fullscreen view
// and display the specified file.
function showFile(n) {
  // Mark what we're focusing on and unmark the old one
  updateFocusThumbnail(n);
  updateFrames();

  // Disable the edit button if this is a video or mediaDB is scanning
  if (files[currentFileIndex].metadata.video ||
      photodb.scanning) {
    fullscreenButtons.edit.classList.add('disabled');
  } else {
    fullscreenButtons.edit.classList.remove('disabled');
  }
  // Always bring delete and share button back after show file
  fullscreenButtons.delete.classList.remove('disabled');
  fullscreenButtons.share.classList.remove('disabled');
}

function updateFrames() {
  var n = currentFileIndex;
  setupFrameContent(n - 1, previousFrame);
  setupFrameContent(n, currentFrame);
  setupFrameContent(n + 1, nextFrame);

  resetFramesPosition();
}

function clearFrames() {
  previousFrame.clear();
  currentFrame.clear();
  nextFrame.clear();
  delete previousFrame.filename;
  delete currentFrame.filename;
  delete nextFrame.filename;
}

// Transition to the next file, animating it over the specified time (ms).
// This is used when the user pans.
function nextFile(time) {
  // If already displaying the last one, do nothing.
  if (currentFileIndex === files.length - 1) {
    return;
  }

  // If the current frame is using a <video> element instead of just
  // displaying a poster image, reset it back to just the image
  if (currentFrame.displayingVideo && currentFrame.video.playerShowing) {
    currentFrame.video.init();
  }

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

  updateFocusThumbnail(currentFileIndex + 1);
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
  if (currentFrame.displayingVideo || photodb.scanning) {
    fullscreenButtons.edit.classList.add('disabled');
  } else {
    fullscreenButtons.edit.classList.remove('disabled');
  }
}

// Just like nextFile() but in the other direction
function previousFile(time) {
  // if already displaying the first one, do nothing.
  if (currentFileIndex === 0) {
    return;
  }

  // If the current frame is using a <video> element instead of just
  // displaying a poster image, reset it back to just the image.
  if (currentFrame.displayingVideo && currentFrame.video.playerShowing) {
    currentFrame.video.init();
  }

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

  updateFocusThumbnail(currentFileIndex - 1);
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
  if (currentFrame.displayingVideo || photodb.scanning) {
    fullscreenButtons.edit.classList.add('disabled');
  } else {
    fullscreenButtons.edit.classList.remove('disabled');
  }
}
