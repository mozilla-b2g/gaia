'use strict';

var dom = {};

var ids = ['thumbnail-list-view', 'thumbnails-bottom',
           'thumbnails', 'thumbnails-video-button', 'thumbnails-select-button',
           'thumbnail-select-view',
           'thumbnails-delete-button', 'thumbnails-share-button',
           'thumbnails-cancel-button', 'thumbnails-number-selected',
           'fullscreen-view',
           'thumbnails-single-delete-button', 'thumbnails-single-share-button',
           'thumbnails-single-info-button', 'info-view', 'info-close-button',
           'player', 'overlay', 'overlay-title', 'overlay-text',
           'overlay-menu', 'storage-setting-button',
           'videoControls', 'videoBar', 'videoActionBar',
           'close', 'play', 'playHead', 'timeSlider', 'elapsedTime',
           'video-title', 'duration-text', 'elapsed-text', 'bufferedTime',
           'slider-wrapper', 'throbber', 'delete-video-button',
           'picker-header', 'picker-close', 'picker-title', 'picker-done'];

ids.forEach(function createElementRef(name) {
  dom[toCamelCase(name)] = document.getElementById(name);
});

var currentView = dom.thumbnailListView;

dom.player.mozAudioChannelType = 'content';

var playing = false;

// if this is true then the video tag is showing
// if false, then the gallery is showing
var playerShowing = false;

// keep the screen on when playing
var endedTimer;

// same thing for the controls
var controlShowing = false;
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

// use devicePixelRatio as the scale ratio for thumbnail creation.
var scaleRatio = (window.devicePixelRatio || 1);

var THUMBNAIL_WIDTH = 210 * scaleRatio;
var THUMBNAIL_HEIGHT = 120 * scaleRatio;

// Enumerating the readyState for html5 video api
var HAVE_NOTHING = 0;

var storageState;
var currentOverlay;

var dragging = false;
// touch start id is the identifier of touch event. we only need to process
// events related to this id.
var touchStartID = null;
var isPausedWhileDragging;
var sliderRect;
var thumbnailList;

var pendingPick;
// This app uses deprecated-hwvideo permission to access video decoding hardware
// But Camera and Gallery also need to use that hardware, and those three apps
// may only have one video playing at a time among them. So we need to be
// careful to relinquish the hardware when we are not visible.
var restoreTime;

// Videos recorded by our own camera have filenames of this form
var FROMCAMERA = /DCIM\/\d{3}MZLLA\/VID_\d{4}\.3gp$/;

// Pause on visibility change
document.addEventListener('visibilitychange', function visibilityChange() {
  if (document.hidden) {
    stopParsingMetadata();
    if (playing)
      pause();

    if (playerShowing)
      releaseVideo();
  }
  else {
    startParsingMetadata();
    if (playerShowing) {
      showVideoControls(true);
      restoreVideo();
    }
  }
});

window.addEventListener('localized', function initLocale() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});

navigator.mozL10n.ready(function initVideo() {
  // This function should be called once. According to the implementation of
  // mozL10n.ready, it may become the event handler of localized. So, we need to
  // prevent database re-initialize.
  // XXX: once bug 882592 is fixed, we should remove it and just call init.
  if (!videodb)
    init();
});

function init() {
  thumbnailList = new ThumbnailList(ThumbnailDateGroup, dom.thumbnails);
  // configure the template id for template group and view.
  ThumbnailDateGroup.Template = new Template('thumbnail-group-header');
  ThumbnailItem.Template = new Template('thumbnail-template');

  initDB();

  // if video is not start with activity mode, we need to wire all event
  // handlers.
  if (!navigator.mozHasPendingMessage('activity')) {
    // options button only needed by normal mode. if we are under pick activity,
    // there is only pick view enabled that is enabled at showPickView();
    initOptionsButtons();
  }

  initPlayerControls();

  // Rescale when window size changes. This should get called when
  // orientation changes
  window.addEventListener('resize', handleResize);

  // We get headphoneschange event when the headphones is plugged or unplugged
  var acm = navigator.mozAudioChannelManager;
  if (acm) {
    acm.addEventListener('headphoneschange', function onheadphoneschange() {
      if (!acm.headphones && playing) {
        setVideoPlaying(false);
      }
    });
  }

  // Click to open the media storage panel when the default storage is
  // unavailable.
  dom.storageSettingButton.addEventListener('click', launchSettingsApp);

  navigator.mozSetMessageHandler('activity', handleActivityEvents);
}

function initPlayerControls() {
  // handles buttons, slider dragging, and show/hide video controls
  dom.videoControls.addEventListener('touchstart', handlePlayerTouchStart);
  // handles slider dragging
  dom.videoControls.addEventListener('touchmove', handlePlayerTouchMove);
  dom.videoControls.addEventListener('touchend', handlePlayerTouchEnd);

  dom.player.addEventListener('timeupdate', timeUpdated);
  dom.player.addEventListener('ended', playerEnded);
}

function initOptionsButtons() {
  // button to switch to camera
  dom.thumbnailsVideoButton.addEventListener('click', launchCameraApp);
  // buttons for entering/exiting selection mode
  dom.thumbnailsSelectButton.addEventListener('click', showSelectView);
  dom.thumbnailsCancelButton.addEventListener('click', hideSelectView);
  // action buttons for selection mode
  dom.thumbnailsDeleteButton.addEventListener('click', deleteSelectedItems);
  dom.thumbnailsShareButton.addEventListener('click', shareSelectedItems);

  // buttons for player view.
  dom.thumbnailsSingleDeleteButton.addEventListener('click', function() {
    // If we're deleting the file shown in the player we've got to
    // return to the thumbnail list. We pass false to hidePlayer() to tell it
    // not to record new metadata for the file we're about to delete.
    if (deleteSingleFile(currentVideo.name))
      hidePlayer(false);
  });
  dom.thumbnailsSingleShareButton.addEventListener('click', function() {
    videodb.getFile(currentVideo.name, function(blob) {
      share([blob]);
    });
  });
  // info buttons
  dom.thumbnailsSingleInfoButton.addEventListener('click', showInfoView);
  dom.infoCloseButton.addEventListener('click', hideInfoView);
}

function handleResize(e) {
  if (dom.player.readyState !== HAVE_NOTHING) {
    setPlayerSize();
  }
  forceRepaintTitles();
}

function handleActivityEvents(a) {
  var activityName = a.source.name;

  if (activityName === 'pick') {
    pendingPick = a;

    showPickView();
  }
}

function showInfoView() {
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
  //Show the video info view
  dom.infoView.classList.remove('hidden');
}

function hideInfoView() {
  dom.infoView.classList.add('hidden');
}

function showSelectView() {
  dom.thumbnailListView.classList.add('hidden');
  dom.fullscreenView.classList.add('hidden');
  dom.thumbnailSelectView.classList.remove('hidden');
  currentView = dom.thumbnailSelectView;

  // styling for select view
  thumbnailList.setSelectMode(true);

  clearSelection();
}

function hideSelectView() {
  clearSelection();

  dom.fullscreenView.classList.add('hidden');
  dom.thumbnailSelectView.classList.add('hidden');
  dom.thumbnailListView.classList.remove('hidden');

  thumbnailList.setSelectMode(false);

  currentView = dom.thumbnailListView;
}

function clearSelection() {
  // Clear the selection, if there is one
  Array.forEach(selectedFileNames, function(name) {
    thumbnailList.thumbnailMap[name].setSelected(false);
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

  var selected = !thumbnail.isSelected();
  // First, update the visual appearance of the element
  thumbnail.setSelected(selected);

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

function launchSettingsApp() {
  var activity = new MozActivity({
    name: 'configure',
    data: {
      target: 'device',
      section: 'mediaStorage'
    }
  });
}

function launchCameraApp() {
  var a = new MozActivity({
    name: 'record',
    data: {
      type: 'videos'
    }
  });
}

function deleteSelectedItems() {
  if (selectedFileNames.length === 0)
    return;

  var msg = navigator.mozL10n.get('delete-n-items?',
                                  {n: selectedFileNames.length});
  if (confirm(msg)) {
    // XXX
    // deleteFile is O(n), so this loop is O(n*n). If used with really large
    // selections, it might have noticably bad performance.  If so, we
    // can write a more efficient deleteFiles() function.
    for (var i = 0; i < selectedFileNames.length; i++) {
      deleteFile(selectedFileNames[i]);
    }
    clearSelection();
  }
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

function deleteSingleFile(file) {
  var msg = navigator.mozL10n.get('confirm-delete');
  if (confirm(msg + ' ' + file)) {
    if (FROMCAMERA.test(file)) {
      // If we're deleting a video file recorded by our camera,
      // we also need to delete the poster image associated with
      // that video.
      var postername = file.replace('.3gp', '.jpg');
      navigator.getDeviceStorage('pictures'). delete(postername); // gjslint
    }

    // Whether or not there was a poster file to delete, delete the
    // actual video file. This will cause the MediaDB to send a 'deleted'
    // event, and the handler for that event will call videoDeleted() below.
    videodb.deleteFile(file);
    return true;
  }

  return false;
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
    } else {
      console.warn('share activity error:', a.error.name);
    }
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

function thumbnailClickHandler(videodata) {
  if (currentView === dom.thumbnailListView ||
      currentView === dom.fullscreenView) {
    // Be certain that metadata parsing has stopped before we show the
    // video player. Otherwise, we'll have contention for the video hardware
    stopParsingMetadata(function() {
      showPlayer(videodata, !pendingPick);
    });
  }
  else if (currentView === dom.thumbnailSelectView) {
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
  currentOverlay = id;

  if (id === null) {
    dom.overlay.classList.add('hidden');
    return;
  }

  if (id === 'nocard') {
    dom.overlayMenu.classList.remove('hidden');
  } else {
    dom.overlayMenu.classList.add('hidden');
  }

  if (id === 'nocard') {
    dom.overlayTitle.textContent = navigator.mozL10n.get('nocard2-title');
    dom.overlayText.textContent = navigator.mozL10n.get('nocard2-text');
  } else {
    dom.overlayTitle.textContent = navigator.mozL10n.get(id + '-title');
    dom.overlayText.textContent = navigator.mozL10n.get(id + '-text');
  }
  dom.overlay.classList.remove('hidden');
}

function showVideoControls(visible) {
  dom.videoControls.classList[visible ? 'remove' : 'add']('hidden');
  controlShowing = visible;
  // to sync the slider under the case of auto-pause(unplugging headset), we
  // need to update the slider when controls is visible.
  if (visible) {
    updateVideoControlSlider();
  }
}

function updateVideoControlSlider() {
  var percent = (dom.player.currentTime / dom.player.duration) * 100;
  if (isNaN(percent)) {
    return;
  }

  percent += '%';

  dom.elapsedText.textContent =
                  MediaUtils.formatDuration(dom.player.currentTime);
  dom.elapsedTime.style.width = percent;
  // Don't move the play head if the user is dragging it.
  if (!dragging) {
    dom.playHead.style.left = percent;
  }
}

function setVideoPlaying(playing) {
  if (playing) {
    play();
  } else {
    pause();
  }
}

function handlePlayerTouchStart(event) {
  // If we have a touch start event, we don't need others.
  if (null != touchStartID) {
    return;
  }
  touchStartID = event.changedTouches[0].identifier;

  // If we interact with the controls before they fade away,
  // cancel the fade
  if (controlFadeTimeout) {
    clearTimeout(controlFadeTimeout);
    controlFadeTimeout = null;
  }
  if (!controlShowing) {
    showVideoControls(true);
    // preventDefault can prevent to dispatch click event to delete and share if
    // user touch at the place they are.
    event.preventDefault();
    return;
  }
  if (event.target == dom.play) {
    setVideoPlaying(dom.player.paused);
  } else if (event.target == dom.close) {
    hidePlayer(true);
    // call preventDefault to prevent the click for underlying thumbnail items.
    event.preventDefault();
  } else if (event.target == dom.sliderWrapper) {
    dragSlider(event);
  } else if (event.target == dom.pickerDone && pendingPick) {
    pendingPick.postResult({
      type: currentVideoBlob.type,
      blob: currentVideoBlob
    });
    cleanupPick();
  } else if (pendingPick) {
    showVideoControls(true);
  } else {
    showVideoControls(false);
  }
}

// Align vertically fullscreen view
function setPlayerSize() {
  var containerWidth = window.innerWidth;
  var containerHeight = window.innerHeight;

  // Don't do anything if we don't know our size.
  // This could happen if we get a resize event before our metadata loads
  if (!dom.player.videoWidth || !dom.player.videoHeight)
    return;

  var width, height; // The size the video will appear, after rotation
  var rotation = 'metadata' in currentVideo ?
    currentVideo.metadata.rotation : 0;

  switch (rotation) {
  case 0:
  case 180:
    width = dom.player.videoWidth;
    height = dom.player.videoHeight;
    break;
  case 90:
  case 270:
    width = dom.player.videoHeight;
    height = dom.player.videoWidth;
  }

  var xscale = containerWidth / width;
  var yscale = containerHeight / height;
  var scale = Math.min(xscale, yscale);

  // scale large videos down and scale small videos up
  // this might result in lower image quality for small videos
  width *= scale;
  height *= scale;

  var left = ((containerWidth - width) / 2);
  var top = ((containerHeight - height) / 2);

  var transform;
  switch (rotation) {
  case 0:
    transform = 'translate(' + left + 'px,' + top + 'px)';
    break;
  case 90:
    transform =
      'translate(' + (left + width) + 'px,' + top + 'px) ' +
      'rotate(90deg)';
    break;
  case 180:
    transform =
      'translate(' + (left + width) + 'px,' + (top + height) + 'px) ' +
      'rotate(180deg)';
    break;
  case 270:
    transform =
      'translate(' + left + 'px,' + (top + height) + 'px) ' +
      'rotate(270deg)';
    break;
  }

  transform += ' scale(' + scale + ')';

  dom.player.style.transform = transform;
}

function setVideoUrl(player, video, callback) {
  if ('name' in video) {
    videodb.getFile(video.name, function(file) {
      var url = URL.createObjectURL(file);
      player.onloadedmetadata = callback;
      player.src = url;

      if (pendingPick)
        currentVideoBlob = file;
    });
  } else if ('url' in video) {
    player.onloadedmetadata = callback;
    player.src = video.url;
  }
}

// show video player
function showPlayer(video, autoPlay) {
  currentVideo = video;

  dom.thumbnails.hidden = true;
  dom.thumbnailListView.classList.add('hidden');
  dom.thumbnailSelectView.classList.add('hidden');
  dom.fullscreenView.classList.remove('hidden');
  currentView = dom.fullscreenView;

  // switch to the video player view
  updateDialog();
  dom.player.preload = 'metadata';

  function doneSeeking() {
    dom.player.onseeked = null;
    showVideoControls(true);

    // We don't auto hide the video controls in picker mode
    if (!pendingPick) {
      controlFadeTimeout = setTimeout(function() {
        showVideoControls(false);
      }, 250);
    }

    if (autoPlay) {
      play();
    } else {
      pause();
    }
  }

  setVideoUrl(dom.player, currentVideo, function() {

    dom.durationText.textContent = MediaUtils.formatDuration(
      dom.player.duration);
    timeUpdated();

    dom.play.classList.remove('paused');
    playerShowing = true;
    setPlayerSize();

    if ('metadata' in currentVideo) {
      if (currentVideo.metadata.currentTime === dom.player.duration) {
        currentVideo.metadata.currentTime = 0;
      }
      dom.videoTitle.textContent = currentVideo.metadata.title;
      dom.player.currentTime = currentVideo.metadata.currentTime || 0;
    } else {
      dom.videoTitle.textContent = currentVideo.title || '';
      dom.player.currentTime = 0;
    }

    if (dom.player.seeking) {
      dom.player.onseeked = doneSeeking;
    } else {
      doneSeeking();
    }
  });
}

function hidePlayer(updateVideoMetadata) {
  if (!playerShowing)
    return;

  dom.player.pause();

  function completeHidingPlayer() {
    // switch to the video gallery view
    dom.fullscreenView.classList.add('hidden');
    dom.thumbnailSelectView.classList.add('hidden');
    dom.thumbnailListView.classList.remove('hidden');
    currentView === dom.thumbnailListView;

    dom.play.classList.remove('paused');
    dom.thumbnails.hidden = false;
    playerShowing = false;
    updateDialog();

    // Unload the video. This releases the video decoding hardware
    // so other apps can use it. Note that any time the video app is hidden
    // (by switching to another app) we leave player mode, and this
    // code gets triggered, so if the video app is not visible it should
    // not be holding on to the video hardware
    dom.player.removeAttribute('src');
    dom.player.load();

    // Now that we're done using the video hardware to play a video, we
    // can start using it to parse metadata again, if we need to.
    startParsingMetadata();
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
    var imageblob = video.metadata.bookmark || video.metadata.poster;
    if (imageblob) {
      thumbnail.updatePoster(imageblob);
    }

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

function playerEnded() {
  if (dragging) {
    return;
  }
  if (endedTimer) {
    clearTimeout(endedTimer);
    endedTimer = null;
  }

  dom.player.currentTime = 0;

  pause();
}

function play() {
  // Switch the button icon
  dom.play.classList.remove('paused');

  // Start playing
  dom.player.play();
  playing = true;
}

function pause() {
  // Switch the button icon
  dom.play.classList.add('paused');

  // Stop playing the video
  dom.player.pause();
  playing = false;
}

// Update the progress bar and play head as the video plays
function timeUpdated() {
  if (controlShowing) {
    // We can't update a progress bar if we don't know how long
    // the video is. It is kind of a bug that the <video> element
    // can't figure this out for ogv videos.
    if (dom.player.duration === Infinity || dom.player.duration === 0) {
      return;
    }

    updateVideoControlSlider();
  }

  // Since we don't always get reliable 'ended' events, see if
  // we've reached the end this way.
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=783512
  // If we're within 1 second of the end of the video, register
  // a timeout a half a second after we'd expect an ended event.
  if (!endedTimer) {
    if (!dragging && dom.player.currentTime >= dom.player.duration - 1) {
      var timeUntilEnd = (dom.player.duration - dom.player.currentTime + .5);
      endedTimer = setTimeout(playerEnded, timeUntilEnd * 1000);
    }
  } else if (dragging && dom.player.currentTime < dom.player.duration - 1) {
    // If there is a timer set and we drag away from the end, cancel the timer
    clearTimeout(endedTimer);
    endedTimer = null;
  }
}

// handle drags on the time slider
function dragSlider(e) {
  isPausedWhileDragging = dom.player.paused;
  dragging = true;
  // calculate the slider wrapper size for slider dragging.
  sliderRect = dom.sliderWrapper.getBoundingClientRect();

  // We can't do anything if we don't know our duration
  if (dom.player.duration === Infinity)
    return;

  if (!isPausedWhileDragging) {
    dom.player.pause();
  }

  handlePlayerTouchMove(e);
}

function handlePlayerTouchEnd(event) {
  // We don't care the event not related to touchStartID
  if (!event.changedTouches.identifiedTouch(touchStartID)) {
    return;
  }
  touchStartID = null;

  if (!dragging) {
    // We don't need to do anything without dragging.
    return;
  }

  dragging = false;

  dom.playHead.classList.remove('active');

  if (dom.player.currentTime === dom.player.duration) {
    pause();
  } else if (!isPausedWhileDragging) {
    dom.player.play();
  }
}

function handlePlayerTouchMove(event) {
  if (!dragging) {
    return;
  }

  var touch = event.changedTouches.identifiedTouch(touchStartID);
  // We don't care the event not related to touchStartID
  if (!touch) {
    return;
  }

  var pos = (touch.clientX - sliderRect.left) / sliderRect.width;
  pos = Math.max(pos, 0);
  pos = Math.min(pos, 1);

  var percent = pos * 100 + '%';
  dom.playHead.classList.add('active');
  dom.playHead.style.left = percent;
  dom.elapsedTime.style.width = percent;
  dom.player.currentTime = dom.player.duration * pos;
  dom.elapsedText.textContent = MediaUtils.formatDuration(
    dom.player.currentTime);
}

// XXX if we don't have metadata about the video name
// do the best we can with the file name
function fileNameToVideoName(filename) {
  filename = filename.split('/').pop()
    .replace(/\.(webm|ogv|mp4)$/, '')
    .replace(/[_\.]/g, ' ');
  return filename.charAt(0).toUpperCase() + filename.slice(1);
}

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}

// Call this when the app is hidden
function releaseVideo() {
  // readyState = 0: no metadata loaded, we don't need to save the currentTime
  // of player. It is always 0 and can't be used to restore the state of video.
  if (dom.player.readyState > 0) {
    restoreTime = dom.player.currentTime;
  }
  dom.player.removeAttribute('src');
  dom.player.load();
}

// Call this when the app becomes visible again
function restoreVideo() {
  if (!restoreTime) {
    return;
  }
  setVideoUrl(dom.player, currentVideo, function() {
    setPlayerSize();
    dom.player.currentTime = restoreTime;
  });
}

// Force repainting of titles for enable overflow event
function forceRepaintTitles() {
  var texts = document.querySelectorAll('.details');
  for (var i = 0; i < texts.length; i++) {
    texts[i].style.overflow = 'visible';
    texts[i].firstElementChild.textContent = texts[i].dataset.title;
    texts[i].style.overflow = 'hidden';
  }
}

//
// Pick activity
//
function showPickView() {
  thumbnailList.setPickMode(true);
  dom.pickerHeader.classList.remove('hidden');
  dom.pickerDone.classList.remove('hidden');
  dom.thumbnailsBottom.classList.add('hidden');
  dom.videoActionBar.parentNode.removeChild(dom.videoActionBar);

  dom.pickerClose.addEventListener('click', function() {
    pendingPick.postError('pick cancelled');
  });
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
