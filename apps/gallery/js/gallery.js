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

var fullscreenView = $('fullscreen-view');

// These are the top-level view class which are defined in
// gallery_tablet.css
// This object is used by setView()

// Layout Mode Transition:
// list <-> selection
// list <-> fullscreen <-> edit/crop
// (activity) pick <-> crop
const LAYOUT_MODE = {
  list: 'thumbnailListView',
  select: 'thumbnailSelectView',
  fullscreen: 'fullscreenView',
  edit: 'editView',
  pick: 'pickView',
  crop: 'cropView'
};

var currentView;

// This will be set to "ltr" or "rtl" when we get our localized event
var languageDirection;

// Register orientation watcher in ScreenLayout
ScreenLayout.watch('portrait', '(orientation: portrait)');
var isPortrait = ScreenLayout.getCurrentLayout('portrait');
var isPhone = ScreenLayout.getCurrentLayout('tiny');

var fullscreenButtonIds = ['back', 'delete', 'edit', 'share', 'camera', 'info'];
var fullscreenButtons = {};
for (var i = 0; i < fullscreenButtonIds.length; i++) {
  var name = 'fullscreen-' + fullscreenButtonIds[i] + '-button';
  name += (isPhone ? '-tiny' : '-large');
  fullscreenButtons[fullscreenButtonIds[i]] = document.getElementById(name);
}

// This array holds information about all the image and video files we
// know about. Each array element is an object that includes a
// filename and metadata. The array is initially filled when we enumerate
// the photo and video databases, and has elements added and removed when
// we receive create and delete events from the media databases.
var files = [];
var thumbnailList;

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

// Flag that indicates that we've edited a picture and just saved it
var hasSaved = false;

// We store the last focused thumbnail so that we can quickly get the
// selected thumbnails.
var lastFocusedThumbnail = null;

var currentOverlay;  // The id of the current overlay or null if none.

// The localized event is the main entry point for the app.
// We don't do anything until we receive it.
navigator.mozL10n.ready(function showBody() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');

  // load frame_script.js for preview mode and show loading background
  if (!isPhone) {
    loader.load('js/frame_scripts.js');
  }

  // Now initialize the rest of the app. But don't re-initialize if the user
  // switches languages when the app is already running
  if (!photodb)
    init();
});

function init() {
  // Clicking on the select button goes to thumbnail select mode
  $('thumbnails-select-button').onclick =
    setView.bind(null, LAYOUT_MODE.select);

  // Clicking on the cancel button goes from thumbnail select mode
  // back to thumbnail list mode
  $('thumbnails-cancel-button').onclick =
    setView.bind(null, LAYOUT_MODE.list);

  // Clicking on the pick back button cancels the pick activity.
  $('pick-back-button').onclick = cancelPick;

  // In crop view, the back button goes back to pick view
  $('crop-back-button').onclick = function() {
    setView(LAYOUT_MODE.pick);
    cleanupCrop();
  };

  // In crop view, the done button finishes the pick
  $('crop-done-button').onclick = cropAndEndPick;

  // The camera buttons should launch the camera app
  fullscreenButtons.camera.onclick = launchCameraApp;

  $('thumbnails-camera-button').onclick = launchCameraApp;
  $('overlay-camera-button').onclick = launchCameraApp;

  // Clicking on the delete button in thumbnail select mode deletes all
  // selected items
  $('thumbnails-delete-button').onclick = deleteSelectedItems;

  // Clicking on the share button in select mode shares all selected images
  $('thumbnails-share-button').onclick = shareSelectedItems;

  // Click to open the media storage panel when the default storage
  // is unavailable.
  $('storage-setting-button').onclick = function() {
    var activity = new MozActivity({
      name: 'configure',
      data: {
        target: 'device',
        section: 'mediaStorage'
      }
    });
  };
  $('overlay-cancel-button').onclick = function() {
    cancelPick();
  };
  // Handle resize events
  window.onresize = resizeHandler;

  // If we were not invoked by an activity, then start off in thumbnail
  // list mode, and fire up the MediaDB object.
  if (!navigator.mozHasPendingMessage('activity')) {
    initDB();
    setView(LAYOUT_MODE.list);
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
        setView(LAYOUT_MODE.list);
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
        if (currentView === LAYOUT_MODE.fullscreen)
          setView(LAYOUT_MODE.list);
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

  // show dialog in upgradestart, when it finished, it will turned to ready.
  photodb.onupgrading = function(evt) {
    showOverlay('upgrade');
  };

  // This is called when DeviceStorage becomes unavailable because the
  // sd card is removed or because it is mounted for USB mass storage
  // This may be called before onready if it is unavailable to begin with
  // We don't need one of these handlers for the video db, since both
  // will get the same event at more or less the same time.
  photodb.onunavailable = function(event) {
    // Switch back to the thumbnail view. If we were viewing or editing an image
    // it might not be there anymore when the MediaDB becomes available again.
    setView(LAYOUT_MODE.list);

    // If storage becomes unavailble (e.g. the user starts a USB Mass Storage
    // Lock the user out of the app, and tell them why
    var why = event.detail;
    if (why === MediaDB.NOCARD)
      showOverlay('nocard');
    else if (why === MediaDB.UNMOUNTED)
      showOverlay('pluggedin');
  };

  photodb.onready = function() {
    // Hide the nocard or pluggedin overlay if it is displayed
    if (currentOverlay === 'nocard' || currentOverlay === 'pluggedin' ||
        currentOverlay === 'upgrade')
      showOverlay(null);

    initThumbnails();
  };

  photodb.onscanstart = function onscanstart() {
    // Prevents user to edit images when scanning pictures from storage
    fullscreenButtons.edit.classList.add('disabled');
    // Show the scanning indicator
    $('progress').classList.remove('hidden');
    $('throbber').classList.add('throb');
  };

  photodb.onscanend = function onscanend() {
    // Allows the user to edit images when scanning is finished
    fullscreenButtons.edit.classList.remove('disabled');

    if (currentOverlay === 'scanning')
      showOverlay('emptygallery');
    else if (!isPhone && !currentFrame.displayingImage &&
             !currentFrame.displayingVideo) {
      // focus on latest one if client hasn't clicked any of
      // them
      showFile(0);
    }

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

    setView(LAYOUT_MODE.list);
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

  // configure the template id for template group
  ThumbnailDateGroup.Template = new Template('thumbnail-group-header');

  // For gallery group view initialise ThumbnailList object
  thumbnailList = new ThumbnailList(ThumbnailDateGroup, thumbnails);

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
    monitorTagVisibility(thumbnails, 'li',
                         visibilityMargin,    // extra space top and bottom
                         minimumScrollDelta,  // min scroll before we do work
                         thumbnailOnscreen,   // set background image
                         thumbnailOffscreen); // remove background image


  // Handle clicks on the thumbnails we're about to create
  thumbnails.addEventListener('click', thumbnailClickHandler);

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
    // Create the thumbnail view for this file
    // and insert it at the right spot
    thumbnailList.addItem(fileinfo);
  }

  function done() {
    flush();
    if (files.length === 0) { // If we didn't find anything
      showOverlay('scanning');
    }
    // Now that we've enumerated all the photos and videos we already know
    // about go start looking for new photos and videos.
    photodb.scan();
  }
}

//
// getFileIndex return position of a file thumbnail in gallery view
// It first find thumbnail's position within its own group
// then add the sizes of previous groups
function getFileIndex(filename) {
  // Get the group of the file
  var fileGroup = thumbnailList.groupMap[filename];
  if (!fileGroup) {
    console.error('file group does not exist in thumbnail List', filename);
    return -1;
  }
  var index = 0;
  // Get the thumbnailItem of the file
  var thumbnail = thumbnailList.thumbnailMap[filename];
   // Get the index of the file in its own group
  index = fileGroup.thumbnails.indexOf(thumbnail);
  if (index < 0) {
    console.error('filename does not exist in thumbnail list', filename);
    return -1;
  }
  // Add to index the sizes of previous groups
  for (var n = 0; n < thumbnailList.itemGroups.length; n++) {
    if (thumbnailList.itemGroups[n].groupID === fileGroup.groupID) {
      break;
    }
    index += thumbnailList.itemGroups[n].getCount();
  }
  return index;
}

function fileDeleted(filename) {
  var fileIndex = currentFileIndex;
  // Find the deleted file in our files array
  for (var n = 0; n < files.length; n++) {
    if (files[n].name === filename)
      break;
  }

  if (n >= files.length)  // It was a file we didn't know about
    return;

  // Remove the image from the array
  files.splice(n, 1)[0];

  // Remove the corresponding thumbnail
  thumbnailList.removeItem(filename);

  // Adjust currentFileIndex, too, if we have to.
  if (n < fileIndex)
    fileIndex--;

  // If we remove the last item in files[],
  // we need to show the previous image, not the next image.
  if (fileIndex >= files.length)
    fileIndex = files.length - 1;

  if (n < editedPhotoIndex)
    editedPhotoIndex--;

  // If we're in fullscreen mode or has preview screen, then the only way
  // this function gets called is when we delete the currently displayed photo.
  // This means that we need to redisplay.
  if (files.length > 0 && (currentView === LAYOUT_MODE.fullscreen)) {
    showFile(fileIndex);
  } else {
    updateFocusThumbnail(fileIndex);
  }

  // If there are no more photos show the "no pix" overlay
  if (files.length === 0) {
    if (currentView !== LAYOUT_MODE.pick)
      setView(LAYOUT_MODE.list);
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
  if (currentOverlay === 'emptygallery' || currentOverlay === 'scanning')
    showOverlay(null);

  // Create a thumbnailItem for this image and insert it at the right spot
  var thumbnailItem = thumbnailList.addItem(fileinfo);
  insertPosition = getFileIndex(fileinfo.name);
  if (insertPosition < 0)
    return;

  // Insert the image info into the array
  files.splice(insertPosition, 0, fileinfo);

  if (currentFileIndex >= insertPosition)
    currentFileIndex++;
  if (editedPhotoIndex >= insertPosition)
    editedPhotoIndex++;

  // Redisplay the current photo if we're in photo view. The current
  // photo should not change, but the content of the next or previous frame
  // might. This call will only make changes if the filename to display
  // in a frame has actually changed.
  if (currentView === LAYOUT_MODE.fullscreen) {
    if (hasSaved) {
      showFile(0);
    } else {
      showFile(currentFileIndex);
    }
  }
  hasSaved = false;
}

// Make the thumbnail for image n visible
function scrollToShowThumbnail(n) {
  if (!files[n])
    return;
  var selector = 'li[data-filename="' + files[n].name + '"]';
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
  // define each view's layout based on data-view of body
  document.body.classList.remove(currentView);
  document.body.classList.add(view);
  // Do any necessary cleanup of the view we're exiting
  switch (currentView) {
    case LAYOUT_MODE.select:
      // Clear the selection, if there is one
      Array.forEach(thumbnails.querySelectorAll('.selected.thumbnail'),
                    function(elt) { elt.classList.remove('selected'); });
      if (!isPhone)
        showFile(currentFileIndex);
      break;
    case LAYOUT_MODE.fullscreen:
      if (!isPhone && (view === LAYOUT_MODE.list) && !isPortrait) {
        // we'll reuse and resize the fullscreen window
        // when go back to thumbnailList mode from fullscreen
        // and also does editView in landscape
        resizeFrames();
      } else {
        // Clear the frames to release the memory they're holding and
        // so that we don't see a flash of the old image when we return
        // to fullscreen view
        clearFrames();
      }
      break;
  }
  switch (view) {
    case LAYOUT_MODE.list:
      // If we're going to fullscreen, then we were just viewing a photo
      // or video, so make sure its thumbnail is fully on the screen.
      // XXX: do we need to defer this?
      scrollToShowThumbnail(currentFileIndex);
      break;
    case LAYOUT_MODE.fullscreen:
      resizeFrames();
      break;
    case LAYOUT_MODE.select:
      clearSelection();
      // When entering select view, we pause the video
      if (!isPhone && currentFrame.video && !isPortrait)
        currentFrame.video.pause();
      break;
  }

  // We reuse the fullscreen dom for preview and fullscreen dom,
  // so the title must be changed while switching
  if (!isPhone) {
    if (view !== LAYOUT_MODE.fullscreen) {
      $('fullscreen-title').textContent =
        navigator.mozL10n.get('preview');
    } else {
      $('fullscreen-title').textContent =
        navigator.mozL10n.get('gallery');
    }
  }
  // Remember the current view
  currentView = view;
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
  // We need frame_scripts and ImageEditor for cropping the photo
  loader.load(['js/frame_scripts.js', 'js/ImageEditor.js'], function() {
    setView(LAYOUT_MODE.pick);
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

  setView(LAYOUT_MODE.crop);

  // Before the picked image is loaded, the done button is disabled
  // to avoid users picking a black/empty image.
  $('crop-done-button').disabled = true;
  photodb.getFile(pickedFile.name, function(file) {
    cropURL = URL.createObjectURL(file);

    var previewURL;
    var previewData = pickedFile.metadata.preview;
    if (!previewData) {
      // If there is no preview at all, this is a small image and
      // it is its own preview. Just crop with the full-size image
      startCrop();
    }
    else if (previewData.filename) {
      // If there is an external preview file, use that. This means that
      // the EXIF preview was not big enough
      var storage = navigator.getDeviceStorage('pictures');
      var getreq = storage.get(previewData.filename);
      getreq.onsuccess = function() {
        startCrop(URL.createObjectURL(getreq.result));
      };
      // If we fail to get the preview file, just use the full-size image
      getreq.onerror = function() {
        startCrop();
      };
    }
    else {
      // Otherwise, use the internal EXIF preview.
      // This should be the normal case.
      startCrop(URL.createObjectURL(file.slice(previewData.start,
                                               previewData.end,
                                               'image/jpeg')));
    }

    function startCrop(previewURL) {
      cropEditor = new ImageEditor(cropURL, $('crop-frame'), {},
                                   cropEditorReady, previewURL);
    }

    function cropEditorReady() {
      // Enable the done button so that users can finish picking image.
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
    }
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
  setView(LAYOUT_MODE.list);
}

// XXX If the user goes to the homescreen or switches to another app
// the pick request is implicitly cancelled
// Remove this code when https://github.com/mozilla-b2g/gaia/issues/2916
// is fixed and replace it with an onerror handler on the activity to
// switch out of pickView.
window.addEventListener('visibilitychange', function() {
  if (document.hidden && pendingPick)
    cancelPick();
});


//
// Event handlers
//

// Clicking on a thumbnail does different things depending on the view.
// 1. On pickView -> go to cropMode
// 2. On large/selectView -> update preview image
// 3. On tiny/large with listView -> go to fullscreen image
function thumbnailClickHandler(evt) {
  var target = evt.target;
  if (!target || !target.classList.contains('thumbnail'))
    return;

  var index = getFileIndex(target.dataset.filename);
  if (currentView === LAYOUT_MODE.pick && index >= 0) {
      cropPickedImage(files[index]);
  } else if (currentView === LAYOUT_MODE.select) {
    updateSelection(target);
  } else {
    loader.load('js/frame_scripts.js', function() {
      if (isPortrait || isPhone) {
        setView(LAYOUT_MODE.fullscreen);
      }
      showFile(index);
    });
  }
}

// On large screen, we outline the picture we're focusing on and
// update the currentFileIndex.
function updateFocusThumbnail(n) {
  var previousIndex = currentFileIndex;
  currentFileIndex = n;
  if (isPhone)
    return;

  // If file is delted on select mode, the currentFileIndex may
  // be the same as previousIndex. We need to hightlight it again.
  var newTarget =
    thumbnailList.thumbnailMap[files[currentFileIndex].name];
  if (newTarget)
    newTarget.htmlNode.classList.add('focus');

  if (previousIndex === currentFileIndex)
    return;
  var oldTarget =
    files[previousIndex] ?
    thumbnailList.thumbnailMap[files[previousIndex].name] :
    undefined;
  if (oldTarget)
    oldTarget.htmlNode.classList.remove('focus');
}

function clearSelection() {
  if (!isPhone) {
    // Clear preview screen on large device.
    clearFrames();
  }
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
  var index = getFileIndex(thumbnail.dataset.filename);
  if (index < 0)
    return;

  var filename = files[index].name;

  if (selected) {
    selectedFileNames.push(filename);
    // currentFileIndex point to the last selected fileIndex
    updateFocusThumbnail(index);
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
    if (!isPhone)
      showFile(currentFileIndex);
  }
  else {
    delete selectedFileNamesToBlobs[filename];
    var i = selectedFileNames.indexOf(filename);
    if (i !== -1)
      selectedFileNames.splice(i, 1);

    if (currentFileIndex === index && !isPhone) {
      if (i > 0) {
        // show the last selected image of selectedFileNames.
        var lastSelected = selectedFileNames[i - 1];
        var lastSelectedIndex = getFileIndex(lastSelected);
        updateFocusThumbnail(lastSelectedIndex);
        showFile(currentFileIndex);
      } else {
        // If selectedFileNames is empty, we clear preview
        // screen.
        clearFrames();
      }
    }
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

  Dialogs.confirm({
    message: navigator.mozL10n.get('delete-n-items?', {n: selected.length}),
    cancelText: navigator.mozL10n.get('cancel'),
    confirmText: navigator.mozL10n.get('delete'),
    danger: true
  }, function() { // onSuccess
    // deleteFile is O(n), so this loop is O(n*n). If used with really large
    // selections, it might have noticably bad performance.  If so, we
    // can write a more efficient deleteFiles() function.
    for (var i = 0; i < selected.length; i++) {
      selected[i].classList.toggle('selected');
      deleteFile(getFileIndex(selected[i].dataset.filename));
    }
    clearSelection();
  });
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
// As a workaround for Bug 961636, use resize event handler
// in place of screenlayoutchange event handler.
function resizeHandler() {
  isPortrait = ScreenLayout.getCurrentLayout('portrait');

  // In list view when video is playing, if user rotate screen from
  // landscape to portrait, the video pause.
  // Check if currentFrame is undefined for cases where frame_script.js
  // is not loaded e.g. if a user rotates phone
  // in list mode before opening an image.
  if (currentView === LAYOUT_MODE.list && isPortrait &&
      typeof currentFrame !== 'undefined' && currentFrame.video) {
    currentFrame.video.pause();
  }

  // We'll need to resize and reposition frames for below cases, since
  // the size of container has been changed.
  if (currentView === LAYOUT_MODE.fullscreen ||
      (!isPhone && !isPortrait &&
        (currentView === LAYOUT_MODE.list ||
          currentView === LAYOUT_MODE.select))) {
    resizeFrames();
    // We also have to reposition the frames to get the next and previous
    // frames the correct distance away from the current frame
    setFramesPosition();
  }
}

//
// Overlay messages
//
function showOverlay(id) {
  currentOverlay = id;
  Dialogs.showOverlay(id);
}

// XXX
// Until https://bugzilla.mozilla.org/show_bug.cgi?id=795399 is fixed,
// we have to add a dummy click event handler on the overlay in order to
// make it opaque to touch events. Without this, it does not prevent
// the user from interacting with the UI.
$('overlay').addEventListener('click', function dummyHandler() {});
