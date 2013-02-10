/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// TODO
// fix edit mode

/*
 * This app displays photos and videos that are stored on the phone.
 *
 * Its starts with a thumbnail view in which small versions of all photos
 * and videos are displayed.  Tapping on a thumbnail shows the image
 * or video at the full size of the screen and swiping left or right moves to
 * the next or previous image or video.
 *
 * The app supports two-finger "pinch" gestures to zoom in and out on an
 * image.  When zoomed, a one finger swipe gesture pans within the zoomed
 * image, and only moves to the next or previous image once you reach the
 * edge of the currently displayed image.
 *
 * To make transitions between photos smooth, the app preloads the next
 * and previous image or video and positions them off-screen to the right and
 * left of the currently displayed image.
 *
 * Image and videos are displayed in "frames" which are managed by
 * the Frame.js abstraction. A Frame object includes a video player UI
 * (from VideoPlayer.js) and also includes the code that manage zooming
 * and panning within an image.
 */

//
// Tuneable parameters
//

// Pan this % of width to transition from one item to the next
const TRANSITION_FRACTION = 0.25;

// This is the speed of our default transitions in pixels/ms.
// Swipe faster than this to transition faster. But we'll
// never go slower (except slide show transitions).
const TRANSITION_SPEED = 0.75;

function $(id) { return document.getElementById(id); }

// UI elements
var thumbnails = $('thumbnails');
var frames = $('frames');

// Only one of these three elements will be visible at a time
var thumbnailListView = $('thumbnail-list-view');
var thumbnailSelectView = $('thumbnail-select-view');
var fullscreenView = $('fullscreen-view');
var editView = $('edit-view');
var pickView = $('pick-view');
var cropView = $('crop-view');

// These are the top-level view objects.
// This array is used by setView()
var views = [
  thumbnailListView, thumbnailSelectView, fullscreenView, editView,
  pickView, cropView
];
var currentView;

var editOptionButtons =
  Array.slice($('edit-options').querySelectorAll('a.radio.button'), 0);

var editBgImageButtons =
  Array.slice($('edit-options').querySelectorAll('a.bgimage.button'), 0);

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

// When this variable is set to true, we ignore any user gestures
// so we don't try to pan or zoom during a frame transition.
var transitioning = false;

// This will be set to "ltr" or "rtl" when we get our localized event
var languageDirection;

// This array holds information about all the image and video files we
// know about. Each array element is an object that includes a
// filename and metadata. The array is initially filled when we enumerate
// the photo and video databases, and has elements added and removed when
// we receive create and delete events from the media databases.
var files = [];

var currentFileIndex = 0;       // What file is currently displayed

// In thumbnailSelectView, we allow the user to select thumbnails.
// These variables hold the names of the selected files, and map those
// names to the corresponding File objects
var selectedFileNames = [];
var selectedFileNamesToBlobs = {};

// The MediaDB objects that manage the filesystem and the database of metadata
// See init()
var photodb, videodb;

var visibilityMonitor;

// The localized event is the main entry point for the app.
// We don't do anything until we receive it.
window.addEventListener('localized', function showBody() {
  window.removeEventListener('localized', showBody);

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
  // Clicking on the back button goes back to the thumbnail view
  $('fullscreen-back-button').onclick = setView.bind(null, thumbnailListView);

  // Clicking on the select button goes to thumbnail select mode
  $('thumbnails-select-button').onclick =
    setView.bind(null, thumbnailSelectView);

  // Clicking on the cancel button goes from thumbnail select mode
  // back to thumbnail list mode
  $('thumbnails-cancel-button').onclick = setView.bind(null, thumbnailListView);

  // Clicking on the pick back button cancels the pick activity.
  $('pick-back-button').onclick = cancelPick;

  // In crop view, the back button goes back to pick view
  $('crop-back-button').onclick = function() {
    setView(pickView);
    cleanupCrop();
  };

  // In crop view, the done button finishes the pick
  $('crop-done-button').onclick = finishPick;

  // The camera buttons should both launch the camera app
  $('fullscreen-camera-button').onclick = launchCameraApp;
  $('thumbnails-camera-button').onclick = launchCameraApp;

  // Clicking the delete button while viewing a single item deletes that item
  $('fullscreen-delete-button').onclick = deleteSingleItem;

  // Clicking on the delete button in thumbnail select mode deletes all
  // selected items
  $('thumbnails-delete-button').onclick = deleteSelectedItems;

  // Clicking the Edit button while viewing a photo switches to edit mode
  $('fullscreen-edit-button').onclick = function() {
    editPhotoIfCardNotFull(currentFileIndex);
  };

  // In fullscreen mode, the share button shares the current item
  $('fullscreen-share-button').onclick = shareSingleItem;

  // Clicking on the share button in select mode shares all selected images
  $('thumbnails-share-button').onclick = shareSelectedItems;

  // Handle resize events
  window.onresize = resizeHandler;

  // Edit mode event handlers
  $('edit-exposure-button').onclick = setEditTool.bind(null, 'exposure');
  $('edit-crop-button').onclick = setEditTool.bind(null, 'crop');
  $('edit-effect-button').onclick = setEditTool.bind(null, 'effect');
  $('edit-border-button').onclick = setEditTool.bind(null, 'border');
  $('edit-crop-none').onclick = undoCropHandler;
  $('edit-cancel-button').onclick = exitEditMode;
  $('edit-save-button').onclick = saveEditedImage;
  editOptionButtons.forEach(function(b) { b.onclick = editOptionsHandler; });

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

  // If we were not invoked by an activity, then start off in thumbnail
  // list mode, and fire up the image and video mediadb objects.
  if (!navigator.mozHasPendingMessage('activity')) {
    initDB(true);
    setView(thumbnailListView);
  }

  // Register a handler for activities. This will take care of the rest
  // of the initialization process.
  navigator.mozSetMessageHandler('activity', function activityHandler(a) {
    var activityName = a.source.name;
    switch (activityName) {
    case 'browse':
      // The 'browse' activity is the way we launch Gallery from Camera.
      // If this was a cold start, then the db needs to be initialized.
      if (!photodb)
        initDB(true);  // Initialize both the photo and video databases
      // Always switch to the list of thumbnails.
      setView(thumbnailListView);
      break;
    case 'pick':
      if (pendingPick) // I don't think this can really happen anymore
        cancelPick();
      if (!photodb)
        initDB(false); // Don't include videos when picking photos!
      startPick(a);
      break;
    }
  });
}

// Initialize MediaDB objects for photos and videos, and set up their
// event handlers.
function initDB(include_videos) {
  photodb = new MediaDB('pictures', metadataParsers.imageMetadataParser, {
    mimeTypes: ['image/jpeg', 'image/png'],
    version: 2,
    autoscan: false,    // We're going to call scan() explicitly
    batchHoldTime: 350, // Batch files during scanning
    batchSize: 12       // Max batch size: one screenful
  });

  if (include_videos) {
    // For videos, this app is only interested in files under DCIM/.
    videodb = new MediaDB('videos', metadataParsers.videoMetadataParser, {
      directory: 'DCIM/',
      autoscan: false,    // We're going to call scan() explicitly
      batchHoldTime: 350, // Batch files during scanning
      batchSize: 12       // Max batch size: one screenful
    });
  }
  else {
    videodb = null;
  }

  // This is called when DeviceStorage becomes unavailable because the
  // sd card is removed or because it is mounted for USB mass storage
  // This may be called before onready if it is unavailable to begin with
  // We don't need one of these handlers for the video db, since both
  // will get the same event at more or less the same time.
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

    // If we're including videos also, be sure that they are ready
    if (include_videos) {
      if (videodb.state === MediaDB.READY)
        initThumbnails();
    }
    else {
      initThumbnails();
    }
  };

  if (include_videos) {
    videodb.onready = function() {
      // If the photodb is also ready, create thumbnails.
      // Depending on the order of the ready events, either this code
      // or the code above will fire and set up the thumbnails
      if (photodb.state === MediaDB.READY)
        initThumbnails();
    };
  }

  // When the mediadbs are scanning, let the user know. We count scan starts
  // and ends so we correctly display the throbber while either db is scanning.
  var scanning = 0;

  photodb.onscanstart = function onscanstart() {
    scanning++;
    if (scanning == 1) {
      // Show the scanning indicator
      $('progress').classList.remove('hidden');
      $('throbber').classList.add('throb');
    }
  };

  photodb.onscanend = function onscanend() {
    scanning--;
    if (scanning == 0) {
      // Hide the scanning indicator
      $('progress').classList.add('hidden');
      $('throbber').classList.remove('throb');
    }
  };

  // One or more files was created (or was just discovered by a scan)
  photodb.oncreated = function(event) {
    event.detail.forEach(fileCreated);
  };

  // One or more files were deleted (or were just discovered missing by a scan)
  photodb.ondeleted = function(event) {
    event.detail.forEach(fileDeleted);
  };

  if (include_videos) {
    videodb.onscanstart = photodb.onscanstart;
    videodb.onscanend = photodb.onscanend;
    videodb.oncreated = photodb.oncreated;
    videodb.ondeleted = photodb.ondeleted;
  }
}

// This comparison function is used for sorting arrays and doing binary
// search on the resulting sorted arrays.
function compareFilesByDate(a, b) {
  if (a.date < b.date)
    return 1;  // larger (newer) dates come first
  else if (a.date > b.date)
    return -1;
  return 0;
}

//
// Enumerate existing entries in the photo and video databases in reverse
// chronological order (most recent first) and display thumbnails for them all.
// After the thumbnails are displayed, scan for new files.
//
// This function gets called when the app first starts up, and also
// when the sdcard becomes available again after a USB mass storage
// session or an sdcard replacement.
//
function initThumbnails() {
  // If we've already been called once, then we've already got thumbnails
  // displayed. There is no need to re-enumerate them, so we just go
  // straight to scanning for new files
  if (visibilityMonitor) {
    scan();
    return;
  }

  // Keep track of when thumbnails are onscreen and offscreen
  visibilityMonitor =
    monitorChildVisibility(thumbnails,
                           360,                 // extra space top and bottom
                           thumbnailOnscreen,   // set background image
                           thumbnailOffscreen); // remove background image

  var photos, videos;
  photodb.getAll(function(records) {
    photos = records;
    if (videos)
      mergeAndCreateThumbnails();
  });

  if (videodb) {
    videodb.getAll(function(records) {
      videos = records;
      if (photos)
        mergeAndCreateThumbnails();
    });
  }
  else {
    videos = [];
  }

  // This is called when we have all the photos and all the videos
  function mergeAndCreateThumbnails() {
    // Sort both batches of files by date
    photos.sort(compareFilesByDate);
    videos.sort(compareFilesByDate);

    // Now merge the two arrays into files[], maintaining sort order
    var numPhotos = photos.length;
    var numVideos = videos.length;
    var p = 0, v = 0;
    while (p < numPhotos || v < numVideos) {
      if (v >= numVideos) {          // If no more videos
        files.push(photos[p++]);     // Add the next photo
      }
      else if (p >= numPhotos) {     // If no more photos
        files.push(videos[v++]);     // Add the next video
      }
      else {                         // Otherwise, add the newer one
        if (photos[p].date >= videos[v].date) {
          files.push(photos[p++]);
        }
        else {
          files.push(videos[v++]);
        }
      }
      // Create and display a thumbnail for the file we just added
      thumbnails.appendChild(createThumbnail(files.length - 1));
    }

    // Now that the thumbnails are created, we can start handling clicks
    thumbnails.onclick = thumbnailClickHandler;

    // And we can dismiss the spinner overlay
    $('spinner-overlay').classList.add('hidden');

    // But if we didn't find any files, put up the no files overlay
    if (files.length === 0) {
      showOverlay('emptygallery');
    }

    // Scan for new files. We used to start a scan right away but we don't
    // really have a way to properly handle scan results while enumerating
    // the thumbnails, so now we just enumerate as fast as we can and then
    // start scanning for new results.
    scan();
  }
}

function scan() {
  photodb.scan();
  if (videodb)
    videodb.scan();
}

function fileDeleted(filename) {
  // Find the deleted file in our files array
  for (var n = 0; n < files.length; n++) {
    if (files[n].name === filename)
      break;
  }

  if (n >= files.length)  // It was a file we didn't know about
    return;

  // Remove the image from the array
  var deletedImageData = files.splice(n, 1)[0];

  // Remove the corresponding thumbnail
  var thumbnailElts = thumbnails.querySelectorAll('.thumbnail');
  URL.revokeObjectURL(thumbnailElts[n].dataset.backgroundImage.slice(5, -2));
  thumbnails.removeChild(thumbnailElts[n]);

  // Change the index associated with all the thumbnails after the deleted one
  // This keeps the data-index attribute of each thumbnail element in sync
  // with the files[] array.
  for (var i = n + 1; i < thumbnailElts.length; i++) {
    thumbnailElts[i].dataset.index = i - 1;
  }

  // Adjust currentFileIndex, too, if we have to.
  if (n < currentFileIndex)
    currentFileIndex--;

  // If we remove the last item in files[],
  // we need to show the previous image, not the next image.
  if (currentFileIndex >= files.length)
    currentFileIndex = files.length - 1;

  if (n < editedPhotoIndex)
    editedPhotoIndex--;

  // If we're in fullscreen mode, then the only way this function
  // gets called is when we delete the currently displayed photo. This means
  // that we need to redisplay.
  if (currentView === fullscreenView && files.length > 0) {
    showFile(currentFileIndex);
  }

  // If there are no more photos show the "no pix" overlay
  if (files.length === 0) {
    if (currentView !== pickView)
      setView(thumbnailListView);
    showOverlay('emptygallery');
  }
}

function deleteFile(n) {
  if (n < 0 || n >= files.length)
    return;

  // Delete the file from the MediaDB. This removes the db entry and
  // deletes the file in device storage. This will generate an change
  // event which will call imageDeleted()
  var fileinfo = files[n];
  if (fileinfo.metadata.video)
    videodb.deleteFile(fileinfo.name);
  else
    photodb.deleteFile(files[n].name);
}

function fileCreated(fileinfo) {
  var insertPosition;

  // If we were showing the 'no pictures' overlay, hide it
  if (currentOverlay === 'emptygallery')
    showOverlay(null);

  // If this new image is newer than the first one, it goes first
  // This is the most common case for photos, screenshots, and edits
  if (files.length === 0 || fileinfo.date > files[0].date) {
    insertPosition = 0;
  }
  else {
    // Otherwise we have to search for the right insertion spot
    insertPosition = binarysearch(files, fileinfo, compareFilesByDate);
  }

  // Insert the image info into the array
  files.splice(insertPosition, 0, fileinfo);

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

  if (currentFileIndex >= insertPosition)
    currentFileIndex++;
  if (editedPhotoIndex >= insertPosition)
    editedPhotoIndex++;

  // Redisplay the current photo if we're in photo view. The current
  // photo should not change, but the content of the next or previous frame
  // might. This call will only make changes if the filename to display
  // in a frame has actually changed.
  if (currentView === fullscreenView) {
    showFile(currentFileIndex);
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

// Make the thumbnail for image n visible
function scrollToShowThumbnail(n) {
  var selector = 'li[data-index="' + n + '"]';
  var thumbnail = thumbnails.querySelector(selector);
  if (thumbnail) {
    var screenTop = thumbnails.scrollTop;
    var screenBottom = screenTop + thumbnails.clientHeight;
    var thumbnailTop = thumbnail.offsetTop;
    var thumbnailBottom = thumbnailTop + thumbnail.offsetHeight;
    var toolbarHeight = 40; // compute this dynamically?

    // Adjust the screen bottom up to be above the overlaid footer
    screenBottom -= toolbarHeight;

    if (thumbnailTop < screenTop) {            // If thumbnail is above screen
      thumbnails.scrollTop = thumbnailTop;     // scroll up to show it.
    }
    else if (thumbnailBottom > screenBottom) { // If thumbnail is below screen
      thumbnails.scrollTop =                   // scroll  down to show it
        thumbnailBottom - thumbnails.clientHeight + toolbarHeight;
    }
  }
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
  case fullscreenView:
    // Clear the frames to release the memory they're holding and
    // so that we don't see a flash of the old image when we return
    // to fullscreen view
    previousFrame.clear();
    currentFrame.clear();
    nextFrame.clear();
    delete previousFrame.filename;
    delete currentFrame.filename;
    delete nextFrame.filename;

    // If we're leaving fullscreen, then we were just viewing a photo
    // or video, so make sure its thumbnail is fully on the screen.
    // XXX: do we need to defer this?
    scrollToShowThumbnail(currentFileIndex);

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
  // In particular, we've got to set the thumbnail class appropriately
  // for each view
  switch (view) {
  case thumbnailListView:
    thumbnails.className = 'list';
    break;
  case thumbnailSelectView:
    thumbnails.className = 'select';
    // Set the view header to a localized string
    clearSelection();
    break;
  case pickView:
    thumbnails.className = 'pick';
    break;
  case fullscreenView:
    thumbnails.className = 'offscreen';
    // Show the toolbar
    fullscreenView.classList.remove('toolbarhidden');
    break;
  default:
    thumbnails.className = 'offscreen';
    break;
  }

  // Remember the current view
  currentView = view;
}

//
// Create a thumbnail element
//
function createThumbnail(imagenum) {
  var li = document.createElement('li');
  li.dataset.index = imagenum;
  li.classList.add('thumbnail');

  var fileinfo = files[imagenum];
  // We revoke this url in imageDeleted
  var url = URL.createObjectURL(fileinfo.metadata.thumbnail);

  // We set the url on a data attribute and let the onscreen
  // and offscreen callbacks below set and unset the actual
  // background image style. This means that we don't keep
  // images decoded if we don't need them.
  li.dataset.backgroundImage = 'url("' + url + '")';
  return li;
}

// monitorChildVisibility() calls this when a thumbnail comes onscreen
function thumbnailOnscreen(thumbnail) {
  if (thumbnail.dataset.backgroundImage)
    thumbnail.style.backgroundImage = thumbnail.dataset.backgroundImage;
}

// monitorChildVisibility() calls this when a thumbnail goes offscreen
function thumbnailOffscreen(thumbnail) {
  if (thumbnail.dataset.backgroundImage)
    thumbnail.style.backgroundImage = null;
}

//
// Pick activity
//

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

// XXX If the user goes to the homescreen or switches to another app
// the pick request is implicitly cancelled
// Remove this code when https://github.com/mozilla-b2g/gaia/issues/2916
// is fixed and replace it with an onerror handler on the activity to
// switch out of pickView.
window.addEventListener('mozvisibilitychange', function() {
  if (document.mozHidden && pendingPick)
    cancelPick();
});


//
// Event handlers
//


// Clicking on a thumbnail does different things depending on the view.
// In thumbnail list mode, it displays the image. In thumbanilSelect mode
// it selects the image. In pick mode, it finishes the pick activity
// with the image filename
function thumbnailClickHandler(evt) {
  var target = evt.target;
  if (!target || !target.classList.contains('thumbnail'))
    return;

  if (currentView === thumbnailListView || currentView === fullscreenView) {
    showFile(parseInt(target.dataset.index));
  }
  else if (currentView === thumbnailSelectView) {
    updateSelection(target);
  }
  else if (currentView === pickView) {
    cropPickedImage(files[parseInt(target.dataset.index)]);
  }
}

function clearSelection() {
  selectedFileNames = [];
  selectedFileNamesToBlobs = {};
  $('thumbnails-delete-button').classList.add('disabled');
  $('thumbnails-share-button').classList.add('disabled');
  $('thumbnails-number-selected').textContent =
    navigator.mozL10n.get('number-selected2', { n: 0 });
}

// When we enter thumbnail selection mode, or when the selection changes
// we call this function to update the message the top of the screen and to
// enable or disable the Delete and Share buttons
function updateSelection(thumbnail) {
  // First, update the visual appearance of the element
  thumbnail.classList.toggle('selected');

  // Now update the list of selected filenames and filename->blob map
  // based on whether we selected or deselected the thumbnail
  var selected = thumbnail.classList.contains('selected');
  var index = parseInt(thumbnail.dataset.index);
  var filename = files[index].name;

  if (selected) {
    selectedFileNames.push(filename);
    var db = files[index].metadata.video ? videodb : photodb;
    db.getFile(filename, function(file) {
      selectedFileNamesToBlobs[filename] = file;
    });
  }
  else {
    delete selectedFileNamesToBlobs[filename];
    var i = selectedFileNames.indexOf(filename);
    if (i !== -1)
      selectedFileNames.splice(i, 1);
  }

  // Now update the UI based on the number of selected thumbnails
  var numSelected = selectedFileNames.length;
  var msg = navigator.mozL10n.get('number-selected2', { n: numSelected });
  $('thumbnails-number-selected').textContent = msg;

  if (numSelected === 0) {
    $('thumbnails-delete-button').classList.add('disabled');
    $('thumbnails-share-button').classList.add('disabled');
  }
  else {
    $('thumbnails-delete-button').classList.remove('disabled');
    $('thumbnails-share-button').classList.remove('disabled');
  }
}

function launchCameraApp() {
  var a = new MozActivity({
    name: 'record',
    data: {
      type: 'photos'
    }
  });
}

function deleteSelectedItems() {
  var selected = thumbnails.querySelectorAll('.selected.thumbnail');
  if (selected.length === 0)
    return;

  var msg = navigator.mozL10n.get('delete-n-items?', {n: selected.length});
  if (confirm(msg)) {
    // XXX
    // deleteFile is O(n), so this loop is O(n*n). If used with really large
    // selections, it might have noticably bad performance.  If so, we
    // can write a more efficient deleteFiles() function.
    for (var i = 0; i < selected.length; i++) {
      selected[i].classList.toggle('selected');
      deleteFile(parseInt(selected[i].dataset.index));
    }
    clearSelection();
  }
}

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
    deleteFile(currentFileIndex);
  }
}

// In fullscreen mode, the share button shares the current item
function shareSingleItem() {
  share([currentFrame.blob]);
}

// Clicking on the share button in select mode shares all selected images
function shareSelectedItems() {
  var blobs = selectedFileNames.map(function(name) {
    return selectedFileNamesToBlobs[name];
  });
  share(blobs);
}

function share(blobs) {
  if (blobs.length === 0)
    return;

  var names = [], types = [], fullpaths = [];

  // Get the file name (minus path) and type of each blob
  blobs.forEach(function(blob) {
    // Discard the path, we just want the base name
    var name = blob.name;
    // We try to fix Bug 814323 by using
    // current workaround of bluetooth transfer
    // so we will pass both filenames and fullpaths
    // The fullpaths can be removed after Bug 811615 is fixed
    fullpaths.push(name);
    name = name.substring(name.lastIndexOf('/') + 1);
    names.push(name);

    // And we just want the first component of the type "image" or "video"
    var type = blob.type;
    if (type)
      type = type.substring(0, type.indexOf('/'));
    types.push(type);
  });

  // If there is just one type, or if all types are the same, then use
  // that type plus '/*'. Otherwise, use 'multipart/mixed'
  // If all the blobs are image we use 'image/*'. If all are videos
  // we use 'video/*'. Otherwise, 'multipart/mixed'.
  var type;
  if (types.length === 1 || types.every(function(t) { return t === types[0]; }))
    type = types[0] + '/*';
  else
    type = 'multipart/mixed';

  var a = new MozActivity({
    name: 'share',
    data: {
      type: type,
      number: blobs.length,
      blobs: blobs,
      filenames: names,
      filepaths: fullpaths
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

// This happens when the user rotates the phone.
// When we used mozRequestFullscreen, it would also happen
// when we entered or left fullscreen mode.
function resizeHandler() {
  //
  // When we enter or leave fullscreen mode, we get two resize events.
  // When we get the first one, we don't know what our new size is, so
  // we just ignore it. XXX: we're not using fullscreen mode anymore,
  // but it seems safer to leave this code in.
  //
  if (fullscreenView.offsetWidth === 0 && fullscreenView.offsetHeight === 0)
    return;

  if (currentView === fullscreenView) {
    currentFrame.resize();
    previousFrame.reset();
    nextFrame.reset();

    // We also have to reposition the frames to get the next and previous
    // frames the correct distance away from the current frame
    setFramesPosition();
  }
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

  if (fileinfo.metadata.video) {
    videodb.getFile(fileinfo.name, function(file) {
      frame.displayVideo(file,
                         fileinfo.metadata.width,
                         fileinfo.metadata.height,
                         fileinfo.metadata.rotation || 0);
    });
  }
  else {
    photodb.getFile(fileinfo.name, function(file) {
      frame.displayImage(file,
                         fileinfo.metadata.width,
                         fileinfo.metadata.height,
                         fileinfo.metadata.preview);
    });
  }
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

  // Disable the edit button if this is a video, and enable otherwise
  if (files[n].metadata.video)
    $('fullscreen-edit-button').classList.add('disabled');
  else
    $('fullscreen-edit-button').classList.remove('disabled');
}

// Transition to the next file, animating it over the specified time (ms).
// This is used when the user pans.
function nextFile(time) {
  // If already displaying the last one, do nothing.
  if (currentFileIndex === files.length - 1)
    return;

  // Don't pan a playing video!
  if (currentFrame.displayingVideo && !currentFrame.video.player.paused)
    currentFrame.video.pause();

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

  // Disable the edit button if we're now viewing a video, and enable otherwise
  if (currentFrame.displayingVideo)
    $('fullscreen-edit-button').classList.add('disabled');
  else
    $('fullscreen-edit-button').classList.remove('disabled');
}

// Just like nextFile() but in the other direction
function previousFile(time) {
  // if already displaying the first one, do nothing.
  if (currentFileIndex === 0)
    return;

  // Don't pan a playing video!
  if (currentFrame.displayingVideo && !currentFrame.video.player.paused)
    currentFrame.video.pause();

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

  // Disable the edit button if we're now viewing a video, and enable otherwise
  if (currentFrame.displayingVideo)
    $('fullscreen-edit-button').classList.add('disabled');
  else
    $('fullscreen-edit-button').classList.remove('disabled');
}

var editedPhotoIndex;
var editedPhotoURL; // The blob URL of the photo we're currently editing
var editSettings;
var imageEditor;

// Ensure there is enough space to store an edited copy of photo n
// and if there is, call editPhoto to do so
function editPhotoIfCardNotFull(n) {
  var fileinfo = files[n];
  var imagesize = fileinfo.size;

  photodb.freeSpace(function(freespace) {
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
      x: 0, y: 0, w: files[n].metadata.width, h: files[n].metadata.height
    },
    gamma: 1,
    borderWidth: 0,
    borderColor: [0, 0, 0, 0]
  };

  // Start looking up the image file
  photodb.getFile(files[n].name, function(file) {
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

function undoCropHandler() {
  // Switch to free-form cropping
  Array.forEach($('edit-crop-options').querySelectorAll('a.radio.button'),
                function(b) { b.classList.remove('selected'); });
  $('edit-crop-aspect-free').classList.add('selected');
  imageEditor.setCropAspectRatio(); // freeform

  // And revert to full-size image
  imageEditor.undoCrop();
}

function exitEditMode(saved) {
  // Revoke the blob URL we've been using
  URL.revokeObjectURL(editedPhotoURL);
  editedPhotoURL = null;

  // close the editor object
  imageEditor.destroy();
  imageEditor = null;

  // We came in to edit mode from fullscreenView.  If the user cancels the edit
  // go back to fullscreenView.  Otherwise, if the user saves the photo, we go
  // back to thumbnail list view because that is where the newly saved
  // image is going to show up.
  // XXX: this isn't really right. Ideally the new photo should show up
  // right next to the old one and we should go back to fullscreenView to view
  // the edited photo.
  if (saved) {
    currentFileIndex = 0; // because the saved image will be newest
    setView(thumbnailListView);
  }
  else
    setView(fullscreenView);
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
function saveEditedImage() {
  // If we are in crop mode, perform the crop before saving
  if ($('edit-crop-button').classList.contains('selected'))
    imageEditor.cropImage();

  imageEditor.getFullSizeBlob('image/jpeg', function(blob) {

    var original = files[editedPhotoIndex].name;
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
    while (files.some(function(i) { return i.name === filename; })) {
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
}

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

  $('overlay-title').textContent = navigator.mozL10n.get(id + '2-title');
  $('overlay-text').textContent = navigator.mozL10n.get(id + '2-text');
  $('overlay').classList.remove('hidden');
}

// XXX
// Until https://bugzilla.mozilla.org/show_bug.cgi?id=795399 is fixed,
// we have to add a dummy click event handler on the overlay in order to
// make it opaque to touch events. Without this, it does not prevent
// the user from interacting with the UI.
$('overlay').addEventListener('click', function dummyHandler() {});
