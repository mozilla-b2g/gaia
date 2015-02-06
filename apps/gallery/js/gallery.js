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

var isInitThumbnail = false;

// If we're doing a pick activity, this variable will be true
var picking = (window.location.href === '#pick');

// Flag that indicates that we've edited a picture and just saved it
var justSavedEditedImage = false;

// We store the last focused thumbnail so that we can quickly get the
// selected thumbnails.
var lastFocusedThumbnail = null;

// Have we completed our first scan yet?
var firstScanDone = false;

// mozL10n.once is the main entry point for the app.
navigator.mozL10n.once(function showBody() {
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');

  // Tell performance monitors that our chrome is visible
  window.performance.mark('navigationLoaded');
  window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

  // load frame_script.js for preview mode and show loading background
  if (!isPhone) {
    LazyLoader.load('js/frame_scripts.js');
  }

  // Now initialize the rest of the app.
  init();
});

function init() {
  // Clicking on the select button goes to thumbnail select mode
  $('thumbnails-select-button').onclick =
    setView.bind(null, LAYOUT_MODE.select);

  // Clicking on the cancel button goes from thumbnail select mode
  // back to thumbnail list mode
  $('selected-header').addEventListener('action',
    setView.bind(null, LAYOUT_MODE.list));

  if (!isPhone) {
    $('fullscreen-toolbar-header').addEventListener('action', function() {
      setView(LAYOUT_MODE.list);
    });
  }

  // The camera buttons should launch the camera app
  fullscreenButtons.camera.onclick = launchCameraApp;

  $('thumbnails-camera-button').onclick = launchCameraApp;
  Overlay.addEventListener('camera', launchCameraApp);

  // Clicking on the delete button in thumbnail select mode deletes all
  // selected items
  $('thumbnails-delete-button').onclick = deleteSelectedItems;

  // Clicking on the share button in select mode shares all selected images
  $('thumbnails-share-button').onclick = shareSelectedItems;

  Overlay.addEventListener('cancel', function() {
    if (picking) {
      Pick.cancel();
    }
  });

  // Handle resize events
  window.onresize = resizeHandler;

  // Tell performance monitors that our chrome is ready to interact with.
  window.performance.mark('navigationInteractive');
  window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));

  // Finish initialization of the MediaDB object
  finishDBInitialization();

  // If we were not invoked by an activity, then start off in thumbnail
  // list mode, and fire up the MediaDB object.
  if (!picking) {
    setView(LAYOUT_MODE.list);
  }

  // Register a handler for activities. This will take care of the rest
  // of the initialization process.
  navigator.mozSetMessageHandler('activity', function activityHandler(a) {
    var activityName = a.source.name;
    switch (activityName) {
    case 'browse':
      // The 'browse' activity is the way we launch Gallery from Camera.
      //
      // If the gallery was already running we we arrived here via a
      // browse activity, then the user is probably coming to us from the
      // camera, and she probably wants to see the list of thumbnails.
      // If we're currently displaying a single image, switch to the
      // thumbnails. But if the user left the gallery in the middle of
      // an edit or in the middle of making a selection, then returning
      // to the thumbnail list would cause her to lose work, so in those
      // cases we don't change anything and let the gallery resume where
      // the user left it.  See Bug 846220.
      if (!currentView || currentView === LAYOUT_MODE.fullscreen) {
        setView(LAYOUT_MODE.list);
      }
      break;
    case 'pick':
      LazyLoader.load('js/pick.js', function() { Pick.start(a); });
      break;
    }
  });
}


//
// We create the MediaDB in startDBInitialization() and let it start
// getting itself ready. But we don't add event handlers to it in that
// function because the event handlers typically manipulate the DOM and
// the DOM may not be ready yet. So once the DOM is ready and localized
// we call this function to set the event handlers. By the time we get
// here we may have missed an event, so after setting the handlers, we
// check the current state of the MediaDB object and call whichever
// handler we missed.
//
function finishDBInitialization() {
  // show dialog in upgradestart, when it finished, it will turned to ready.
  photodb.onupgrading = function(evt) {
    Overlay.show('upgrade');
  };

  // This is called when DeviceStorage becomes unavailable because the
  // sd card is removed or because it is mounted for USB mass storage
  // This may be called before onready if it is unavailable to begin with
  // We don't need one of these handlers for the video db, since both
  // will get the same event at more or less the same time.
  photodb.onunavailable = function() {
    // Switch back to the thumbnail view unless it is a pick activity.
    // If we were viewing or editing an image it might not be there
    // anymore when the MediaDB becomes available again.
    if (!picking) {
      setView(LAYOUT_MODE.list);
    } else {
      Pick.restart();
    }

    // If storage becomes unavailble (e.g. the user starts a USB Mass Storage
    // Lock the user out of the app, and tell them why
    var why = photodb.state;
    if (why === MediaDB.NOCARD)
      Overlay.show('nocard');
    else if (why === MediaDB.UNMOUNTED)
      Overlay.show('pluggedin');
  };

  photodb.onready = function() {
    // Hide the nocard or pluggedin overlay if it is displayed
    if (Overlay.current === 'nocard' || Overlay.current === 'pluggedin' ||
        Overlay.current === 'upgrade')
      Overlay.hide();

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

    if (Overlay.current === 'scanning')
      Overlay.show('emptygallery');
    else if (!isPhone && !currentFrame.displayingImage &&
             !currentFrame.displayingVideo) {
      // focus on latest one if client hasn't clicked any of
      // them
      showFile(0);
    }

    // Hide the scanning indicator
    $('progress').classList.add('hidden');
    $('throbber').classList.remove('throb');

    // If this was the first scan after startup, then tell
    // performance monitors that the app is finally fully loaded and stable.
    if (!firstScanDone) {
      firstScanDone = true;
      window.performance.mark('fullyLoaded');
      window.dispatchEvent(new CustomEvent('moz-app-loaded'));
    }
  };

  // On devices with internal and external device storage, this handler is
  // triggered when the user removes the sdcard. MediaDB remains usable
  // and we'll get a bunch of deleted events for the files that are no longer
  // available. But we need to listen to this event so we can switch back
  // to the list of thumbnails. We don't want to be left viewing or editing
  // a photo that is no longer available.
  photodb.oncardremoved = function oncardremoved() {
    // If the user pulls the sdcard while trying to pick an image, give up
    if (picking) {
      Pick.cancel();
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

  // XXX: remove this hack as part of fixing bug 1046995
  doNotScanInBackgroundHack(photodb);

  // If the mediadb is not still in its initial OPENING state then we
  // missed a "ready" or "unavailable" or "upgrading" event, and need
  // to call the appropriate handler now. Note that we don't start scanning
  // until after the ready event arrives and we enumerate the db, so it
  // is not possible for us to miss a scanstart or scanend events. And if
  // we miss a created or deleted event, the relevant files will be found
  // during the enumeration, so this is all we have to look for now

  switch (photodb.state) {
  case MediaDB.OPENING:
    // No events missed.
    break;

  case MediaDB.UPGRADING:
    photodb.onupgrading();
    break;

  case MediaDB.READY:
    console.log('missed ready event. calling handler now');
    photodb.onready();
    break;

  case MediaDB.NOCARD:
  case MediaDB.UNMOUNTED:
    photodb.onunavailable();
    break;
  }
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

// Return a Promise that resolves to the File object of the currently
// displayed image or video.
// XXX This function is temporarily added here as part of NFC
// refactoring, but will be moved into the model module.
function getCurrentFile() {
  return new Promise(function(resolve, reject) {
    var fileInfo = files[currentFileIndex];

    if (fileInfo.metadata.video) {
      getVideoFile(fileInfo.metadata.video, function(file) {
        resolve(file);
      });
    } else {
      // share photo
      photodb.getFile(fileInfo.name, function(file) {
        resolve(file);
      }, function(errmsg) {
        reject(errmsg);
      });
    }
  });
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
  if (isInitThumbnail) {
    photodb.scan();
    return;
  }

  isInitThumbnail = true;

  // configure the template id for template group
  ThumbnailDateGroup.Template = new Template('thumbnail-group-header');

  // For gallery group view initialise ThumbnailList object
  thumbnailList = new ThumbnailList(ThumbnailDateGroup, thumbnails);

  // Handle clicks on the thumbnails we're about to create
  thumbnails.addEventListener('click', thumbnailClickHandler);

  // We need to enumerate both the photo and video dbs and interleave
  // the files they return so that everything is in chronological order
  // from most recent to least recent.

  // Temporary arrays to hold enumerated files
  var batch = [];
  var batchsize = PAGE_SIZE;
  var firstBatchDisplayed = false;

  photodb.enumerate('date', null, 'prev', function(fileinfo) {
    if (fileinfo) {
      // For a pick activity, don't display videos
      if (picking && fileinfo.metadata.video)
        return;

      // Bug 1003036 fixed an issue where explicitly created preview
      // images could be saved with fractional sizes. We don't do that
      // anymore, but we still need to clean up existing bad data here.
      var metadata = fileinfo.metadata;
      if (metadata &&
          metadata.preview &&
          metadata.preview.filename) {
        metadata.preview.width = Math.floor(metadata.preview.width);
        metadata.preview.height = Math.floor(metadata.preview.height);
      }

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
    if (!firstBatchDisplayed) {
      firstBatchDisplayed = true;
      // Tell performance monitors that "above the fold" content is displayed
      // and is ready to interact with.
      window.performance.mark('visuallyLoaded');
      window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));
      window.performance.mark('contentInteractive');
      window.dispatchEvent(new CustomEvent('moz-content-interactive'));
    }
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
      Overlay.show('scanning');
    }

    // Send a custom event to performance monitors to note that we're done
    // enumerating the database at this point. We won't send the final
    // moz-app-loaded event until we're completely stable and have
    // finished scanning.
    window.performance.mark('mediaEnumerated');
    PerformanceTestingHelper.dispatch('media-enumerated');

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
    Overlay.show('emptygallery');
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
  // If the new file is a video and we're handling an image pick activity
  // then we won't display the new file.
  if (picking && fileinfo.metadata.video)
    return;

  // The fileinfo object that MediaDB sends us has a thumbnail blob in it,
  // fresh from the metadata parser. This blob has been stored in the db, but
  // the copy we have is still a memory-backed blob. We need to be using a
  // file backed blob here so that we don't leak memory if the user scans a
  // fresh sdcard full of hundreds of photos. So we go get the db record out
  // of the database. It should be an exact copy of what we already have,
  // except that the thumbnail will be file-backed instead of memory-backed.
  photodb.getFileInfo(fileinfo.name, function(fileinfo) {
    var insertPosition;

    // If we were showing the 'no pictures' overlay, hide it
    if (Overlay.current === 'emptygallery' || Overlay.current === 'scanning')
      Overlay.hide();

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
      if (justSavedEditedImage) {
        var banner = $('edit-copy-save-banner');
        showFile(0);
        navigator.mozL10n.setAttributes($('edit-copy-save-status'),
                                        'edit-copy-saved');
        banner.hidden = false;
        setTimeout(function() { banner.hidden = true; }, 3000);
      } else {
        showFile(currentFileIndex);
      }
    }
    justSavedEditedImage = false;
  });
}

// Make the thumbnail for image n visible
function scrollToShowThumbnail(n) {
  if (!files[n])
    return;
  var selector = 'img[data-filename="' + files[n].name + '"]';
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
      Array.forEach(thumbnails.querySelectorAll('.selected.thumbnailImage'),
                    function(elt) { elt.classList.remove('selected'); });
      // On large devices we need to display the new current file after deletion
      // But if we just deleted the last file then we don't do this
      if (!isPhone && currentFileIndex !== -1)
        showFile(currentFileIndex);
      break;
    case LAYOUT_MODE.fullscreen:
      if (!isPhone && (view === LAYOUT_MODE.list) && !isPortrait &&
          currentFileIndex !== -1) {
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
      if (currentView === LAYOUT_MODE.fullscreen) {
        // only do it when we back from fullscreen.
        NFC.unshare();
      }
      break;
    case LAYOUT_MODE.fullscreen:
      resizeFrames();
      NFC.share(getCurrentFile);
      break;
    case LAYOUT_MODE.select:
      clearSelection();
      // When entering select view, we pause the video
      if (!isPhone && currentFrame.video && !isPortrait)
        currentFrame.video.pause();
      break;
    case LAYOUT_MODE.edit:
      NFC.unshare();
      break;
  }

  // We reuse the fullscreen dom for preview and fullscreen dom,
  // so the title must be changed while switching
  if (!isPhone) {
    if (view !== LAYOUT_MODE.fullscreen) {
      $('fullscreen-title').setAttribute('data-l10n-id', 'preview');
    } else {
      $('fullscreen-title').setAttribute('data-l10n-id', 'gallery');
    }
  }
  // Remember the current view
  currentView = view;
}

//
// Event handlers
//

// Clicking on a thumbnail does different things depending on the view.
// 1. On pickView -> go to cropMode
// 2. On large/selectView -> update preview image
// 3. On tiny/large with listView -> go to fullscreen image
function thumbnailClickHandler(evt) {
  var target = evt.target;
  if (!target)
    return;

  // Bug 1106877 - Handle tap for clicks in gray area of containing
  // div for thumbnail images smaller than thumbnail container.
  target = target.classList.contains('thumbnail') ?
    target.firstElementChild : target;

  if (!target || !target.classList.contains('thumbnailImage'))
    return;

  var index = getFileIndex(target.dataset.filename);
  if (picking && currentView === LAYOUT_MODE.pick && index >= 0) {
      Pick.select(files[index]);
  } else if (currentView === LAYOUT_MODE.select) {
    updateSelection(target);
  } else {
    LazyLoader.load('js/frame_scripts.js', function() {
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
  if (isPhone || currentFileIndex === -1)
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
  navigator.mozL10n.setAttributes(
    $('thumbnails-number-selected'),
    'number-selected2',
    { n: 0 }
  );
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
  navigator.mozL10n.setAttributes(
    $('thumbnails-number-selected'),
    'number-selected2',
    { n: numSelected }
  );

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
  fullscreenButtons.camera.classList.add('disabled');
  $('thumbnails-camera-button').classList.add('disabled');
  $('overlay-camera-button').classList.add('disabled');

  var a = new MozActivity({
    name: 'record',
    data: {
      type: 'photos'
    }
  });

  // Wait 2000ms before re-enabling the Camera buttons to prevent
  // hammering them and causing a crash (Bug 957709)
  window.setTimeout(function() {
    fullscreenButtons.camera.classList.remove('disabled');
    $('thumbnails-camera-button').classList.remove('disabled');
    $('overlay-camera-button').classList.remove('disabled');
  }, 2000);
}

function deleteSelectedItems() {
  var selected = thumbnails.querySelectorAll('.selected.thumbnailImage');
  if (selected.length === 0)
    return;

  Dialogs.confirm({
    messageId: 'delete-n-items?',
    messageArgs: {n: selected.length},
    cancelId: 'cancel',
    confirmId: 'delete',
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
// Note: when sharing multiple items, we make no attempt to handle EXIF
// orientation in photos. So on devices (like Tarako) that rely on EXIF
// orientation in the camera app, we may be leaking images that will not
// work well on the web.
function shareSelectedItems() {
  var blobs = selectedFileNames.map(function(name) {
    return selectedFileNamesToBlobs[name];
  });
  share(blobs);
}

// Initiate a share activity for all of the Blobs in the blobs array.
// Usually these blobs are File objects, with names. But when sharing a
// single image, we sometimes pass an in-memory blob to handle EXIF orientation
// issues. In that case, use the second name argument for the unnamed blob
function share(blobs, blobName) {
  if (blobs.length === 0)
    return;

  var names = [], types = [], fullpaths = [];

  // Get the file name (minus path) and type of each blob
  blobs.forEach(function(blob) {
    var name = blob.name;

    // Special case for blobs that are not File objects
    if (!name && blobs.length === 1)
      name = blobName;

    // We try to fix Bug 814323 by using
    // current workaround of bluetooth transfer
    // so we will pass both filenames and fullpaths
    // The fullpaths can be removed after Bug 811615 is fixed
    fullpaths.push(name);
    // Discard the path, we just want the base name
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

// Change the thumbnails quality while scrolling using the scrollstart/scrollend
// events from shared/js/scroll_detector.js.
window.addEventListener('scrollstart', function onScrollStart(e) {
  thumbnails.classList.add('scrolling');
});

window.addEventListener('scrollend', function onScrollEnd(e) {
  thumbnails.classList.remove('scrolling');
});

/*
 * This is a temporary workaround to bug 1039943: when the user launches
 * the gallery and then switches to another app gallery's scanning and
 * thumbnail generation process can slow down foreground apps.
 *
 * For now, we address this by simply making the app exit if it goes to the
 * background while scanning and if the device has 256mb or less of memory.
 *
 * Bug 1046995 should fix this issue in a better way and when it does,
 * we should remove this function and the code that invokes it.
 */
function doNotScanInBackgroundHack(photodb) {
  const enoughMB = 512; // How much memory is enough to not do this hack?
  var memoryMB = 0;     // How much memory do we have?

  // Listen for visibilitychange events that happen when we go to the background
  window.addEventListener('visibilitychange', backgroundScanKiller);

  // Stop listening for those events when the scan is complete
  photodb.addEventListener('scanend', function() {
    window.removeEventListener('visibilitychange', backgroundScanKiller);
  });


  // This is what we do when we go to the background
  function backgroundScanKiller() {
    // If we're coming back to the foreground or if we already know that
    // we have enough memory, then do nothing here.
    if (!document.hidden || memoryMB >= enoughMB) {
      return;
    }

    // If we can't query our memory (i.e. this is the 1.4 Dolphin release)
    // then assume that we have low memory and exit
    if (!navigator.getFeature) {
      exit();
    }
    else {
      // Otherwise we're in release 2.0 or later and can actually query
      // how much memory we have.
      navigator.getFeature('hardware.memory').then(function(mem) {
        memoryMB = mem;
        if (memoryMB < enoughMB) {
          exit();
        }
      });
    }

    function exit() {
      // If we are still hidden and still scanning, then log a message
      // wait a bit for the log to be flushed, and then close the application
      if (document.hidden && photodb.scanning) {
        console.warn('[Gallery] exiting to avoid background scan.');
        setTimeout(function() {
          if (document.hidden) {
            window.close();
          }
          else {
            console.warn('[Gallery] now visible again, so not exiting');
          }
        }, 500);
      }
    }
  }
}
