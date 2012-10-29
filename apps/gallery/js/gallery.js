/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * This app displays photos that are stored on the phone.
 *
 * Its starts with a thumbnail view in which small versions of all photos
 * are displayed.  Tapping on a thumbnail shows the full-size image.
 *
 * When a full-size image is displayed, swiping left or right moves to
 * the next or previous image (this depends on the writing direction of
 * the locale).  The app can also perform a slideshow, transitioning
 * between photos automatically.
 *
 * The app supports two-finger "pinch" gestures to zoom in and out on an
 * image.  When zoomed, a one finger swipe gesture pans within the zoomed
 * image, and only moves to the next or previous image once you reach the
 * edge of the currently displayed image.
 *
 * To make transitions between photos smooth, the app preloads the next
 * and previous images and positions them off-screen to the right and
 * left (or opposite for RTL locales) of the currently displayed image.
 *
 * Images are displayed with <img> elements inside <div> elements. These
 * <div> elements are called "frames", and the three global variables
 * currentPhotoFrame, previousPhotoFrame and nextPhotoFrame refer to the
 * three frame divs.  The next and previous frames are positioned by
 * setting a CSS class, which sets the CSS left property to position them
 * offscreen (the classes are defined differently for RTL and LTR
 * languages).  When the user pans left or right (and when the current
 * image isn't zoomed in) the app sets the left property of the div that
 * contains all three frames so that the user sees one photo moving off
 * screen and the other one moving on. When the user lifts their finger,
 * the app uses a CSS transition to slide the current photo back into
 * place (if the pan wasn't far enough) or to complete the transition to
 * the next or previous photo.
 *
 * The transitions are performed by changing the CSS classes on the three
 * frame <divs> and cycling them. To transition to the next photo, for
 * example, nextPhotoFrame becomes currentPhotoFrame, currentPhotoFrame
 * becomes previousPhotoFrame, and previousPhotoFrame cycles around to
 * become the new nextPhotoFrame (and loads a new image). At the same
 * time, the css classes on these frames are changed to reposition them
 * and CSS handles the transition animation for us, animating both the
 * change in the left property caused by the class change, and the change
 * in the transform property which is set back to the empty string.
 *
 * The trickiest code has to do with handling zooms and pans while the
 * photo is zoomed in.  If the photo isn't zoomed in, then any pan ends
 * with a transition to a new photo or back to the original photo.  But
 * when we're zoomed, then pans can just be moving around within the
 * zoomed photo. Panning and zooming a photo is implemented by setting
 * the CSS top, left, width and height photos of the img tag. (The img is
 * display:relative, and the frame is overflow:none.) So this is a
 * completely different positioning mechanism than the one used for
 * swiping and transitioning photos sideways.
 *
 * Notice that a single pan gesture can cause two different things to
 * happen: it moves the zoomed in image within its frame and then, when
 * edge of the photo is reached, it starts to transition from that photo
 * to the next or previous one. Also, when we do zooms, we want to zoom
 * in or out around the midpoint between the user's fingers, and zooming
 * around a point requires us to pan the photo. The code for handling the
 * zoom and pan computations is separated out into a separate PhotoState
 * class.  I'm not entirely convinced that this is the best abstraction,
 * but it does simplify things somewhat.
 *
 * Pan gestures are made with a single finger and are implemented with a
 * mousedown handler (so it works with a mouse on the desktop as well as
 * with a finger on a phone) that registers temporary capturing mousemove
 * and mouseup listeners.
 *
 * Zoom gestures are two finger gestures so they only work on
 * touch-sensitive devices and can't be tested on the desktop.  They're
 * implemented on top of basic touch events in the separate file gestures.js.
 *
 * This app has various display states it can be in.
 * Here's a list of the states and the transitions between them:
 *
 * State 0: Startup/Uninitialized
 *   -> regular launch: go to state 1
 *   -> launch for open activity: go to state 5
 *   -> launch for pick activity: go to state 7
 *
 * State 1: thumbnail list
 *   -> click on thumbnail: go to state 2
 *   -> click on select: go to state 3
 *
 * State 2: single photo view (with toolbar)
 *   -> gallery button: go to state 1
 *   -> edit button: go to state 4
 *   -> single tap: enter fullscreen mode, go to state 2a
 *   -> camera button: launch camera
 *   -> share button: launch share activity
 *   -> trash button: delete curent photo
 *
 * State 2a: fullscreen photo view (no toolbar)
 *   -> single tap: exit fullscreen mode, go to state 2
 *   -> leave fullscreen: go to state 2
 *
 * State 3: select mode
 *   -> click on X button: go to state 1
 *   -> click on thumbnail: highlight thumbnail
 *   -> trash button: delete selected images
 *   -> share button: share selected images
 *
 * State 4: edit mode
 *   -> click on X button: go to state 2
 *   -> save button: save edits, go to state 1 (?)
 *   -> exposure, crop, effects, borders buttons: switch among sub-states
 *    State 4a: exposure
 *    State 4b: cropping
 *    State 4c: effects
 *    State 4d: borders
 *
 * State 5: open mode
 *   Enter fullscreen when entering this mode (?)
 *   -> camera button: end activity, go to state 1 or just close self
 *   -> swipe down: end activity, go to state 1 or just close self
 *   -> trash button: delete file, end activity, go to state 1 or close self
 *   -> exit fullscreen: end activity, go to state 1 or just close self
 *
 * State 6: pick mode
 *   -> click on thumbnail: go to state 7
 *   -> back button: end activity, go to state 1 or just exit
 *   ->
 *
 * State 7: crop mode
 *   -> back button: go to state 6
 *   -> check button: end activity, go to state 1 or just exit
 *   -> crop controls: change image size
 */

//
// Tuneable parameters
//

// Pan this % of width to transition from one photo to the next
const TRANSITION_FRACTION = 0.25;

// This is the speed of our default transitions in pixels/ms.
// Swipe faster than this to transition faster. But we'll
// never go slower (except slide show transitions).
const TRANSITION_SPEED = 0.75;

var currentPhotoIndex = 0;       // What photo is currently displayed

function $(id) { return document.getElementById(id); }

// UI elements
var thumbnails = $('thumbnails');
var photoFrames = $('photo-frames');

// Only one of these three elements will be visible at a time
var thumbnailListView = $('thumbnail-list-view');
var thumbnailSelectView = $('thumbnail-select-view');
var photoView = $('photo-view');
var editView = $('edit-view');
var pickView = $('pick-view');
var cropView = $('crop-view');
var openView = $('open-view');

// These are the top-level view objects.
// This array is used by setView()
var views = [
  thumbnailListView, thumbnailSelectView, photoView, editView,
  pickView, cropView, openView
];
var currentView;

// These three divs hold the previous, current and next photos
// The divs get swapped around and reused when we pan to the
// next or previous photo: next becomes current, current becomes previous
// etc.  See nextPhoto() and previousPhoto().
var previousPhotoFrame = photoFrames.querySelector('div.previousPhoto');
var currentPhotoFrame = photoFrames.querySelector('div.currentPhoto');
var nextPhotoFrame = photoFrames.querySelector('div.nextPhoto');

// The currently displayed <img> element.
// This changes as photos are panned, but showPhoto(), nextPhoto() and
// previousPhoto() keep its value current.
var currentPhoto;

// This will hold a PhotoState object that encapsulates the zoom and pan
// calculations and holds the current size and position of the photo and
// also the amount of sideways swiping of the photo frames.
var photoState;

// When this variable is set to true, we ignore any user gestures
// so we don't try to pan or zoom during a photo transition.
var transitioning = false;

// This will be set to "ltr" or "rtl" when we get our localized event
var languageDirection;

// Where we store the images that photodb finds for us.
// Each array element is an object that includes a filename and metadata
var images = [];

// The MediaDB object that manages the filesystem and the database of metadata
// See init()
var photodb;


// The localized event is the main entry point for the app.
// We don't do anything until we receive it.
window.addEventListener('localized', function showBody() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');

  // Now initialize the rest of the app. But don't re-initialize if the user
  // switches languages when the app is already running
  if (!photodb)
    init();
});

function init() {
  photodb = new MediaDB('pictures', metadataParser, {
    mimeTypes: ['image/jpeg', 'image/png'],
    version: 2
  });

  // This is called when DeviceStorage becomes unavailable because the
  // sd card is removed or because it is mounted for USB mass storage
  // This may be called before onready if it is unavailable to begin with
  photodb.onunavailable = function(event) {
    var why = event.detail;
    if (why === MediaDB.NOCARD)
      showOverlay('nocard');
    else if (why === MediaDB.UNMOUNTED)
      showOverlay('pluggedin');
  };

  photodb.onready = function() {
    // Hide the nocard or pluggedin overlay if it is displayed
    if (currentOverlay === 'nocard' || currentOverlay === 'pluggedin')
      showOverlay(null);

    createThumbnailList();  // Display thumbnails for the images we know about
  };

  // When photodb scans, let the user know
  photodb.onscanstart = function() {
    $('progress').classList.remove('hidden');
    $('throbber').classList.add('throb');
  };

  // And hide the throbber when scanning is done
  photodb.onscanend = function() {
    $('progress').classList.add('hidden');
    $('throbber').classList.remove('throb');
  };

  // One or more files was created (or was just discovered by a scan)
  // XXX If the array is big, we should just rebuild the UI from scratch
  photodb.oncreated = function(event) {
    event.detail.forEach(imageCreated);
  };

  // One or more files were deleted (or were just discovered missing by a scan)
  // XXX If the array is big, we should just rebuild the UI from scratch
  photodb.ondeleted = function(event) {
    event.detail.forEach(imageDeleted);
  };


  // Start off in thumbnail list view, unless there is a pending activity
  // request message. In that case, the message handler will set the
  // initial view
  if (!navigator.mozHasPendingMessage('activity'))
    setView(thumbnailListView);

  // Register a handler for activities
  navigator.mozSetMessageHandler('activity', webActivityHandler);
}

function imageDeleted(filename) {
  // Find the deleted file in our images array
  for (var n = 0; n < images.length; n++) {
    if (images[n].name === filename)
      break;
  }

  if (n >= images.length)  // It was a file we didn't know about
    return;

  // Remove the image from the array
  var deletedImageData = images.splice(n, 1)[0];

  // Remove the corresponding thumbnail
  var thumbnailElts = thumbnails.querySelectorAll('.thumbnail');
  URL.revokeObjectURL(thumbnailElts[n].style.backgroundImage.slice(5, -2));
  thumbnails.removeChild(thumbnailElts[n]);

  // Change the index associated with all the thumbnails after the deleted one
  // This keeps the data-index attribute of each thumbnail element in sync
  // with the images[] array.
  for (var i = n + 1; i < thumbnailElts.length; i++) {
    thumbnailElts[i].dataset.index = i - 1;
  }

  // if remove last photo in full image view,
  // we need to show previous image, not next image.
  // Adjust currentPhotoIndex, too, if we have to.
  if (n < currentPhotoIndex)
    currentPhotoIndex--;

  if (currentPhotoIndex >= images.length)
    currentPhotoIndex = images.length - 1;

  if (n < editedPhotoIndex)
    editedPhotoIndex--;

  // If we're in single photo display mode, then the only way this function,
  // gets called is when we delete the currently displayed photo.  This means
  // that we need to redisplay.
  if (currentView === photoView && images.length > 0) {
    showPhoto(currentPhotoIndex);
  }

  // If there are no more photos show the "no pix" overlay
  if (images.length === 0) {
    setView(thumbnailListView);
    showOverlay('emptygallery');
  }
}

function deleteImage(n) {
  if (n < 0 || n >= images.length)
    return;

  // Delete the file from the MediaDB. This removes the db entry and
  // deletes the file in device storage. This will generate an change
  // event which will call imageDeleted()
  photodb.deleteFile(images[n].name);
}

function imageCreated(fileinfo) {
  var insertPosition;

  // If we were showing the 'no pictures' overlay, hide it
  if (currentOverlay === 'emptygallery')
    showOverlay(null);

  // If this new image is newer than the first one, it goes first
  // This is the most common case for photos, screenshots, and edits
  if (images.length === 0 || fileinfo.date > images[0].date) {
    insertPosition = 0;
  }
  else {
    // Otherwise we have to search for the right insertion spot
    insertPosition = binarysearch(images, fileinfo, function(a, b) {
      if (a.date < b.date)
        return 1;  // larger (newer) dates come first
      else if (a.date > b.date)
        return -1;
      return 0;
    });
  }

  // Insert the image info into the array
  images.splice(insertPosition, 0, fileinfo);

  // Create a thumbnail for this image and insert it at the right spot
  var thumbnail = createThumbnail(insertPosition);
  var thumbnailElts = thumbnails.querySelectorAll('.thumbnail');
  if (thumbnailElts.length === 0)
    thumbnails.appendChild(thumbnail);
  else
    thumbnails.insertBefore(thumbnail, thumbnailElts[insertPosition]);

  // increment the index of each of the thumbnails after the new one
  for (var i = insertPosition; i < thumbnailElts.length; i++) {
    thumbnailElts[i].dataset.index = i + 1;
  }

  if (currentPhotoIndex >= insertPosition)
    currentPhotoIndex++;
  if (editedPhotoIndex >= insertPosition)
    editedPhotoIndex++;

  // Redisplay the current photo if we're in photo view
  if (currentView === photoView) {
    showPhoto(currentPhotoIndex);
  }
}

// Assuming that array is sorted according to comparator, return the
// array index at which element should be inserted to maintain sort order
function binarysearch(array, element, comparator, from, to) {
  if (comparator === undefined)
    comparator = function(a, b) {
      if (a < b)
        return -1;
      if (a > b)
        return 1;
      return 0;
    };

  if (from === undefined)
    return binarysearch(array, element, comparator, 0, array.length);

  if (from === to)
    return from;

  var mid = Math.floor((from + to) / 2);

  var result = comparator(element, array[mid]);
  if (result < 0)
    return binarysearch(array, element, comparator, from, mid);
  else
    return binarysearch(array, element, comparator, mid + 1, to);
}


function setView(view) {
  if (currentView === view)
    return;

  // Do any necessary cleanup of the view we're exiting
  switch (currentView) {
  case thumbnailSelectView:
    // Clear the selection, if there is one
    Array.forEach(thumbnails.querySelectorAll('.selected.thumbnail'),
                  function(elt) { elt.classList.remove('selected'); });
    break;
  }

  // Show the specified view, and hide the others
  for (var i = 0; i < views.length; i++) {
    if (views[i] === view)
      views[i].classList.remove('hidden');
    else
      views[i].classList.add('hidden');
  }

  // Now do setup for the view we're entering
  // In particular, we've got to move the thumbnails list into each view
  switch (view) {
  case thumbnailListView:
    thumbnailListView.appendChild(thumbnails);
    break;
  case thumbnailSelectView:
    thumbnailSelectView.appendChild(thumbnails);
    // Set the view header to a localized string
    updateSelectionState();
    break;
  case pickView:
    pickView.appendChild(thumbnails);
    break;
  default:
    // In any other view, remove the thumbnails from the document so
    // they don't show anywhere
    if (thumbnails.parentNode)
      thumbnails.parentNode.removeChild(thumbnails);
    break;
  }

  // Remember the current view
  currentView = view;
}

function createThumbnailList() {
  // If thumbnails already exist, erase everything and start over
  if (thumbnails.firstChild !== null) {
    thumbnails.textContent = '';
    images = [];
  }

  // Enumerate existing image entries in the database and add thumbnails
  // List them all, and sort them in descending order by date.
  photodb.enumerate('date', null, 'prev', function(imagedata) {
    if (imagedata === null) { // No more images
      // If we're done enumerating, and we don't have any images
      // let the user know
      if (images.length === 0)
        showOverlay('emptygallery');

      return;
    }

    images.push(imagedata);                             // remember the image
    var thumbnail = createThumbnail(images.length - 1); // create its thumbnail
    thumbnails.appendChild(thumbnail); // display the thumbnail
  });
}

//
// Create a thumbnail <img> element
//
function createThumbnail(imagenum) {
  var li = document.createElement('li');
  li.dataset.index = imagenum;
  li.classList.add('thumbnail');

  var imagedata = images[imagenum];
  // We revoke this url in imageDeleted
  var url = URL.createObjectURL(imagedata.metadata.thumbnail);
  li.style.backgroundImage = 'url("' + url + '")';

  return li;
}

//
// Web Activities
//

// Register this with navigator.mozSetMessageHandler
function webActivityHandler(activityRequest) {
  var activityName = activityRequest.source.name;
  switch (activityName) {
  case 'browse':
    if (launchedAsInlineActivity)
      return;
    // The 'browse' activity is just the way we launch the app
    // There's nothing else to do here.
    setView(thumbnailListView);
    break;
  case 'pick':
    if (!launchedAsInlineActivity)
      return;
    if (pendingPick)
      cancelPick();
    startPick(activityRequest);
    break;
  case 'open':
    if (!launchedAsInlineActivity)
      return;
    handleOpenActivity(activityRequest);
    break;
  }
}

var launchedAsInlineActivity =
  window.location.hash === '#pick' || window.location.hash === '#open';
var pendingPick;
var pickType;
var pickWidth, pickHeight;
var cropURL;
var cropEditor;

function startPick(activityRequest) {
  pendingPick = activityRequest;
  pickType = activityRequest.source.data.type;
  if (pendingPick.source.data.width && pendingPick.source.data.height) {
    pickWidth = pendingPick.source.data.width;
    pickHeight = pendingPick.source.data.height;
  }
  else {
    pickWidth = pickHeight = 0;
  }
  setView(pickView);
}

function cropPickedImage(fileinfo) {
  setView(cropView);

  photodb.getFile(fileinfo.name, function(file) {
    cropURL = URL.createObjectURL(file);
    cropEditor = new ImageEditor(cropURL, $('crop-frame'), {}, function() {
      cropEditor.showCropOverlay();
      if (pickWidth)
        cropEditor.setCropAspectRatio(pickWidth, pickHeight);
      else
        cropEditor.setCropAspectRatio(); // free form cropping
    });
  });
}

function finishPick() {
  cropEditor.getCroppedRegionBlob(pickType, pickWidth, pickHeight,
                                  function(blob) {
                                    pendingPick.postResult({
                                      type: pickType,
                                      blob: blob
                                    });
                                    cleanupPick();
                                  });
}

function cancelPick() {
  pendingPick.postError('pick cancelled');
  cleanupPick();
}

function cleanupCrop() {
  if (cropURL) {
    URL.revokeObjectURL(cropURL);
    cropURL = null;
  }
  if (cropEditor) {
    cropEditor.destroy();
    cropEditor = null;
  }
}

function cleanupPick() {
  cleanupCrop();
  pendingPick = null;
  setView(thumbnailListView);
}

// XXX
// If the user goes to the homescreen or switches to another app
// the pick request is implicitly cancelled
// Remove this code when https://github.com/mozilla-b2g/gaia/issues/2916
// is fixed and replace it with an onerror handler on the activity to
// switch out of pickView.
window.addEventListener('mozvisibilitychange', function() {
  if (document.mozHidden && pendingPick)
    cancelPick();
});

function handleOpenActivity(request) {
  var filename = request.source.data.filename;
  var frame = $('open-frame');
  var image = $('open-image');
  var cameraButton = $('open-camera-button');
  var deleteButton = $('open-delete-button');
  var gestureDetector = new GestureDetector(frame);
  var openPhotoState = null;  // lazily initialized

  // Set up events
  gestureDetector.startDetecting();
  cameraButton.addEventListener('click', handleCameraButton);
  deleteButton.addEventListener('click', handleDeleteButton);
  frame.addEventListener('dbltap', handleDoubleTap);
  frame.addEventListener('transform', handleTransform);
  frame.addEventListener('pan', handlePan);
  frame.addEventListener('swipe', handleSwipe);

  // Display the UI
  setView(openView);

  // Display the image, waiting for MediaDB to be ready, if it isn't already
  if (photodb.state === MediaDB.READY) {
    displayFile(image, filename);
  }
  else {
    photodb.addEventListener('ready', function waitTillReady() {
      photodb.removeEventListener('ready', waitTillReady);
      displayFile(image, filename);
    });
  }

  function done(result) {
    if (request) {
      request.postResult(result);
      request = null;
    }
    cleanup();
  }

  function cleanup() {
    cameraButton.removeEventListener('click', handleCameraButton);
    deleteButton.removeEventListener('click', handleDeleteButton);
    frame.removeEventListener('dbltap', handleDoubleTap);
    frame.removeEventListener('transform', handleTransform);
    frame.removeEventListener('pan', handlePan);
    frame.removeEventListener('swipe', handleSwipe);
    gestureDetector.stopDetecting();
    setView(thumbnailListView);
  }

  function handleCameraButton() {
    done({'delete': false});
  }
  function handleDeleteButton() {
    done({'delete': true});
  }

  function initPhotoState() {
    if (!openPhotoState) {
      openPhotoState = new PhotoState(image,
                                      image.naturalWidth, image.naturalHeight);
    }
  }

  function handleDoubleTap(e) {
    initPhotoState();
    var scale;
    if (openPhotoState.fit.scale > openPhotoState.fit.baseScale)
      scale = openPhotoState.fit.baseScale / openPhotoState.fit.scale;
    else
      scale = 2;

    openPhotoState.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
  }

  function handleTransform(e) {
    initPhotoState();
    openPhotoState.zoom(e.detail.relative.scale,
                        e.detail.midpoint.clientX,
                        e.detail.midpoint.clientY);
  }

  function handlePan(e) {
    initPhotoState();
    openPhotoState.pan(e.detail.relative.dx, e.detail.relative.dy);
  }

  function handleSwipe(e) {
    var direction = e.detail.direction;
    var velocity = e.detail.vy;
    if (direction === 'down' && velocity > 2)
      done('done');
  }
}


//
// Event handlers
//

// Each of the photoFrame <div> elements may be subject to animated
// transitions. So give them transitionend event handlers that
// remove the transition style property when the transition ends.
// This helps prevent unexpected transitions.
function removeTransition(event) {
  event.target.style.transition = null;
}

previousPhotoFrame.addEventListener('transitionend', removeTransition);
currentPhotoFrame.addEventListener('transitionend', removeTransition);
nextPhotoFrame.addEventListener('transitionend', removeTransition);

// Use the GestureDetector.js library to handle gestures.
// This will generate tap, pan, swipe and transform events
new GestureDetector(photoFrames).startDetecting();

// Clicking on a thumbnail does different things depending on the view.
// In thumbnail list mode, it displays the image. In thumbanilSelect mode
// it selects the image. In pick mode, it finishes the pick activity
// with the image filename
thumbnails.addEventListener('click', function thumbnailsClick(evt) {
  var target = evt.target;
  if (!target || !target.classList.contains('thumbnail'))
    return;

  if (currentView === thumbnailListView || currentView === photoView) {
    showPhoto(parseInt(target.dataset.index));
  }
  else if (currentView === thumbnailSelectView) {
    target.classList.toggle('selected');
    updateSelectionState();
  }
  else if (currentView === pickView) {
    cropPickedImage(images[parseInt(target.dataset.index)]);
  }
});

// When we enter thumbnail selection mode, or when the selection changes
// we call this function to update the message the top of the screen and to
// enable or disable the Delete and Share buttons
function updateSelectionState() {
  var n = thumbnails.querySelectorAll('.selected.thumbnail').length;
  var msg = navigator.mozL10n.get('number-selected', { n: n });
  $('thumbnails-number-selected').textContent = msg;

  if (n === 0) {
    $('thumbnails-delete-button').classList.add('disabled');
    $('thumbnails-share-button').classList.add('disabled');
  }
  else {
    $('thumbnails-delete-button').classList.remove('disabled');
    $('thumbnails-share-button').classList.remove('disabled');
  }
}

// Clicking on the back button goes back to the thumbnail view
$('photos-back-button').onclick = function() {
  setView(thumbnailListView);
};

// Clicking on the select button goes to thumbnail select mode
$('thumbnails-select-button').onclick = function() {
  setView(thumbnailSelectView);
};

// Clicking on the cancel button goes from photo mode to thumbnail list mode
$('thumbnails-cancel-button').onclick = function() {
  setView(thumbnailListView);
};

// Clicking on the pick back button cancels the pick activity.
$('pick-back-button').onclick = function() {
  cancelPick();
};

// In crop view, the back button goes back to pick view
$('crop-back-button').onclick = function() {
  setView(pickView);
  cleanupCrop();
};

// In crop view, the done button finishes the pick
$('crop-done-button').onclick = function() {
  finishPick();
};


// The camera buttons should both launch the camera app
$('photos-camera-button').onclick =
  $('thumbnails-camera-button').onclick = function() {
    var a = new MozActivity({
      name: 'record',
      data: {
        type: 'photos'
      }
    });
  };


// Clicking on the delete button in thumbnail select mode deletes all
// selected photos
$('thumbnails-delete-button').onclick = function() {
  var selected = thumbnails.querySelectorAll('.selected.thumbnail');
  if (selected.length === 0)
    return;

  var msg = navigator.mozL10n.get('delete-n-photos?', {n: selected.length});
  if (confirm(msg)) {
    // XXX
    // deleteImage is O(n), so this loop is O(n*n). If used with really large
    // selections, it might have noticably bad performance.  If so, we
    // can write a more efficient deleteImages() function.
    for (var i = 0; i < selected.length; i++) {
      selected[i].classList.toggle('selected');
      deleteImage(parseInt(selected[i].dataset.index));
    }
    updateSelectionState();
  }
};

// Clicking the delete button while viewing a single photo deletes that photo
$('photos-delete-button').onclick = function() {
  var msg = navigator.mozL10n.get('delete-photo?');
  if (confirm(msg)) {
    deleteImage(currentPhotoIndex);
  }
};

// Clicking the Edit button while viewing a photo switches to edit mode
$('photos-edit-button').onclick = function() {
  editPhotoIfCardNotFull(currentPhotoIndex);
};

// In single-photo mode, the share button shares the current photo
$('photos-share-button').onclick = function() {
  var image = images[currentPhotoIndex];
  var filename = image.name;
  shareFiles([filename]);
};

// Clicking on the share button in select mode shares all selected images
$('thumbnails-share-button').onclick = function() {
  var selected = thumbnails.querySelectorAll('.selected.thumbnail');
  if (selected.length === 0)
    return;
  var filenames = [];
  for (var i = 0; i < selected.length; i++) {
    var index = parseInt(selected[i].dataset.index);
    filenames.push(images[index].name);
  }

  shareFiles(filenames);
};

/*
 * Share one or more images using Web Activities.
 *
 * Because multiple images may have different mime types we just
 * use 'image/*' as the type.
 *
 * Image data is passed as data: URLs because we can't pass blobs
 */
function shareFiles(filenames) {
  var blobs = [], basenames = [];
  getBlobForNextFile();

  function getBlobForNextFile() {
    if (blobs.length === filenames.length) {
      shareBlobs(blobs, basenames);
    }
    else {
      var i = blobs.length;
      var filename = filenames[i];
      photodb.getFile(filename, function(file) {
        blobs.push(file);
        // filename is identical to file.name, both of which may contain path
        // information.  We want to let the recipient know the name of the
        // file, but not the path components.
        basenames.push(filename.substring(filename.lastIndexOf('/') + 1));
        getBlobForNextFile();
      });
    }
  }
}

// This is called by shareFiles() once the filenames have
// been converted to blobs
function shareBlobs(blobs, filenames) {
  var a = new MozActivity({
    name: 'share',
    data: {
      type: 'image/*',
      number: blobs.length,
      blobs: blobs,
      filenames: filenames
    }
  });

  a.onerror = function(e) {
    if (a.error.name === 'NO_PROVIDER') {
      var msg = navigator.mozL10n.get('share-noprovider');
      alert(msg);
    }
    else {
      console.warn('share activity error:', a.error.name);
    }
  };
}


// In edit mode, clicking the Cancel button goes back to single photo mode
$('edit-cancel-button').onclick = function() {
  exitEditMode();
};


// That happens when we enter or exit fullscreen mode and also when
// the user rotates the phone we get a resize event
window.addEventListener('resize', function resize() {
  //
  // When we enter or leave fullscreen mode, we get two resize events.
  // When we get the first one, we don't know what our new size is,
  // so we just ignore it.
  //
  if (photoView.offsetWidth === 0 && photoView.offsetHeight === 0)
    return;

  if (currentView === photoView) {
    photoState.resize();
    // Also reset the size and position of the previous and next photos
    resetPhoto(currentPhotoIndex - 1, previousPhotoFrame.firstElementChild);
    resetPhoto(currentPhotoIndex + 1, nextPhotoFrame.firstElementChild);
  }

  function resetPhoto(n, img) {
    if (!img || n < 0 || n >= images.length)
      return;

    var imagedata = images[n];
    var fit = fitImage(imagedata.metadata.width, imagedata.metadata.height,
                       photoView.offsetWidth, photoView.offsetHeight);
    positionImage(img, fit);
  }
});

// In order to distinguish single taps from double taps, we have to
// wait after a tap arrives to make sure that a dbltap event isn't
// coming soon.
var taptimer = null;
photoFrames.addEventListener('tap', function(e) {
  if (!taptimer) {
    // If there is already a timer set, then this is is the second tap
    // and we're about to get a dbl tap event
    taptimer = setTimeout(function() {
      taptimer = null;
      singletap(e);
    }, GestureDetector.DOUBLE_TAP_TIME);
  }
});

photoFrames.addEventListener('dbltap', function(e) {
  clearTimeout(taptimer);
  taptimer = null;
  doubletap(e);
});

function singletap(e) {
  // If we're not in full-screen mode, then request it otherwise cancel it
  // We deal with hiding and showing the toolbar when we get the fullscreen
  // change event
  if (document.mozFullScreenElement !== photoView)
    photoView.mozRequestFullScreen();
  else
    document.mozCancelFullScreen();
}

document.addEventListener('mozfullscreenchange', function() {
  // Once we've transitioned into or out of fullscreen mode,
  // hide or show the toolbar.
  if (document.mozFullScreenElement !== photoView)
    photoView.classList.remove('toolbarhidden');
  else
    photoView.classList.add('toolbarhidden');
});

// Quick zoom in and out with dbltap events
function doubletap(e) {
  var scale;
  if (photoState.fit.scale > photoState.fit.baseScale)   // If already zoomed in
    scale = photoState.fit.baseScale / photoState.fit.scale; // zoom out
  else                                                       // Otherwise
    scale = 2;                                               // zoom in

  photoState.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
}

// Pan the photos sideways when the user moves their finger across the screen
photoFrames.addEventListener('pan', function(event) {
  if (transitioning)
    return;

  photoState.pan(event.detail.relative.dx,
                 event.detail.relative.dy);
  photoState.setFramesPosition();
});

// When the user lifts their finger after panning we get this event
photoFrames.addEventListener('swipe', function(event) {
  // How far past the edge of the photo have we panned?
  var pastEdge = photoState.swipe;
  var direction;

  if (pastEdge < 0)
    direction = 1;    // next photo
  else if (pastEdge > 0)
    direction = -1;   // previous photo

  // If we're in a right-to-left locale, reverse those directions
  if (languageDirection === 'rtl')
    direction *= -1;

  // Did we pan far enough or swipe fast enough to transition to
  // a different photo?
  var farenough = Math.abs(pastEdge) > window.innerWidth * TRANSITION_FRACTION;
  var velocity = event.detail.vx;
  var fastenough = Math.abs(velocity) > TRANSITION_SPEED;

  // Make sure that that the speed and pan amount are in the same direction
  var samedirection = velocity === 0 || pastEdge / velocity >= 0;

  // Is there a next or previous photo to transition to?
  var photoexists =
    (direction === 1 && currentPhotoIndex + 1 < images.length) ||
    (direction === -1 && currentPhotoIndex > 0);

  // If all of these conditions hold, then we'll transition to the
  // next photo or the previous photo
  if (direction !== 0 && (farenough || fastenough) &&
      samedirection && photoexists) {

    // Compute how long the transition should take based on the velocity
    var speed = Math.max(Math.abs(velocity), TRANSITION_SPEED);
    var time = (window.innerWidth - Math.abs(pastEdge)) / speed;

    // Transition photos in the appropriate direction
    if (direction === 1)
      nextPhoto(time);
    else
      previousPhoto(time);

    /*
     * slideshows are deferred until v2
    // If a slideshow is in progress then restart the slide timer.
    if (slideshowTimer)
      continueSlideshow();
    */
  }
  else if (pastEdge !== 0) {
    // Otherwise, just restore the current photo by undoing
    // the translations we added during panning
    var time = Math.abs(pastEdge) / TRANSITION_SPEED;

    currentPhotoFrame.style.transition =
      nextPhotoFrame.style.transition =
      previousPhotoFrame.style.transition = 'transform ' + time + 'ms ease';
    photoState.swipe = 0;
    photoState.setFramesPosition();

    // Ignore  pan and zoom gestures while the transition happens
    transitioning = true;
    setTimeout(function() { transitioning = false; }, time);
  }
});

// We also support pinch-to-zoom
photoFrames.addEventListener('transform', function(e) {
  if (transitioning)
    return;

  photoState.zoom(e.detail.relative.scale,
                  e.detail.midpoint.clientX,
                  e.detail.midpoint.clientY);
});

// A utility function to set the src attribute of the <img> element inside
// the specified frame, which must be previousPhotoFrame, currentPhotoFrame
// or nextPhotoFrame.  Used in showPhoto(), nextPhoto() and previousPhoto().
//
// This function used to create a new <img> element each time and replace
// the existing <img> in the frame. But that exposed a Gecko bug and memory
// leak and repeated browsing through large images crashed the phone. So
// now we use the same three <img> elements and just change their src
// attributes.
function displayImageInFrame(n, frame) {
  var img = frame.firstChild;

  // Make sure n is in range
  if (n < 0 || n >= images.length) {
    img.src = null;
    return;
  }

  var imagedata = images[n];
  displayFile(img, imagedata.name,
              imagedata.metadata.width, imagedata.metadata.height);
}

function displayFile(element, filename, width, height) {
  var container = element.parentNode;
  // Asynchronously set the image url
  photodb.getFile(filename, function(file) {
    var url = URL.createObjectURL(file);
    element.src = url;
    element.onload = function() {
      URL.revokeObjectURL(url);

      // If we didn't know the width or height before, then get them
      // from the image now, and use that information to position
      // the image in its container
      if (!width || !height) {
        var fit = fitImage(element.naturalWidth, element.naturalHeight,
                           container.offsetWidth, container.offsetHeight);
        positionImage(element, fit);
      }
    };
  });

  // If we know the image size from its metadata, then position it now
  // even before it is loaded
  if (width && height) {
    var fit = fitImage(width, height,
                       container.offsetWidth, container.offsetHeight);
    positionImage(element, fit);
  }
}


function positionImage(img, fit) {
  img.style.transform =
    'translate(' + fit.left + 'px,' + fit.top + 'px) ' +
    'scale(' + fit.scale + ')';
}

// figure out the size and position of an image based on its size
// and the screen size.
function fitImage(photoWidth, photoHeight, viewportWidth, viewportHeight) {
  var scalex = viewportWidth / photoWidth;
  var scaley = viewportHeight / photoHeight;
  var scale = Math.min(Math.min(scalex, scaley), 1);

  // Set the image size and position
  var width = Math.floor(photoWidth * scale);
  var height = Math.floor(photoHeight * scale);

  return {
    width: width,
    height: height,
    left: Math.floor((viewportWidth - width) / 2),
    top: Math.floor((viewportHeight - height) / 2),
    scale: scale,
    baseScale: scale
  };
}

// Switch from thumbnail list view to single-picture view
// and display the specified photo.
function showPhoto(n) {
  setView(photoView); // Switch to photo view mode if not already there

  displayImageInFrame(n - 1, previousPhotoFrame);
  displayImageInFrame(n, currentPhotoFrame);
  displayImageInFrame(n + 1, nextPhotoFrame);
  currentPhotoIndex = n;
  currentPhoto = currentPhotoFrame.firstElementChild;

  // Create the PhotoState object that stores the photo pan/zoom state
  // And use it to apply CSS styles to the photo and photo frames.
  photoState = new PhotoState(currentPhoto,
                              images[n].metadata.width,
                              images[n].metadata.height);
  photoState.setFramesPosition();
}

// Transition to the next photo, animating it over the specified time (ms).
// This is used when the user pans and also for the slideshow.
function nextPhoto(time) {
  // If already displaying the last one, do nothing.
  if (currentPhotoIndex === images.length - 1)
    return;

  // Set a flag to ignore pan and zoom gestures during the transition.
  transitioning = true;
  setTimeout(function() { transitioning = false; }, time);

  // Set transitions for the visible photo frames and the photoFrames element
  var transition = 'transform ' + time + 'ms ease';
  currentPhotoFrame.style.transition = transition;
  nextPhotoFrame.style.transition = transition;

  // Remove the classes
  previousPhotoFrame.classList.remove('previousPhoto');
  currentPhotoFrame.classList.remove('currentPhoto');
  nextPhotoFrame.classList.remove('nextPhoto');

  // Cycle the three frames so next becomes current,
  // current becomes previous, and previous becomes next.
  var tmp = previousPhotoFrame;
  previousPhotoFrame = currentPhotoFrame;
  currentPhotoFrame = nextPhotoFrame;
  nextPhotoFrame = tmp;
  currentPhotoIndex++;

  // And add appropriate classes to the newly cycled frames
  previousPhotoFrame.classList.add('previousPhoto');
  currentPhotoFrame.classList.add('currentPhoto');
  nextPhotoFrame.classList.add('nextPhoto');

  // Remember the new current <img> element.
  currentPhoto = currentPhotoFrame.firstElementChild;

  // Remember the old photoState object
  var previousPhotoState = photoState;

  // Start with default pan and zoom state for the new photo
  // And also reset the translation caused by swiping the photos
  photoState = new PhotoState(currentPhoto,
                              images[currentPhotoIndex].metadata.width,
                              images[currentPhotoIndex].metadata.height);
  photoState.setFramesPosition();

  // Update the image for the new next photo
  displayImageInFrame(currentPhotoIndex + 1, nextPhotoFrame);

  // When the transition is done, cleanup
  currentPhotoFrame.addEventListener('transitionend', function done(e) {
    this.removeEventListener('transitionend', done);

    // Recompute and reposition the photo that just transitioned off the screen
    previousPhotoState.reset();
  });
}

// Just like nextPhoto() but in the other direction
function previousPhoto(time) {
  // if already displaying the first one, do nothing.
  if (currentPhotoIndex === 0)
    return;

  // Set a flag to ignore pan and zoom gestures during the transition.
  transitioning = true;
  setTimeout(function() { transitioning = false; }, time);

  // Set transitions for the visible photo frames and the photoFrames element
  var transition = 'transform ' + time + 'ms ease';
  previousPhotoFrame.style.transition = transition;
  currentPhotoFrame.style.transition = transition;

  // Remove the frame classes since we're about to cycle the frames
  previousPhotoFrame.classList.remove('previousPhoto');
  currentPhotoFrame.classList.remove('currentPhoto');
  nextPhotoFrame.classList.remove('nextPhoto');

  // Transition to the previous photo: previous becomes current, current
  // becomes next, etc.
  var tmp = nextPhotoFrame;
  nextPhotoFrame = currentPhotoFrame;
  currentPhotoFrame = previousPhotoFrame;
  previousPhotoFrame = tmp;
  currentPhotoIndex--;

  // And add the frame classes to the newly cycled frame divs.
  previousPhotoFrame.classList.add('previousPhoto');
  currentPhotoFrame.classList.add('currentPhoto');
  nextPhotoFrame.classList.add('nextPhoto');

  // Get the new current photo
  currentPhoto = currentPhotoFrame.firstElementChild;

  // Remember the old PhotoState object
  var nextPhotoState = photoState;

  // Create a new photo state
  photoState = new PhotoState(currentPhoto,
                              images[currentPhotoIndex].metadata.width,
                              images[currentPhotoIndex].metadata.height);
  photoState.setFramesPosition();

  // Preload the new previous photo
  displayImageInFrame(currentPhotoIndex - 1, previousPhotoFrame);

  // When the transition is done do some cleanup
  currentPhotoFrame.addEventListener('transitionend', function done(e) {
    this.removeEventListener('transitionend', done);

    // Recompute and reposition the photo that just transitioned off the screen
    nextPhotoState.reset();
  });
}

/*
 * Slideshows are a v2 feature
 *
// Slide show constants
const SLIDE_INTERVAL = 3000;      // 3 seconds on each slides
const SLIDE_TRANSITION = 500;     // 1/2 second transition between slides
var slideshowTimer = null;       // Non-null if we're doing a slide show

function startSlideshow() {
  // If we're already displaying the last slide, then move to the first
  if (currentPhotoIndex === images.length - 1)
    showPhoto(0);

  // Now schedule the next slide
  slideshowTimer = setTimeout(nextSlide, SLIDE_INTERVAL);
  slideshowButton.classList.add('playing');
}

function stopSlideshow() {
  if (slideshowTimer) {
    clearTimeout(slideshowTimer);
    slideshowTimer = null;
  }
  slideshowButton.classList.remove('playing');
}

// Transition to the next photo as part of a slideshow.
// Note that this is different than nextPhoto().
function nextSlide() {
  // Move to the next slide if we're not already on the last one
  if (currentPhotoIndex + 1 < images.length) {
    nextPhoto(SLIDE_TRANSITION);
  }

  // And schedule the next slide transition
  slideshowTimer = null;
  continueSlideshow();
}

// Clear any existing slideshow timer, and if there are more slides to
// show, start a new timer to show the next one. We use this after each
// slide is shown, and also in the panning code so that if you manually pan
// during a slide show, the timer resets and you get the full time to
// view each slide.
function continueSlideshow() {
  if (slideshowTimer)
    clearInterval(slideshowTimer);

  // If we're still not on the last one, then schedule another slide.
  if (currentPhotoIndex + 1 < images.length) {
    slideshowTimer = setTimeout(nextSlide, SLIDE_INTERVAL);
  }
  // Otherwise, stop the slideshow
  else {
    slideshowTimer = null;
    stopSlideshow();
  }
}
*/

/*
 * This class encapsulates the zooming and panning functionality for
 * the gallery app and maintains the current size and position of the
 * currently displayed photo as well as the transition state (if any)
 * between photos.
 */
function PhotoState(img, width, height) {
  // The <img> element that we manipulate
  this.img = img;

  // The actual size of the photograph
  this.photoWidth = width;
  this.photoHeight = height;

  // Do all the calculations
  this.reset();
}

PhotoState.BORDER_WIDTH = 3;  // Border between photos

// An internal method called by reset(), zoom() and pan() to
// set the size and position of the image element.
PhotoState.prototype._reposition = function() {
  positionImage(this.img, this.fit);
};

// Compute the default size and position of the photo
PhotoState.prototype.reset = function() {
  // Store the display space we have for photos
  // call reset() when we get a resize or orientationchange event
  this.viewportWidth = this.img.parentNode.offsetWidth;
  this.viewportHeight = this.img.parentNode.offsetHeight;

  // Compute the default size and position of the image
  this.fit = fitImage(this.photoWidth, this.photoHeight,
                      this.viewportWidth, this.viewportHeight);

  // We start off with no swipe from left to right
  this.swipe = 0;

  this._reposition(); // Apply the computed size and position
};

// We call this from the resize handler when the user rotates the
// screen or when going into or out of fullscreen mode.  We discard
// any side-to-side swipe. If the user has not zoomed in, then we just
// fit the image to the new size (same as reset).  But if the user has
// zoomed in (and we need to stay zoomed for the new size) then we
// adjust the fit properties so that the pixel that was at the center
// of the screen before remains at the center now, or as close as
// possible
PhotoState.prototype.resize = function() {
  var oldWidth = this.viewportWidth;
  var oldHeight = this.viewportHeight;
  var newWidth = this.img.parentNode.offsetWidth;
  var newHeight = this.img.parentNode.offsetHeight;

  var fit = this.fit; // The current image fit

  // this is how the image would fit at the new screen size
  var newfit = fitImage(this.photoWidth, this.photoHeight,
                        newWidth, newHeight);

  // If no zooming has been done, then a resize is just a reset.
  // The same is true if the new fit base scale is greater than the
  // old scale.

  // The same is true if the image is smaller (in both dimensions)
  // than the new screen size.
  if (fit.scale === fit.baseScale || newfit.baseScale > fit.scale) {
    this.reset();
    this.setFramesPosition();
    return;
  }

  // Remember the new screen size
  this.viewportWidth = newWidth;
  this.viewportHeight = newHeight;

  // Figure out the change in both dimensions and adjust top and left
  // to accomodate the change
  fit.left += (newWidth - oldWidth) / 2;
  fit.top += (newHeight - oldHeight) / 2;

  // Adjust the base scale, too
  fit.baseScale = newfit.baseScale;

  // Reposition this image without resetting the zoom
  this._reposition();

  // Undo any swipe amount
  this.swipe = 0;
  this.setFramesPosition();
};

// Zoom in by the specified factor, adjusting the pan amount so that
// the image pixels at (centerX, centerY) remain at that position.
// Assume that zoom gestures can't be done in the middle of swipes, so
// if we're calling zoom, then the swipe property will be 0.
// If time is specified and non-zero, then we set a CSS transition
// to animate the zoom.
PhotoState.prototype.zoom = function(scale, centerX, centerY, time) {
  // Never zoom in farther than the native resolution of the image
  if (this.fit.scale * scale > 1) {
    scale = 1 / (this.fit.scale);
  }
  // And never zoom out to make the image smaller than it would normally be
  else if (this.fit.scale * scale < this.fit.baseScale) {
    scale = this.fit.baseScale / this.fit.scale;
  }

  this.fit.scale = this.fit.scale * scale;

  // Change the size of the photo
  this.fit.width = Math.floor(this.photoWidth * this.fit.scale);
  this.fit.height = Math.floor(this.photoHeight * this.fit.scale);

  // centerX and centerY are in viewport coordinates.
  // These are the photo coordinates displayed at that point in the viewport
  var photoX = centerX - this.fit.left;
  var photoY = centerY - this.fit.top;

  // After zooming, these are the new photo coordinates.
  // Note we just use the relative scale amount here, not this.fit.scale
  var photoX = Math.floor(photoX * scale);
  var photoY = Math.floor(photoY * scale);

  // To keep that point still, here are the new left and top values we need
  this.fit.left = centerX - photoX;
  this.fit.top = centerY - photoY;

  // Now make sure we didn't pan too much: If the image fits on the
  // screen, center it. If the image is bigger than the screen, then
  // make sure we haven't gone past any edges
  if (this.fit.width <= this.viewportWidth) {
    this.fit.left = (this.viewportWidth - this.fit.width) / 2;
  }
  else {
    // Don't let the left of the photo be past the left edge of the screen
    if (this.fit.left > 0)
      this.fit.left = 0;

    // Right of photo shouldn't be to the left of the right edge
    if (this.fit.left + this.fit.width < this.viewportWidth) {
      this.fit.left = this.viewportWidth - this.fit.width;
    }
  }

  if (this.fit.height <= this.viewportHeight) {
    this.fit.top = (this.viewportHeight - this.fit.height) / 2;
  }
  else {
    // Don't let the top of the photo be below the top of the screen
    if (this.fit.top > 0)
      this.fit.top = 0;

    // bottom of photo shouldn't be above the bottom of screen
    if (this.fit.top + this.fit.height < this.viewportHeight) {
      this.fit.top = this.viewportHeight - this.fit.height;
    }
  }

  // If a time was specified, set up a transition so that the
  // call to reposition below is animated
  if (time) {
    // If a time was specfied, animate the transformation
    this.img.style.transition = 'transform ' + time + 'ms ease';
    var self = this;
    this.img.addEventListener('transitionend', function done(e) {
      self.img.removeEventListener('transitionend', done);
      self.img.style.transition = null;
    });
  }

  this._reposition();
};

PhotoState.prototype.pan = function(dx, dy) {
  // Handle panning in the y direction first, since it is easier.
  // Don't pan in the y direction if we already fit on the screen
  if (this.fit.height > this.viewportHeight) {
    this.fit.top += dy;

    // Don't let the top of the photo be below the top of the screen
    if (this.fit.top > 0)
      this.fit.top = 0;

    // bottom of photo shouldn't be above the bottom of screen
    if (this.fit.top + this.fit.height < this.viewportHeight)
      this.fit.top = this.viewportHeight - this.fit.height;
  }

  // Now handle the X dimension. In this case, we have to handle panning within
  // a zoomed image, and swiping to transition from one photo to the next
  // or previous.
  if (this.fit.width <= this.viewportWidth) {
    // In this case, the photo isn't zoomed in, so we're just doing swiping
    this.swipe += dx;
  }
  else {
    if (this.swipe === 0) {
      this.fit.left += dx;

      // If this would take the left edge of the photo past the
      // left edge of the screen, then we've got to do a swipe
      if (this.fit.left > 0) {
        this.swipe += this.fit.left;
        this.fit.left = 0;
      }

      // Or, if this would take the right edge of the photo past the
      // right edge of the screen, then we've got to swipe the other way
      if (this.fit.left + this.fit.width < this.viewportWidth) {
        this.swipe += this.fit.left + this.fit.width - this.viewportWidth;
        this.fit.left = this.viewportWidth - this.fit.width;
      }
    }
    else if (this.swipe > 0) {
      this.swipe += dx;
      if (this.swipe < 0) {
        this.fit.left += this.swipe;
        this.swipe = 0;
      }
    }
    else if (this.swipe < 0) {
      this.swipe += dx;
      if (this.swipe > 0) {
        this.fit.left += this.swipe;
        this.swipe = 0;
      }
    }
  }

  // Don't swipe past the end of the last photo or past the start of the first
  if ((currentPhotoIndex === 0 && this.swipe > 0) ||
      (currentPhotoIndex === images.length - 1 && this.swipe < 0)) {
    this.swipe = 0;
  }

  this._reposition();
};

PhotoState.prototype.setFramesPosition = function() {
  // XXX we ignore rtl languages for now.
  currentPhotoFrame.style.transform = 'translateX(' + this.swipe + 'px)';
  nextPhotoFrame.style.transform = 'translateX(' +
    (this.viewportWidth + PhotoState.BORDER_WIDTH + this.swipe) + 'px)';
  previousPhotoFrame.style.transform = 'translateX(' +
    (-(this.viewportWidth + PhotoState.BORDER_WIDTH) + this.swipe) + 'px)';
};

var editedPhotoIndex;
var editedPhotoURL; // The blob URL of the photo we're currently editing
var editSettings;
var imageEditor;

var editOptionButtons =
  Array.slice($('edit-options').querySelectorAll('a.radio.button'), 0);

var editBgImageButtons =
  Array.slice($('edit-options').querySelectorAll('a.bgimage.button'), 0);

editOptionButtons.forEach(function(b) { b.onclick = editOptionsHandler; });

// Ensure there is enough space to store an edited copy of photo n
// and if there is, call editPhoto to do so
function editPhotoIfCardNotFull(n) {
  var imagedata = images[n];
  var imagesize = imagedata.size;
  console.log('editPhotoIfCardNotFull: image size:', imagesize);

  photodb.stat(function(stats) {
    var freespace = stats.freeBytes;
    console.log('editPhotoIfCardNotFull: freespace:', freespace);

    // the edited image might take up more space on the disk, but
    // not all that much more
    if (freespace > imagesize * 2) {
      editPhoto(n);
    }
    else {
      alert(navigator.mozL10n.get('memorycardfull'));
    }
  });
}


function editPhoto(n) {
  editedPhotoIndex = n;

  // Start with no edits
  editSettings = {
    crop: {
      x: 0, y: 0, w: images[n].metadata.width, h: images[n].metadata.height
    },
    gamma: 1,
    borderWidth: 0,
    borderColor: [0, 0, 0, 0]
  };

  // Start looking up the image file
  photodb.getFile(images[n].name, function(file) {
    // Once we get the file create a URL for it and use that url for the
    // preview image and all the buttons that need it.
    editedPhotoURL = URL.createObjectURL(file);

    // Create the image editor object
    // This has to come after setView or the canvas size is wrong.
    imageEditor = new ImageEditor(editedPhotoURL,
                                  $('edit-preview-area'),
                                  editSettings);

    // Configure the exposure tool as the first one shown
    setEditTool('exposure');

    // Set the exposure slider to its default value
    exposureSlider.setExposure(0);

    // Set the background for all of the image buttons
    var backgroundImage = 'url(' + editedPhotoURL + ')';
    editBgImageButtons.forEach(function(b) {
      b.style.backgroundImage = backgroundImage;
    });
  });

  // Display the edit screen
  setView(editView);


  // Set the default option buttons to correspond to those edits
  editOptionButtons.forEach(function(b) { b.classList.remove('selected'); });
  $('edit-crop-aspect-free').classList.add('selected');
  $('edit-effect-none').classList.add('selected');
  $('edit-border-none').classList.add('selected');
}

// Crop, Effect and border buttons call this
function editOptionsHandler() {
  // First, unhighlight all buttons in this group and then
  // highlight the button that has just been chosen. These
  // buttons have radio behavior
  var parent = this.parentNode;
  var buttons = parent.querySelectorAll('a.radio.button');
  Array.forEach(buttons, function(b) { b.classList.remove('selected'); });
  this.classList.add('selected');

  if (this === $('edit-crop-aspect-free'))
    imageEditor.setCropAspectRatio();
  else if (this === $('edit-crop-aspect-portrait'))
    imageEditor.setCropAspectRatio(2, 3);
  else if (this === $('edit-crop-aspect-landscape'))
    imageEditor.setCropAspectRatio(3, 2);
  else if (this === $('edit-crop-aspect-square'))
    imageEditor.setCropAspectRatio(1, 1);
  else if (this.dataset.effect) {
    editSettings.matrix = ImageProcessor[this.dataset.effect + '_matrix'];
    imageEditor.edit();
  }
  else {
    if (this.dataset.borderWidth) {
      editSettings.borderWidth = parseFloat(this.dataset.borderWidth);
    }
    if (this.dataset.borderColor === 'white') {
      editSettings.borderColor = [1, 1, 1, 1];
    }
    else if (this.dataset.borderColor === 'black') {
      editSettings.borderColor = [0, 0, 0, 1];
    }
    imageEditor.edit();
  }
}

/*
 * This is the exposure slider component for edit mode.  This ought to be
 * converted into a reusable slider module, but for now this is a
 * custom version that hardcodes things like the -3 to +3 range of values.
 */
var exposureSlider = (function() {
  var slider = document.getElementById('exposure-slider');
  var bar = document.getElementById('sliderbar');
  var thumb = document.getElementById('sliderthumb');

  thumb.addEventListener('mousedown', sliderStartDrag);

  var currentExposure;
  var sliderStartPixel;
  var sliderStartExposure;

  function sliderStartDrag(e) {
    document.addEventListener('mousemove', sliderDrag, true);
    document.addEventListener('mouseup', sliderEndDrag, true);
    sliderStartPixel = e.clientX;
    sliderStartExposure = currentExposure;
    e.preventDefault();
  }

  function sliderDrag(e) {
    var delta = e.clientX - sliderStartPixel;
    var exposureDelta = delta / (parseInt(bar.clientWidth) * .8) * 6;
    var oldExposure = currentExposure;
    setExposure(sliderStartExposure + exposureDelta);
    if (currentExposure !== oldExposure)
      slider.dispatchEvent(new Event('change', {bubbles: true}));
    e.preventDefault();
  }

  function sliderEndDrag(e) {
    document.removeEventListener('mousemove', sliderDrag, true);
    document.removeEventListener('mouseup', sliderEndDrag, true);
    e.preventDefault();
  }

  // Set the thumb position between -3 and +3
  function setExposure(exposure) {
    // Make sure it is not out of bounds
    if (exposure < -3)
      exposure = -3;
    else if (exposure > 3)
      exposure = 3;

    // Round to the closest .25
    exposure = Math.round(exposure * 4) / 4;

    if (exposure === currentExposure)
      return;

    var barWidth = parseInt(bar.clientWidth);
    var thumbWidth = parseInt(thumb.clientWidth);

    // Remember the new exposure value
    currentExposure = exposure;

    // Convert exposure value to % position of thumb center
    var percent = 10 + (exposure + 3) * 80 / 6;

    // Convert percent to pixel position of thumb center
    var pixel = barWidth * percent / 100;

    // Compute pixel position of left edge of thumb
    pixel -= thumbWidth / 2;

    // Move the thumb to that position
    thumb.style.left = pixel + 'px';

    // Display exposure value in thumb
    thumb.textContent = exposure;
  }

  return {
    setExposure: setExposure,
    getExposure: function() { return currentExposure; }
  };
}());

$('exposure-slider').onchange = function() {
  var stops = exposureSlider.getExposure();

  // Convert the exposure compensation stops gamma correction value.
  var factor = -1;  // XXX: adjust this factor to get something reasonable.
  var gamma = Math.pow(2, stops * factor);
  editSettings.gamma = gamma;
  imageEditor.edit();
};

function setEditTool(tool) {
  // Deselect all tool buttons and hide all options
  var buttons = $('edit-toolbar').querySelectorAll('a.button');
  Array.forEach(buttons, function(b) { b.classList.remove('selected'); });
  var options = $('edit-options').querySelectorAll('div.edit-options-bar');
  Array.forEach(options, function(o) { o.classList.add('hidden'); });

  // If we were in crop mode, perform the crop and then
  // exit crop mode. If the user tapped the Crop button then we'll go
  // right back into crop mode, but this means that the Crop button both
  // acts as a mode switch button and a "do the crop now" button.
  imageEditor.cropImage();
  imageEditor.hideCropOverlay();

  // Now select and show the correct set based on tool
  switch (tool) {
  case 'exposure':
    $('edit-exposure-button').classList.add('selected');
    $('exposure-slider').classList.remove('hidden');
    break;
  case 'crop':
    $('edit-crop-button').classList.add('selected');
    $('edit-crop-options').classList.remove('hidden');
    imageEditor.showCropOverlay();
    break;
  case 'effect':
    $('edit-effect-button').classList.add('selected');
    $('edit-effect-options').classList.remove('hidden');
    break;
  case 'border':
    $('edit-border-button').classList.add('selected');
    $('edit-border-options').classList.remove('hidden');
    break;
  }
}

$('edit-exposure-button').onclick = function() { setEditTool('exposure'); };
$('edit-crop-button').onclick = function() { setEditTool('crop'); };
$('edit-effect-button').onclick = function() { setEditTool('effect'); };
$('edit-border-button').onclick = function() { setEditTool('border'); };
$('edit-crop-none').onclick = function() {
  // Switch to free-form cropping
  Array.forEach($('edit-crop-options').querySelectorAll('a.radio.button'),
                function(b) { b.classList.remove('selected'); });
  $('edit-crop-aspect-free').classList.add('selected');
  imageEditor.setCropAspectRatio(); // freeform

  // And revert to full-size image
  imageEditor.undoCrop();
};

function exitEditMode(saved) {
  // Revoke the blob URL we've been using
  URL.revokeObjectURL(editedPhotoURL);
  editedPhotoURL = null;

  // close the editor object
  imageEditor.destroy();
  imageEditor = null;

  // We came in to edit mode from photoView.  If the user cancels the edit
  // go back to photoView.  Otherwise, if the user saves the photo, we go
  // back to thumbnail list view because that is where the newly saved
  // image is going to show up.
  // XXX: this isn't really right. Ideally the new photo should show up
  // right next to the old one and we should go back to photoView to view
  // the edited photo.
  if (saved)
    setView(thumbnailListView);
  else
    setView(photoView);
}

// When the user clicks the save button, we produce a full-size version
// of the edited image, save it into the media database and return to
// photo view mode.
// XXX: figure out what the image number of the edited photo is or will be
// and return to viewing that one.  Ideally, edited photos would be grouped
// with the original, rather than by date, but I'm not sure I can
// do that sort order.  Ideally, I'd like the mediadb to not generate a
// change event when we manually add something to it or at least have that
// option
$('edit-save-button').onclick = function() {

  // If we are in crop mode, perform the crop before saving
  if ($('edit-crop-button').classList.contains('selected'))
    imageEditor.cropImage();

  imageEditor.getFullSizeBlob('image/jpeg', function(blob) {

    var original = images[editedPhotoIndex].name;
    var basename, extension, filename;
    var version = 1;
    var p = original.lastIndexOf('.');
    if (p === -1) {
      basename = original;
      extension = '';
    }
    else {
      basename = original.substring(0, p);
      extension = original.substring(p);
    }

    // Create a filename for the edited image.  Loop if necessary and
    // increment the version number until we find a version a name that
    // is not in use.
    // XXX: this loop is O(n^2) and slow if the user saves many edits
    // of the same image.
    filename = basename + '.edit' + version + extension;
    while (images.some(function(i) { return i.name === filename; })) {
      version++;
      filename = basename + '.edit' + version + extension;
    }

    // Now that we have a filename, save the file This will send a
    // change event, which will cause us to rebuild our thumbnails.
    // For now, the edited image will become the first thumbnail since
    // it si the most recent one. Ideally, I'd like a more
    // sophisticated sort order that put edited sets of photos next to
    // each other.
    photodb.addFile(filename, blob);

    // We're done.
    exitEditMode(true);
  });
};

//
// Overlay messages
//
var currentOverlay;  // The id of the current overlay or null if none.

//
// If id is null then hide the overlay. Otherwise, look up the localized
// text for the specified id and display the overlay with that text.
// Supported ids include:
//
//   nocard: no sdcard is installed in the phone
//   pluggedin: the sdcard is being used by USB mass storage
//   emptygallery: no pictures found
//
// Localization is done using the specified id with "-title" and "-text"
// suffixes.
//
function showOverlay(id) {
  currentOverlay = id;

  if (id === null) {
    $('overlay').classList.add('hidden');
    return;
  }

  $('overlay-title').textContent = navigator.mozL10n.get(id + '-title');
  $('overlay-text').textContent = navigator.mozL10n.get(id + '-text');
  $('overlay').classList.remove('hidden');
}

// XXX
// Until https://bugzilla.mozilla.org/show_bug.cgi?id=795399 is fixed,
// we have to add a dummy click event handler on the overlay in order to
// make it opaque to touch events. Without this, it does not prevent
// the user from interacting with the UI.
$('overlay').addEventListener('click', function dummyHandler() {});
