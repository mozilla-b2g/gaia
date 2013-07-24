/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

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
var TRANSITION_FRACTION = 0.25;

// This is the speed of our default transitions in pixels/ms.
// Swipe faster than this to transition faster. But we'll
// never go slower (except slide show transitions).
var TRANSITION_SPEED = 0.75;

// How many thumbnails are visible on a page.
// Batch sizes are based on this.
var PAGE_SIZE = 15;

function $(id) { return document.getElementById(id); }

// UI elements
var thumbnails = $('thumbnails');

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

// This will be set to "ltr" or "rtl" when we get our localized event
var languageDirection;

// This array holds information about all the image and video files we
// know about. Each array element is an object that includes a
// filename and metadata. The array is initially filled when we enumerate
// the photo and video databases, and has elements added and removed when
// we receive create and delete events from the media databases.
var files = [];

var currentFileIndex = 0;       // What file is currently displayed
var editedPhotoIndex;

// In thumbnailSelectView, we allow the user to select thumbnails.
// These variables hold the names of the selected files, and map those
// names to the corresponding File objects
var selectedFileNames = [];
var selectedFileNamesToBlobs = {};

// The MediaDB object that manages the filesystem and the database of metadata
var photodb;

// We manage videos through their poster images, which are photos and so get
// listed in the photodb above. But when we need to access the actual video
// file, we have to get that from a device storage object for videos.
var videostorage;

var visibilityMonitor;

var loader = LazyLoader;

// The localized event is the main entry point for the app.
// We don't do anything until we receive it.
navigator.mozL10n.ready(function showBody() {
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
  // We only need clicks and move event coordinates
  MouseEventShim.trackMouseMoves = false;

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
  $('crop-done-button').onclick = cropAndEndPick;

  // The camera buttons should both launch the camera app
  $('fullscreen-camera-button').onclick = launchCameraApp;
  $('thumbnails-camera-button').onclick = launchCameraApp;

  // Clicking on the delete button in thumbnail select mode deletes all
  // selected items
  $('thumbnails-delete-button').onclick = deleteSelectedItems;

  // Clicking on the share button in select mode shares all selected images
  $('thumbnails-share-button').onclick = shareSelectedItems;

  // Handle resize events
  window.onresize = resizeHandler;

  // If we were not invoked by an activity, then start off in thumbnail
  // list mode, and fire up the MediaDB object.
  if (!navigator.mozHasPendingMessage('activity')) {
    initDB();
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
      if (!photodb) {
        initDB();  // Initialize the media database
        setView(thumbnailListView);
      }
      else {
        // If the gallery was already running we we arrived here via a
        // browse activity, then the user is probably coming to us from the
        // camera, and she probably wants to see the list of thumbnails.
        // If we're currently displaying a single image, switch to the
        // thumbnails. But if the user left the gallery in the middle of
        // an edit or in the middle of making a selection, then returning
        // to the thumbnail list would cause her to lose work, so in those
        // cases we don't change anything and let the gallery resume where
        // the user left it.  See Bug 846220.
        if (currentView === fullscreenView)
          setView(thumbnailListView);
      }
      break;
    case 'pick':
      if (pendingPick) // I don't think this can really happen anymore
        cancelPick();
      pendingPick = a; // We need pendingPick set before calling initDB()
      if (!photodb)
        initDB();
      startPick();
      break;
    }
  });
}

// Initialize MediaDB objects for photos and videos, and set up their
// event handlers.
function initDB() {
  photodb = new MediaDB('pictures', metadataParserWrapper, {
    version: 2,
    autoscan: false,     // We're going to call scan() explicitly
    batchHoldTime: 150,  // Batch files during scanning
    batchSize: PAGE_SIZE // Max batch size: one screenful
  });

  // This is where we find videos once the photodb notifies us that a
  // new video poster image has been detected. Note that we need this
  // even during a pick activity when we're not displaying videos
  // because we might still might find and parse metadata for new
  // videos during the scanning process.
  videostorage = navigator.getDeviceStorage('videos');

  var loaded = false;
  function metadataParserWrapper(file, onsuccess, onerror, bigFile) {
    if (loaded) {
      metadataParser(file, onsuccess, onerror, bigFile);
      return;
    }

    loader.load('js/metadata_scripts.js', function() {
      loaded = true;
      metadataParser(file, onsuccess, onerror, bigFile);
    });
  }

  // This is called when DeviceStorage becomes unavailable because the
  // sd card is removed or because it is mounted for USB mass storage
  // This may be called before onready if it is unavailable to begin with
  // We don't need one of these handlers for the video db, since both
  // will get the same event at more or less the same time.
  photodb.onunavailable = function(event) {
    // If storage becomes unavailble (e.g. the user starts a USB Mass Storage
    // session during a pick activity, just abort the pick.
    if (pendingPick) {
      cancelPick();
      return;
    }

    // Switch back to the thumbnail view. If we were viewing or editing an image
    // it might not be there anymore when the MediaDB becomes available again.
    setView(thumbnailListView);

    // Lock the user out of the app, and tell them why
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

    initThumbnails();
  };

  photodb.onscanstart = function onscanstart() {
    // Show the scanning indicator
    $('progress').classList.remove('hidden');
    $('throbber').classList.add('throb');
  };

  photodb.onscanend = function onscanend() {
    // Hide the scanning indicator
    $('progress').classList.add('hidden');
    $('throbber').classList.remove('throb');
  };

  // On devices with internal and external device storage, this handler is
  // triggered when the user removes the sdcard. MediaDB remains usable
  // and we'll get a bunch of deleted events for the files that are no longer
  // available. But we need to listen to this event so we can switch back
  // to the list of thumbnails. We don't want to be left viewing or editing
  // a photo that is no longer available.
  photodb.oncardremoved = function oncardremoved() {
    // If the user pulls the sdcard while trying to pick an image, give up
    if (pendingPick) {
      cancelPick();
      return;
    }

    setView(thumbnailListView);
  };

  // One or more files was created (or was just discovered by a scan)
  photodb.oncreated = function(event) {
    event.detail.forEach(fileCreated);
  };

  // One or more files were deleted (or were just discovered missing by a scan)
  photodb.ondeleted = function(event) {
    event.detail.forEach(fileDeleted);
  };
}

// Pass the filename of the poster image and get the video file back
function getVideoFile(filename, callback) {
  // We get videos directly through the video device storage
  var req = videostorage.get(filename);
  req.onsuccess = function() {
    callback(req.result);
  };
  req.onerror = function() {
    console.error('Failed to get video file', filename);
  };
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
// Enumerate existing entries in the media database in reverse
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
    photodb.scan();
    return;
  }

  // Keep track of when thumbnails are onscreen and offscreen
/*
  // Tune for low memory usage and small batch jobes to fetch new
  // images.  Lower fps / frequent but smaller jank.
  var visibilityMargin = 360;
  var minimumScrollDelta = 1;
*/

  // Tune for fast panning for long distances, which requires larger
  // batch jobs.  Higher fps / infrequent but larger jank.
  //
  // These magic constants were determined as follows
  //  - keep "a lot" of images loaded:
  //      max 300 images = 100 rows
  //       = 10600px on HVGA = (10600 - 480) / 2 margins = 5060
  //
  //  - batch up as much work as possible while showing unpainted
  //    thumbnails as little as possible.  4000px determined by
  //    experimentation.  (Provides 10 rows' worth loading zone.)
  var visibilityMargin = 5060;
  var minimumScrollDelta = 4000;

  visibilityMonitor =
    monitorChildVisibility(thumbnails,
                           visibilityMargin,    // extra space top and bottom
                           minimumScrollDelta,  // min scroll before we do work
                           thumbnailOnscreen,   // set background image
                           thumbnailOffscreen); // remove background image


  // Handle clicks on the thumbnails we're about to create
  thumbnails.onclick = thumbnailClickHandler;

  // We need to enumerate both the photo and video dbs and interleave
  // the files they return so that everything is in chronological order
  // from most recent to least recent.

  // Temporary arrays to hold enumerated files
  var batch = [];
  var batchsize = PAGE_SIZE;

  photodb.enumerate('date', null, 'prev', function(fileinfo) {
    if (fileinfo) {
      // For a pick activity, don't display videos
      if (pendingPick && fileinfo.metadata.video)
        return;

      batch.push(fileinfo);
      if (batch.length >= batchsize) {
        flush();
        batchsize *= 2;
      }
    }
    else {
      done();
    }
  });

  function flush() {
    batch.forEach(thumb);
    batch.length = 0;
  }

  function thumb(fileinfo) {
    files.push(fileinfo);              // remember the file
    var thumbnail = createThumbnail(files.length - 1); // create its thumbnail
    thumbnails.appendChild(thumbnail); // display the thumbnail
  }

  function done() {
    flush();
    if (files.length === 0) { // If we didn't find anything
      showOverlay('emptygallery');
    }
    // Now that we've enumerated all the photos and videos we already know
    // about go start looking for new photos and videos.
    photodb.scan();
  }
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
  photodb.deleteFile(files[n].name);

  // If it is a video, however, we can't just delete the poster image, but
  // must also delete the video file.
  if (fileinfo.metadata.video) {
    videostorage.delete(fileinfo.metadata.video);
  }

  // If the metdata parser saved a preview image for this photo,
  // delete that, too.
  if (fileinfo.metadata.preview && fileinfo.metadata.preview.filename) {
    // We use raw device storage here instead of MediaDB because that is
    // what MetadataParser.js uses for saving the preview.
    var pictures = navigator.getDeviceStorage('pictures');
    pictures.delete(fileinfo.metadata.preview.filename);
  }
}

function fileCreated(fileinfo) {
  var insertPosition;

  // If the new file is a video and we're handling an image pick activity
  // then we won't display the new file.
  if (pendingPick && fileinfo.metadata.video)
    return;

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
var pickedFile;
var cropURL;
var cropEditor;

function startPick() {
  pickType = pendingPick.source.data.type;

  if (pendingPick.source.data.width && pendingPick.source.data.height) {
    pickWidth = pendingPick.source.data.width;
    pickHeight = pendingPick.source.data.height;
  }
  else {
    pickWidth = pickHeight = 0;
  }
  // We need this for cropping the photo
  loader.load('js/ImageEditor.js', function() {
    setView(pickView);
  });
}

// Called when the user clicks on a thumbnail in pick mode
function cropPickedImage(fileinfo) {
  pickedFile = fileinfo;

  // Do we actually want to allow the user to crop the image?
  var nocrop = pendingPick.source.data.nocrop;

  if (nocrop) {
    // If we're not cropping we don't want the word "Crop" in the title bar
    // XXX: UX will probably get rid of this title bar soon, anyway.
    $('crop-header').textContent = '';
  }

  setView(cropView);

  // Before the picked image is loaded, the done button is disabled
  // to avoid users picking a black/empty image.
  $('crop-done-button').disabled = true;

  photodb.getFile(pickedFile.name, function(file) {
    cropURL = URL.createObjectURL(file);
    cropEditor = new ImageEditor(cropURL, $('crop-frame'), {}, function() {
      // Enable the done button so that users are able to finish picking image.
      $('crop-done-button').disabled = false;
      // If the initiating app doesn't want to allow the user to crop
      // the image, we don't display the crop overlay. But we still use
      // this image editor to preview the image.
      if (nocrop) {
        // Set a fake crop region even though we won't display it
        // so that getCroppedRegionBlob() works.
        cropEditor.cropRegion.left = cropEditor.cropRegion.top = 0;
        cropEditor.cropRegion.right = cropEditor.dest.w;
        cropEditor.cropRegion.bottom = cropEditor.dest.h;
        return;
      }

      cropEditor.showCropOverlay();
      if (pickWidth)
        cropEditor.setCropAspectRatio(pickWidth, pickHeight);
      else
        cropEditor.setCropAspectRatio(); // free form cropping
    });
  });
}

function cropAndEndPick() {
  if (Array.isArray(pickType)) {
    if (pickType.length === 0 ||
        pickType.indexOf(pickedFile.type) !== -1 ||
        pickType.indexOf('image/*') !== -1) {
      pickType = pickedFile.type;
    }
    else if (pickType.indexOf('image/png') !== -1) {
      pickType = 'image/png';
    }
    else {
      pickType = 'image/jpeg';
    }
  }
  else if (pickType === 'image/*') {
    pickType = pickedFile.type;
  }

  // If we're not changing the file type or resizing the image and if
  // we're not cropping, or if the user did not crop, then we can just
  // use the file as it is.
  if (pickType === pickedFile.type &&
      !pickWidth && !pickHeight &&
      (pendingPick.source.data.nocrop || !cropEditor.hasBeenCropped())) {
    photodb.getFile(pickedFile.name, endPick);
  }
  else {
    cropEditor.getCroppedRegionBlob(pickType, pickWidth, pickHeight, endPick);
  }
}

function endPick(blob) {
  pendingPick.postResult({
    type: pickType,
    blob: blob
  });
  cleanupPick();
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
  pickedFile = null;
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
    loader.load('js/frame_scripts.js', function() {
      showFile(parseInt(target.dataset.index));
    });
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
    if (files[index].metadata.video) {
      getVideoFile(files[index].metadata.video, function(file) {
        selectedFileNamesToBlobs[filename] = file;
      });
    }
    else {
      // We get photos through the photo db
      photodb.getFile(filename, function(file) {
        selectedFileNamesToBlobs[filename] = file;
      });
    }
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
