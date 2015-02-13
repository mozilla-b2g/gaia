'use strict';

// Layout Mode Transition:
// list <-> selection
// list <-> fullscreen player
// Note: the mode text is also used as css style.
const LAYOUT_MODE = {
  list: 'layout-list',
  selection: 'layout-selection',
  fullscreenPlayer: 'layout-fullscreen-player'
};

var dom = {};

var ids = ['thumbnail-list-view', 'thumbnails-bottom', 'thumbnail-list-title',
           'thumbnails', 'thumbnails-video-button', 'thumbnails-select-button',
           'thumbnail-select-view', 'thumbnails-delete-button',
           'thumbnails-share-button', 'thumbnails-select-top',
           'thumbnails-number-selected', 'player-view', 'spinner-overlay',
           'thumbnails-single-delete-button', 'thumbnails-single-share-button',
           'thumbnails-single-info-button', 'info-view', 'info-close-button',
           'player', 'overlay', 'overlay-title', 'overlay-text',
           'overlay-menu', 'overlay-action-button', 'player-header',
           'video-container', 'mediaControlsContainer', 'close', 'video-title',
           'throbber', 'picker-close', 'picker-title', 'picker-header',
           'picker-done', 'options', 'options-view', 'options-cancel-button',
           'in-use-overlay', 'in-use-overlay-title', 'in-use-overlay-text',
           'media-controls'];

ids.forEach(function createElementRef(name) {
  dom[toCamelCase(name)] = document.getElementById(name);
});

dom.player.mozAudioChannelType = 'content';

function $(id) { return document.getElementById(id); }

// if this is true then the video tag is showing
// if false, then the gallery is showing
var playerShowing = false;

var controlFadeTimeout = null;

// In thumbnailSelectView, we allow the user to select thumbnails.
// These variables hold the names of the selected files, and map those
// names to the corresponding File objects
var selectedFileNames = [];
var selectedFileNamesToBlobs = {};

var videodb;
var currentVideo;  // The data for the currently playing video
var currentVideoBlob; // The blob for the currently playing video
var firstScanEnded = false;

var THUMBNAIL_WIDTH;
var THUMBNAIL_HEIGHT;

// Enumerating the readyState for html5 video api
var HAVE_NOTHING = 0;

var storageState;
var currentOverlay;

// touch start id is the identifier of touch event. we only need to process
// events related to this id.
var thumbnailList;

var pendingPick;

// Before launching a share activity we may need to release the video hardware
// If so we need to remember the playback time so we can resume at the
// right time. See releaseVideo() and restoreVideo().
var videoHardwareReleased = false;
var restoreTime = null;

var isPhone;
var isPortrait;
var currentLayoutMode;

// When user entering fullscreen mode and rotate the screen, the text overflow
// calculation of video title should not be invoked. We pend this request when
// leaving fullscreen mode.
var pendingUpdateTitleText = false;

// Videos recorded by our own camera have filenames of this form
var FROMCAMERA = /DCIM\/\d{3}MZLLA\/VID_\d{4}\.3gp$/;

// We have a single instance of the loading checker because it is used
// across functions
var loadingChecker =
  new VideoLoadingChecker(dom.player, dom.inUseOverlay, dom.inUseOverlayTitle,
                          dom.inUseOverlayText);

// Pause on visibility change
document.addEventListener('visibilitychange', function visibilityChange() {
  if (document.hidden) {
    stopParsingMetadata();
    if (!dom.player.paused) {
      pause();
    }
  }
  else {
    if (playerShowing) {
      setControlsVisibility(true);
    } else {
      // We only start parsing metadata when player is not shown.
      startParsingMetadata();
    }
  }
});

navigator.mozL10n.once(function() {

  // Tell performance monitors that our chrome is visible
  window.performance.mark('navigationLoaded');
  window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

  init();

  // Tell performance monitors that our chrome is ready to interact with.
  window.performance.mark('navigationInteractive');
  window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
});

// we don't need to wait for l10n ready to have correct css layout.
initLayout();
initThumbnailSize();

if (!isPhone) {
  navigator.mozL10n.ready(function localizeThumbnailListTitle() {
    // reload the thumbnail list title field for tablet which is the app name.
    var req = navigator.mozApps.getSelf();
    req.onsuccess = function() {
      var manifest = new ManifestHelper(req.result.manifest);
      dom.thumbnailListTitle.textContent = manifest.name;
    };
  });
}

function init() {

  thumbnailList = new ThumbnailList(ThumbnailDateGroup, dom.thumbnails);
  // configure the template id for template group and view.
  ThumbnailDateGroup.Template = new Template('thumbnail-group-header');
  ThumbnailItem.Template = new Template('thumbnail-template');
  ThumbnailItem.titleMaxLines = isPhone ? 2 : (isPortrait ? 4 : 2);

  initDB();

  // if video is not start with activity mode, we need to wire all event
  // handlers.
  if (!navigator.mozHasPendingMessage('activity')) {
    // options button only needed by normal mode. if we are under pick activity,
    // there is only pick view enabled that is enabled at showPickView();
    initOptionsButtons();
  }

  initPlayerControls();

  // We get headphoneschange event when the headphones is plugged or unplugged
  var acm = navigator.mozAudioChannelManager;
  if (acm) {
    acm.addEventListener('headphoneschange', function onheadphoneschange() {
      // Pause video when headphones are unplugged (if video is playing)
      if (!acm.headphones && !dom.player.paused) {
        pause();
      }
    });
  }

  navigator.mozSetMessageHandler('activity', handleActivityEvents);

  // the overlay action button may be used in both normal mode and activity
  // mode, we need to wire its event handler here.
  dom.overlayActionButton.addEventListener('click', function() {
    if (pendingPick) {
      cancelPick();
    } else if (currentOverlay === 'empty') {
      launchCameraApp();
    }
  });
}

function initThumbnailSize() {
  // use devicePixelRatio as the scale ratio for thumbnail creation.
  if (isPhone) {
    THUMBNAIL_WIDTH = 210 * window.devicePixelRatio;
    THUMBNAIL_HEIGHT = 120 * window.devicePixelRatio;
  } else {
    var shortEdge = Math.min(window.innerWidth, window.innerHeight);
    THUMBNAIL_WIDTH = 424 * window.devicePixelRatio * shortEdge / 800;
    THUMBNAIL_HEIGHT = Math.round(THUMBNAIL_WIDTH * 4 / 7);
  }
}

function initLayout() {
  ScreenLayout.watch('portrait', '(orientation: portrait)');
  isPhone = ScreenLayout.getCurrentLayout('tiny');
  isPortrait = ScreenLayout.getCurrentLayout('portrait');

  // We need to disable video playing and show a loading spinner when the first
  // startup under tablet and landscape mode.
  if (isPhone || isPortrait) {
    dom.spinnerOverlay.classList.add('hidden');
    dom.playerView.classList.remove('disabled');
  } else {
    dom.spinnerOverlay.classList.remove('hidden');
    dom.playerView.classList.add('disabled');
  }

  // We handle the isPortrait calculation here, because window dispatches
  // multiple resize event with different width and height in Firefox nightly.
  window.addEventListener('screenlayoutchange', handleScreenLayoutChange);

  switchLayout(LAYOUT_MODE.list);
}

function initPlayerControls() {

  initVideoControls();

  // handle user tapping events
  dom.mediaControlsContainer.addEventListener('click',
                                              toggleVideoControls,
                                              true);
  dom.playerHeader.addEventListener('action', handleCloseButtonClick);
  dom.pickerDone.addEventListener('click', postPickResult);
  dom.options.addEventListener('click', showOptionsView);
}

function initVideoControls() {

  dom.mediaControls.initialize(dom.player);

  // Add listeners for video controls web component
  //
  // play, pause
  dom.mediaControls.addEventListener('play-button-click',
    handlePlayButtonClick);

  // Fullscreen button (tablet only)
  dom.mediaControls.addEventListener('fullscreen-button-click',
    toggleFullscreenPlayer);
}

function initOptionsButtons() {
  // button to switch to camera
  dom.thumbnailsVideoButton.addEventListener('click', launchCameraApp);
  // buttons for entering/exiting selection mode
  dom.thumbnailsSelectButton.addEventListener('click', showSelectView);
  dom.thumbnailsSelectTop.addEventListener('action', hideSelectView);
  // action buttons for selection mode
  dom.thumbnailsDeleteButton.addEventListener('click', deleteSelectedItems);
  dom.thumbnailsShareButton.addEventListener('click', shareSelectedItems);

  // info buttons
  dom.infoCloseButton.addEventListener('click', hideInfoView);
  // option button cancel
  dom.optionsCancelButton.addEventListener('click', hideOptionsView);

  // fullscreen toolbar
  addEventListeners('.single-delete-button', 'click', deleteCurrentVideo);
  addEventListeners('.single-share-button', 'click', shareCurrentVideo);
  addEventListeners('.single-info-button', 'click', showInfoView);
}

function addEventListeners(selector, type, listener) {
  var elements = document.body.querySelectorAll(selector);
  for (var i = 0; i < elements.length; i++) {
    elements[i].addEventListener(type, listener);
  }
}

function toggleFullscreenPlayer(e) {
  if (currentLayoutMode === LAYOUT_MODE.list) {
    switchLayout(LAYOUT_MODE.fullscreenPlayer);
    scheduleVideoControlsAutoHiding();
  } else {
    switchLayout(LAYOUT_MODE.list);
  }

  VideoUtils.fitContainer(dom.videoContainer, dom.player,
                          currentVideo.metadata.rotation || 0);
}

function toggleVideoControls(e) {
  // When we change the visibility state of video controls, we need to check the
  // timeout of auto hiding.
  if (controlFadeTimeout) {
    clearTimeout(controlFadeTimeout);
    controlFadeTimeout = null;
  }
  // We cannot change the visibility state of video contorls when we are in
  // picking mode.
  if (!pendingPick) {
    if (dom.mediaControls.hidden) {
      // If control not shown, tap any place to show it.
      setControlsVisibility(true);
      e.cancelBubble = true;
    } else if (e.originalTarget === dom.mediaControlsContainer) {
      // If control is shown, only tap the empty area should show it.
      setControlsVisibility(false);
    }
  }
}

function handleScreenLayoutChange() {
  // When resizing, we need to check the orientation change.
  isPortrait = ScreenLayout.getCurrentLayout('portrait');

  if (!isPhone) {
    // In tablet, the landscape mode will show player and list at the same time.
    // To keep only one hardware codec be used, we shows loading icon at the
    // player view before first batch of files scanned and all their metadata
    // are parsed.
    if (!isPortrait && (!firstScanEnded || processingQueue)) {
      // landscape mode and everything is waiting.
      dom.spinnerOverlay.classList.remove('hidden');
      dom.playerView.classList.add('disabled');
    } else {
      dom.spinnerOverlay.classList.add('hidden');
      dom.playerView.classList.remove('disabled');
    }
    // We need to hide player when rotating to portrait which release video
    // element and load the video into player when rotating to landscape.
    if (currentLayoutMode === LAYOUT_MODE.list) {
      if (isPortrait) {
        hidePlayer(true);
      } else {
        showPlayer(currentVideo, false, /* autoPlay */
                                 false, /* enterFullscreen */
                                 true); /* keepControls */
      }
    }
    // the maximum lines of title field is different in portrait or landscape
    // mode.
    ThumbnailItem.titleMaxLines = isPortrait ? 4 : 2;
  }

  // When layout mode is list or selection mode, we need to update all title
  // text to have correct ellipsis position. Otherwise, we update them when
  // leaving fullscreen mode.
  if (currentLayoutMode !== LAYOUT_MODE.fullscreenPlayer) {
    // XXX: to workaround bug 961636 which fires two resize event at the app
    // start-up,we need to check the existence of thumbnailList before using
    // it.
    if (!thumbnailList) {
      return;
    }
    thumbnailList.updateAllThumbnailTitles();
  } else {
    pendingUpdateTitleText = true;
  }

  // Rescale when window size changes. This should get called when
  // screen orientation changes
  if (dom.player.readyState !== HAVE_NOTHING) {
    VideoUtils.fitContainer(dom.videoContainer, dom.player,
                            currentVideo.metadata.rotation || 0);
  }
}

function switchLayout(mode) {
  var oldMode = currentLayoutMode;
  if (oldMode) {
    document.body.classList.remove(currentLayoutMode);
  }
  currentLayoutMode = mode;
  document.body.classList.add(currentLayoutMode);

  // Update title text when leaving fullscreen mode with pending task.
  if (oldMode === LAYOUT_MODE.fullscreenPlayer && pendingUpdateTitleText) {
    pendingUpdateTitleText = false;
    thumbnailList.updateAllThumbnailTitles();
  }
}

function handleActivityEvents(a) {
  var activityName = a.source.name;

  if (activityName === 'pick') {
    pendingPick = a;

    showPickView();
  }
}

function showInfoView() {
  hideOptionsView();
  //Get the length of the playing video
  var length = isFinite(currentVideo.metadata.duration) ?
      MediaUtils.formatDuration(currentVideo.metadata.duration) : '';
  //Get the video size
  var size = isFinite(currentVideo.size) ?
      MediaUtils.formatSize(currentVideo.size) : '';
  //Check if video type has prefix 'video/' e.g. video/mp4
  var type = currentVideo.type;
  if (type) {
    var index = currentVideo.type.indexOf('/');
    type = index > -1 ?
      currentVideo.type.slice(index + 1) : currentVideo.type;
  }
  //Get the resolution of the playing video
  var resolution = (currentVideo.metadata.width &&
      currentVideo.metadata.height) ? currentVideo.metadata.width + 'x' +
      currentVideo.metadata.height : '';
  //Create data object to fill in the fields of info overlay view
  var data = {
    'info-name': currentVideo.metadata.title,
    'info-length': length,
    'info-size': size,
    'info-type': type,
    'info-date': MediaUtils.formatDate(currentVideo.date),
    'info-resolution': resolution
  };

  //Populate info overlay view
  MediaUtils.populateMediaInfo(data);
  // We need to disable NFC sharing when showing info view
  setNFCSharing(false);
  //Show the video info view
  dom.infoView.classList.remove('hidden');
}

function hideInfoView() {
  // Enable NFC sharing when user hides info and returns to fullscreen mode
  setNFCSharing(true);
  dom.infoView.classList.add('hidden');
}

function showSelectView() {
  // In tablet landscape mode, the video player may be playing. When entering
  // selection mode, we need to hide player.
  hidePlayer(true, function() {
    switchLayout(LAYOUT_MODE.selection);

    // styling for select view
    thumbnailList.setSelectMode(true);

    clearSelection();
  });
}

function hideSelectView() {
  clearSelection();
  thumbnailList.setSelectMode(false);
  switchLayout(LAYOUT_MODE.list);
  if (!isPhone && !isPortrait && currentVideo) {
    // We need to load the video while restoring to list mode
    showPlayer(currentVideo, false, /* autoPlay */
                             false, /* enterFullscreen */
                             true); /* keepControls */
  }
}

function showOptionsView() {
  // If the user is about to share a video we should stop playing it because
  // sometimes we won't go to the background when the activity starts and
  // we keep playing. This will cause problems if the receiving app also tries
  // to play it. Similarly, if the user is going to delete the video there is
  // no point in continuing to play it. And if they care enough about it to
  // look for more info about it, they probably don't want to miss anything.
  if (!dom.player.paused) {
    pause();
  }
  dom.optionsView.classList.remove('hidden');
}

function hideOptionsView() {
  dom.optionsView.classList.add('hidden');
}

function clearSelection() {
  // Clear the selection, if there is one
  Array.forEach(selectedFileNames, function(name) {
    thumbnailList.thumbnailMap[name].htmlNode.classList.remove('selected');
  });
  selectedFileNames = [];
  selectedFileNamesToBlobs = {};
  dom.thumbnailsDeleteButton.classList.add('disabled');
  dom.thumbnailsShareButton.classList.add('disabled');
  dom.thumbnailsNumberSelected.textContent =
    navigator.mozL10n.get('number-selected2', { n: 0 });
}

// When we enter thumbnail selection mode, or when the selection changes
// we call this function to update the message the top of the screen and to
// enable or disable the Delete and Share buttons
function updateSelection(videodata) {
  var thumbnail = thumbnailList.thumbnailMap[videodata.name];

  var selected;
  // First, update the visual appearance of the element
  if (thumbnail.htmlNode.classList.contains('selected')) {
    thumbnail.htmlNode.classList.remove('selected');
    selected = false;
  } else {
    thumbnail.htmlNode.classList.add('selected');
    selected = true;
  }

  // Now update the list of selected filenames and filename->blob map
  // based on whether we selected or deselected the thumbnail
  var filename = videodata.name;
  if (selected) {
    selectedFileNames.push(filename);
    videodb.getFile(filename, function(blob) {
      selectedFileNamesToBlobs[filename] = blob;
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
  dom.thumbnailsNumberSelected.textContent =
    navigator.mozL10n.get('number-selected2', { n: numSelected });

  if (numSelected === 0) {
    dom.thumbnailsDeleteButton.classList.add('disabled');
    dom.thumbnailsShareButton.classList.add('disabled');
  }
  else {
    dom.thumbnailsDeleteButton.classList.remove('disabled');
    dom.thumbnailsShareButton.classList.remove('disabled');
  }
}

function launchCameraApp() {
  var a = new MozActivity({
    name: 'record',
    data: {
      type: 'videos'
    }
  });
}

// We need to call resetCurrentVideo before deleting a video. The variable
// currentVideo is used as the last or current playing video. We need to change
// the current video to preview one, next one or null.
function resetCurrentVideo() {
  // no currentVideo means there is no video in the list, we don't need to focus
  // any one.
  if (!currentVideo) {
    return;
  }
  var currentThumbnail = thumbnailList.thumbnailMap[currentVideo.name];
  currentThumbnail.htmlNode.classList.remove('focused');
  var nextThumbnail = thumbnailList.findNextThumbnail(currentVideo.name);

  if (nextThumbnail) {
    // set focused to current thumbnail and update current video
    currentVideo = nextThumbnail.data;
    nextThumbnail.htmlNode.classList.add('focused');
  } else {
    // no more videos and a dialog will be shown when we delete the video.
    currentVideo = null;
  }
}

function deleteSelectedItems() {
  if (selectedFileNames.length === 0)
    return;
  LazyLoader.load('shared/style/confirm.css', function() {

    Dialogs.confirm({
      messageId: 'delete-n-items?',
      messageArgs: {n: selectedFileNames.length},
      cancelId: 'cancel',
      confirmId: 'delete',
      danger: true
    }, function() { // onSuccess
      // deleteFile is O(n), so this loop is O(n*n). If used with really large
      // selections, it might have noticably bad performance.  If so, we
      // can write a more efficient deleteFiles() function.
      for (var i = 0; i < selectedFileNames.length; i++) {
        deleteFile(selectedFileNames[i]);
      }
      clearSelection();
    });
  });
}

function deleteFile(filename) {
  // Delete the file from the MediaDB. This removes the db entry and
  // deletes the file in device storage. This will generate an change
  // event which will call imageDeleted()

  if (FROMCAMERA.test(filename)) {
      // If we're deleting a video file recorded by our camera,
      // we also need to delete the poster image associated with
      // that video.
      var postername = filename.replace('.3gp', '.jpg');
      navigator.getDeviceStorage('pictures'). delete(postername);
  }

  // Whether or not there was a poster file to delete, delete the
  // actual video file. This will cause the MediaDB to send a 'deleted'
  // event, and the handler for that event will call videoDeleted() below.
  videodb.deleteFile(filename);
}

// Clicking on the share button in select mode shares all selected images
function shareSelectedItems() {
  var blobs = selectedFileNames.map(function(name) {
    return selectedFileNamesToBlobs[name];
  });
  share(blobs);
}

// function from gallery/js/gallery.js
function share(blobs) {
  if (blobs.length === 0)
    return;

  var names = [], fullpaths = [];

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
  });

  if (playerShowing) {
    releaseVideo();
  }

  var a = new MozActivity({
    name: 'share',
    data: {
      type: 'video/*', // Video app only supports video types (bug 1069885)
      number: blobs.length,
      blobs: blobs,
      filenames: names,
      filepaths: fullpaths
    }
  });

  a.onsuccess = restoreVideo;

  a.onerror = function(e) {
    if (a.error.name === 'NO_PROVIDER') {
      var msg = navigator.mozL10n.get('share-noprovider');
      alert(msg);
    } else {
      console.warn('share activity error:', a.error.name);
    }
    restoreVideo();
  };
}

function updateDialog() {
  if (thumbnailList.count !== 0 && (!storageState || playerShowing)) {
    showOverlay(null);
  } else if (storageState === MediaDB.UPGRADING) {
    showOverlay('upgrade');
  } else if (storageState === MediaDB.NOCARD) {
    showOverlay('nocard');
  } else if (storageState === MediaDB.UNMOUNTED) {
    showOverlay('pluggedin');
  } else if (firstScanEnded &&
             thumbnailList.count === 0 &&
             metadataQueue.length === 0) {
    showOverlay('empty');
  }
}

function updateLoadingSpinner() {
  // We show a loading spinner in tablet and landscape mode while first
  // scanning of mediadb. When mediadb scanned and metadata parser parsed, we
  // hide the loading spinner.
  if (processingQueue) {
    noMoreWorkCallback = updateLoadingSpinner;
  } else {
    window.performance.mark('scanEnd');
    PerformanceTestingHelper.dispatch('scan-finished');
    dom.spinnerOverlay.classList.add('hidden');
    dom.playerView.classList.remove('disabled');
    if (thumbnailList.count) {
      // Initialize currentVideo to first video item if it doesn't have a value.
      currentVideo = currentVideo ||
                     thumbnailList.itemGroups[0].thumbnails[0].data;
      // Load current video to player when we are in tablet and landscape.
      if (!isPhone && !isPortrait) {
        showPlayer(currentVideo, false, /* autoPlay */
                                 false, /* enterFullscreen */
                                 true); /* keepControls */
      }
    }
  }
}

function thumbnailClickHandler(videodata) {
  if (!isPhone && !isPortrait) {
    // if the screen is large and landscape, we need to lock the operations
    // while scanning and metadata parsing.
    if (!firstScanEnded || processingQueue) {
      return;
    }
  }

  if (currentLayoutMode === LAYOUT_MODE.list) {

    // The player is shown at landscape mode of tablet. We need to save the
    // playing state before change to another video. Calling hidePlayer(true)
    // can stop the video and save the state and hide everything.
    // Calling hidePlayer(true) also releases hardware codec. And metadata
    // parser can parse at least one video file.
    hidePlayer(true, function() {
      // Be certain that metadata parsing has stopped before we show the
      // video player. Otherwise, we'll have contention for the video hardware
      stopParsingMetadata(function() {
        var fullscreen = pendingPick || isPhone || isPortrait;
        showPlayer(videodata, !pendingPick, fullscreen, pendingPick);
      });
    });
  }
  else if (currentLayoutMode === LAYOUT_MODE.selection) {
    updateSelection(videodata);
  }
}

function setPosterImage(dom, poster) {
  if (dom.dataset.uri) {
    URL.revokeObjectURL(dom.dataset.uri);
  }
  dom.dataset.uri = URL.createObjectURL(poster);
  dom.style.backgroundImage = 'url(' + dom.dataset.uri + ')';
}

function showOverlay(id) {
  LazyLoader.load('shared/style/confirm.css', function() {
    currentOverlay = id;

    if (id === null) {
      dom.overlay.classList.add('hidden');
      return;
    }

    var _ = navigator.mozL10n.get;
    var text, title;

    if (pendingPick || id === 'empty') {
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');
      dom.overlayActionButton.setAttribute('data-l10n-id',
                                           pendingPick ?
                                             'overlay-cancel-button' :
                                             'overlay-camera-button');
    } else {
      dom.overlayMenu.classList.add('hidden');
      dom.overlayActionButton.classList.add('hidden');
    }

    if (id === 'nocard') {
      title = 'nocard2-title';
      text = 'nocard3-text';
    } else {
      title = id + '-title';
      text = id + '-text';
    }

    dom.overlayTitle.setAttribute('data-l10n-id', title);
    dom.overlayText.setAttribute('data-l10n-id', text);
    dom.overlay.classList.remove('hidden');
  });
}

function setControlsVisibility(visible) {

  // in tablet landscape mode, we always shows controls in list layout. We
  // don't need to hide it.
  if (isPhone || isPortrait ||
      currentLayoutMode !== LAYOUT_MODE.list) {
    dom.mediaControlsContainer.classList[visible ? 'remove' : 'add']('hidden');

    // Let the media controls know whether it is visible
    dom.mediaControls.hidden = !visible;

  } else {
    // always set it as shown.
    dom.mediaControls.hidden = false;
  }
}

function setVideoPlaying() {
  if (dom.player.paused) {
    play();
  } else {
    pause();
  }
}

function deleteCurrentVideo() {
  hideOptionsView();
  // We need to disable NFC sharing when showing delete confirmation dialog
  setNFCSharing(false);

  LazyLoader.load('shared/style/confirm.css', function() {
    // If we're deleting the file shown in the player we've got to
    // return to the thumbnail list. We pass false to hidePlayer() to tell it
    // not to record new metadata for the file we're about to delete.
    Dialogs.confirm({
      messageId: 'delete-video?',
      cancelId: 'cancel',
      confirmId: 'delete',
      danger: true
    }, function _onSuccess() { // onSuccess
      deleteFile(currentVideo.name);
      if (!isPhone && !isPortrait) {
        // If the file is deleted, we need to load another video file. This is
        // only required at tablet and landscape mode. When there is no video in
        // video app, the currentVideo is null and the overlay is shown.
        if (currentVideo) {
          showPlayer(currentVideo, false, true, true);
        }
      } else {
        hidePlayer(false);
      }
    }, function _onError() {
       // Enable NFC sharing when cancels delete and returns to fullscreen mode
       setNFCSharing(true);
    });
  });
}

function handlePlayButtonClick() {
  setVideoPlaying();
}

function handleCloseButtonClick() {
  if (isPhone || isPortrait) {
    hidePlayer(true);
  } else {
    // In tablet and landscape mode, close is view as a button to go back to
    // player mode. And close button is only shown at fullscreen mode when it
    // is tablet and landscape.
    toggleFullscreenPlayer();
  }
}

function postPickResult() {
  pendingPick.postResult({
    type: currentVideoBlob.type,
    blob: currentVideoBlob
  });
  cleanupPick();
}

function shareCurrentVideo() {
  hideOptionsView();
  videodb.getFile(currentVideo.name, function(blob) {
    share([blob]);
  });
}

function setVideoUrl(player, video, callback) {

  function handleLoadedMetadata() {
    // We only want the 'loadedmetadata' handler to execute when the video
    // app explicitly loads a video. To prevent unwanted side affects, for
    // example, when the video app is sent to the background and then to the
    // foreground, where gecko sends a 'loadedmetadata' event (among others),
    // we clear the 'loadedmetadata' event handler after the event fires.
    dom.player.onloadedmetadata = null;
    callback();
  }

  function loadVideo(url) {
    loadingChecker.ensureVideoLoads(handleLoadedMetadata);
    player.src = url;
  }

  if ('name' in video) {
    videodb.getFile(video.name, function(file) {
      var url = URL.createObjectURL(file);
      loadVideo(url);

      if (pendingPick)
        currentVideoBlob = file;
    });
  } else if ('url' in video) {
    loadVideo(video.url);
  }
}

function scheduleVideoControlsAutoHiding() {
  controlFadeTimeout = setTimeout(function() {
    setControlsVisibility(false);
  }, 250);
}

function setNFCSharing(enable) {
  if (!window.navigator.mozNfc) {
    return;
  }

  if (enable) {
    // If we have NFC, we need to put the callback to have shrinking UI.
    window.navigator.mozNfc.onpeerready = function(event) {
      // The callback function is called when user confirm to share the
      // content, send it with NFC Peer.
      videodb.getFile(currentVideo.name, function(file) {
        event.peer.sendFile(file);
      });
    };
  } else {
    // We need to remove onpeerready while out of fullscreen view.
    window.navigator.mozNfc.onpeerready = null;
  }
}

// show video player
function showPlayer(video, autoPlay, enterFullscreen, keepControls) {
  if (currentVideo) {
    var old = thumbnailList.thumbnailMap[currentVideo.name];
    old.htmlNode.classList.remove('focused');
  }
  currentVideo = video;
  var thumbnail = thumbnailList.thumbnailMap[currentVideo.name];
  thumbnail.htmlNode.classList.add('focused');

  // switch to the video player view
  updateDialog();
  dom.player.preload = 'metadata';

  function doneSeeking() {
    dom.player.onseeked = null;
    setControlsVisibility(true);

    if (!keepControls) {
      scheduleVideoControlsAutoHiding();
    }

    if (autoPlay) {
      play();
    } else {
      pause();
    }

    //show video player after seeking is done
    dom.player.hidden = false;
  }

  //hide video player before setVideoUrl
  dom.player.hidden = true;
  setVideoUrl(dom.player, currentVideo, function() {

    if (enterFullscreen) {
      switchLayout(LAYOUT_MODE.fullscreenPlayer);
    }

    playerShowing = true;

    var rotation;
    if ('metadata' in currentVideo) {
      if (currentVideo.metadata.currentTime === dom.player.duration) {
        currentVideo.metadata.currentTime = 0;
      }
      dom.videoTitle.textContent = currentVideo.metadata.title;
      dom.player.currentTime = currentVideo.metadata.currentTime || 0;
      rotation = currentVideo.metadata.rotation;
    } else {
      dom.videoTitle.textContent = currentVideo.title || '';
      dom.player.currentTime = 0;
      rotation = 0;
    }

    VideoUtils.fitContainer(dom.videoContainer, dom.player,
                            rotation || 0);

    if (dom.player.seeking) {
      dom.player.onseeked = doneSeeking;
    } else {
      doneSeeking();
    }
    // Enable NFC sharing in fullscreen player mode
    setNFCSharing(true);
  });
}

function hidePlayer(updateVideoMetadata, callback) {
  if (!playerShowing) {
    if (callback) {
      callback();
    }
    return;
  }

  dom.player.pause();
  // Disable NFC sharing when leaving player mode
  setNFCSharing(false);

  function completeHidingPlayer() {
    // switch to the video gallery view
    switchLayout(LAYOUT_MODE.list);

    playerShowing = false;
    updateDialog();

    // The video is no longer being played; unload the it.
    dom.player.removeAttribute('src');
    dom.player.load();

    // Now that we're done using the video hardware to play a video, we
    // can start using it to parse metadata again, if we need to.
    startParsingMetadata();
    if (callback) {
      callback();
    }
  }

  if (!('metadata' in currentVideo) || !updateVideoMetadata || pendingPick) {
    completeHidingPlayer();
    return;
  }

  var video = currentVideo;
  var thumbnail = thumbnailList.thumbnailMap[video.name];

  // If we reached the end of the video, then currentTime will have gone
  // back to zero. If that is the case then we want to erase any bookmark
  // image from the metadata and revert to the original poster image.
  // Otherwise, if we've stopped in the middle of a video, we need to
  // capture the current frame to use as a new bookmark. In either case
  // we call updateMetadata() to update the thumbnail and update this and
  // other modified metadata.
  if (dom.player.currentTime === 0) {
    video.metadata.bookmark = null; // Don't use delete here
    updateMetadata();
  }
  else {
    captureFrame(dom.player, video.metadata, function(bookmark) {
      video.metadata.bookmark = bookmark;
      updateMetadata();
    });
  }

  function updateMetadata() {
    // Update the thumbnail image for this video
    thumbnail.updatePoster(video.metadata.bookmark || video.metadata.poster);

    // If this is the first time the video was watched, record that it has
    // been watched now and update the corresponding document element.
    if (!video.metadata.watched) {
      video.metadata.watched = true;
      thumbnail.setWatched(true);
    }

    // Remember the current time so we can resume playback at this point
    video.metadata.currentTime = dom.player.currentTime;

    // Save the new metadata to the db, but don't wait for it to complete
    videodb.updateMetadata(video.name, video.metadata);

    // Finally, we can switch back to the thumbnails now
    completeHidingPlayer();
  }
}

function play() {
  loadingChecker.ensureVideoPlays();

  // Start recording statistics
  //
  // This requires getVideoPlaybackQuality() to be enabled
  // on the video element which can be achieved
  // by setting the media.mediasource.enabled pref to true.
  VideoStats.start(dom.player);

  dom.player.play();
}

function pause() {
  loadingChecker.cancelEnsureVideoPlays();

  // Stop playing the video
  dom.player.pause();

  //stop recording statistics and print them
  VideoStats.stop();
  VideoStats.dump();
}

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}

//
// Pick activity
//
function showPickView() {
  thumbnailList.setPickMode(true);
  document.body.classList.add('pick-activity');

  dom.pickerHeader.addEventListener('action', cancelPick);

  // In tablet, landscape mode, the pick view will have different UI from normal
  // view.
  if (!isPhone && !isPortrait) {
    // update all title text when rotating.
    thumbnailList.updateAllThumbnailTitles();
  }
}

function cancelPick() {
  pendingPick.postError('pick cancelled');
  cleanupPick();
}

function cleanupPick() {
  pendingPick = null;
  currentVideoBlob = null;
  hidePlayer(false);
}

function showThrobber() {
  dom.throbber.classList.remove('hidden');
  dom.throbber.classList.add('throb');
}

function hideThrobber() {
  dom.throbber.classList.add('hidden');
  dom.throbber.classList.remove('throb');
}

// This function unloads the current video to release the decoder
// hardware.  We use it when invoking a share activity because if the
// share activity is inline, then we won't go to the background and
// the receiving app won't be able to play the video.
function releaseVideo() {
  if (videoHardwareReleased) {
    return;
  }
  videoHardwareReleased = true;

  // readyState = 0: no metadata loaded, we don't need to save the currentTime
  // of player. It is always 0 and can't be used to restore the state of video.
  if (dom.player.readyState > 0) {
    restoreTime = dom.player.currentTime;
  }
  else {
    restoreTime = 0;
  }
  dom.player.removeAttribute('src');
  dom.player.load();
}

// We call this to load and seek the video again when the share activity
// is complete.
function restoreVideo() {
  if (!videoHardwareReleased) {
    return;
  }
  videoHardwareReleased = false;

  // When restoreVideo is called, we assume we have currentVideo because the
  // playerShowing is true.
  setVideoUrl(dom.player, currentVideo, function() {
    VideoUtils.fitContainer(dom.videoContainer, dom.player,
                            currentVideo.metadata.rotation || 0);
    dom.player.currentTime = restoreTime;
  });
}

//
// Bug 1088456: when the view activity is launched by the bluetooth transfer
// app (when the user taps on a downloaded file in the notification tray) the
// view.html file can be launched while index.html is still running as the
// foreground app. Since the video app does not get sent to the background in
// this case, the currently playing video (if there is one) is not
// unloaded. And so, in the case of videos that require decoder hardware, the
// view activity cannot play the video. For this workaround, we have view.js
// set a localStorage property when it starts. And here we listen for changes
// to that property. When we see a change we unload the video so that the view
// activity can play its video. We intentionally do not make any effort to
// automatically restart the video.
//
// Bug 1085212: if we already released the video hardware (when starting a
// share activity) then we don't need to respond to this localStorage hack.
//
window.addEventListener('storage', function(e) {
  if (e.key === 'view-activity-wants-to-use-hardware' && e.newValue &&
      !document.hidden && playerShowing && !videoHardwareReleased) {
    console.log('The video app view activity needs to play a video.');
    console.log('Pausing the video and returning to the thumbnails.');
    console.log('See bug 1088456.');
    handleCloseButtonClick();
  }
});
