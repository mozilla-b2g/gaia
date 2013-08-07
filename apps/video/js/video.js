'use strict';

var dom = {};

var ids = ['thumbnail-list-view', 'thumbnails-bottom',
           'thumbnails', 'thumbnails-video-button', 'thumbnails-select-button',
           'thumbnail-select-view',
           'thumbnails-delete-button', 'thumbnails-share-button',
           'thumbnails-cancel-button', 'thumbnails-number-selected',
           'fullscreen-view', 'crop-view',
           'thumbnails-single-delete-button', 'thumbnails-single-share-button',
           'player', 'overlay', 'overlay-title',
           'overlay-text', 'videoControls', 'videoBar', 'videoActionBar',
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
var videos = [];
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

// Videos recorded by our own camera have filenames of this form
var FROMCAMERA = /DCIM\/\d{3}MZLLA\/VID_\d{4}\.3gp$/;

function init() {

  initDB();

  // binding options button
  dom.thumbnailsVideoButton.addEventListener('click', launchCameraApp);
  dom.thumbnailsSelectButton.addEventListener('click', showSelectView);
  dom.thumbnailsDeleteButton.addEventListener('click', deleteSelectedItems);
  dom.thumbnailsShareButton.addEventListener('click', shareSelectedItems);
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

  dom.thumbnailsCancelButton.addEventListener('click', hideSelectView);
}

function showSelectView() {
  dom.thumbnailListView.classList.add('hidden');
  dom.fullscreenView.classList.add('hidden');
  dom.thumbnailSelectView.classList.remove('hidden');
  currentView = dom.thumbnailSelectView;

  // styling for select view
  dom.thumbnails.classList.add('select');

  clearSelection();
}

function hideSelectView() {
  clearSelection();

  dom.fullscreenView.classList.add('hidden');
  dom.thumbnailSelectView.classList.add('hidden');
  dom.thumbnailListView.classList.remove('hidden');

  dom.thumbnails.classList.remove('select');

  currentView = dom.thumbnailListView;
}

function clearSelection() {
  // Clear the selection, if there is one
  Array.forEach(thumbnails.querySelectorAll('.selected.thumbnail'),
                  function(elt) { elt.classList.remove('selected'); });
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
function updateSelection(thumbnail) {
  // First, update the visual appearance of the element
  thumbnail.classList.toggle('selected');

  // Now update the list of selected filenames and filename->blob map
  // based on whether we selected or deselected the thumbnail
  var selected = thumbnail.classList.contains('selected');
  var index = parseInt(thumbnail.dataset.index);
  var filename = videos[index].name;
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

function deleteFile(n) {
  if (n < 0 || n >= videos.length)
    return;
  // Delete the file from the MediaDB. This removes the db entry and
  // deletes the file in device storage. This will generate an change
  // event which will call imageDeleted()
  var filename = videos[n].name;

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
  if (videos.length !== 0 && (!storageState || playerShowing)) {
    showOverlay(null);
    return;
  }

  if (storageState === MediaDB.UPGRADING) {
    showOverlay('upgrade');
  } else if (storageState === MediaDB.NOCARD) {
    showOverlay('nocard');
  } else if (storageState === MediaDB.UNMOUNTED) {
    showOverlay('pluggedin');
  } else if (firstScanEnded &&
             videos.length === 0 &&
             metadataQueue.length === 0) {
    showOverlay('empty');
  }
}

//
// Create a thumbnail item
//
function createThumbnailItem(videonum) {
  var videodata = videos[videonum];

  var inner = document.createElement('div');
  inner.className = 'inner';

  // This  is the image blob we display for the video.
  // If the video is part-way played, we display the bookmark image.
  // Otherwise we display the poster image from metadata parsing.
  var imageblob = videodata.metadata.bookmark || videodata.metadata.poster;

  // This is the element that displays the image blob
  var poster = document.createElement('div');
  poster.className = 'img';
  if (imageblob) {
    setPosterImage(poster, imageblob);
  }

  var details = document.createElement('div');
  details.className = 'details';
  details.dataset.title = videodata.metadata.title;
  var title = document.createElement('span');
  title.className = 'title';
  title.textContent = videodata.metadata.title;
  details.appendChild(title);
  if (isFinite(videodata.metadata.duration)) {
    var d = Math.round(videodata.metadata.duration);
    var after = document.createElement('span');
    after.className = 'after';
    after.textContent = ' ' + formatDuration(d);
    details.appendChild(after);
  }

  details.addEventListener('overflow', detailsOverflowHandler);

  var thumbnail = document.createElement('li');
  thumbnail.className = 'thumbnail';
  inner.appendChild(poster);

  if (!videodata.metadata.watched) {
    var unread = document.createElement('div');
    unread.classList.add('unwatched');
    inner.appendChild(unread);
  }

  thumbnail.dataset.name = videodata.name;
  thumbnail.dataset.index = videonum;

  thumbnail.addEventListener('click', thumbnailClickHandler);
  inner.appendChild(details);
  thumbnail.appendChild(inner);
  return thumbnail;
}

function detailsOverflowHandler(e) {
  var el = e.target;
  var title = el.firstElementChild;
  if (title.textContent.length > 5) {
    var max = (window.innerWidth > window.innerHeight) ? 175 : 45;
    var end = title.textContent.length > max ? max - 1 : -5;
    title.textContent = title.textContent.slice(0, end) + '\u2026';
    // Force element to be repainted to enable 'overflow' event
    // Can't repaint without the timeout maybe a gecko bug.
    el.style.overflow = 'visible';
    setTimeout(function() { el.style.overflow = 'hidden'; });
  }
}

function thumbnailClickHandler() {
  if (!this.classList.contains('thumbnail'))
    return;
  if (currentView === dom.thumbnailListView ||
      currentView === dom.fullscreenView) {
    // Be certain that metadata parsing has stopped before we show the
    // video player. Otherwise, we'll have contention for the video hardware
    var index = parseInt(this.dataset.index);
    stopParsingMetadata(function() {
      showPlayer(index, !pendingPick);
    });
  }
  else if (currentView === dom.thumbnailSelectView) {
    updateSelection(this);
  }
}

function getThumbnailDom(filename) {
  return dom.thumbnails.querySelectorAll('[data-name="' + filename + '"]')[0];
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

  dom.overlayTitle.textContent = navigator.mozL10n.get(id + '-title');
  dom.overlayText.textContent = navigator.mozL10n.get(id + '-text');
  dom.overlay.classList.remove('hidden');
}

function showVideoControls(visible) {
  dom.videoControls.classList[visible ? 'remove' : 'add']('hidden');
  controlShowing = visible;
}

function setVideoPlaying(playing) {
  if (playing) {
    play();
  } else {
    pause();
  }
}

function playerMousedown(event) {
  // If we interact with the controls before they fade away,
  // cancel the fade
  if (controlFadeTimeout) {
    clearTimeout(controlFadeTimeout);
    controlFadeTimeout = null;
  }
  if (!controlShowing) {
    showVideoControls(true);
    return;
  }
  if (event.target == dom.play) {
    setVideoPlaying(dom.player.paused);
  } else if (event.target == dom.close) {
    hidePlayer(true);
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
  var containerHeight = (window.innerHeight > dom.player.offsetHeight) ?
    window.innerHeight : dom.player.offsetHeight;
  dom.cropView.style.marginTop = (containerHeight / 2) * -1 + 'px';
  dom.cropView.style.height = containerHeight + 'px';
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
function showPlayer(videonum, autoPlay) {
  currentVideo = videos[videonum];

  dom.thumbnails.classList.add('hidden');
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

    dom.durationText.textContent = formatDuration(dom.player.duration);
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

function hidePlayer(updateMetadata) {
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
    dom.thumbnails.classList.remove('hidden');
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

  if (!('metadata' in currentVideo) || !updateMetadata || pendingPick) {
    completeHidingPlayer();
    return;
  }

  var video = currentVideo;
  var thumbnail = getThumbnailDom(video.name);

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
    var posterImg = thumbnail.querySelector('.img');
    var imageblob = video.metadata.bookmark || video.metadata.poster;
    if (posterImg && imageblob) {
      setPosterImage(posterImg, imageblob);
    }

    // If this is the first time the video was watched, record that it has
    // been watched now and update the corresponding document element.
    if (!video.metadata.watched) {
      video.metadata.watched = true;
      var unwatched = thumbnail.querySelector('.unwatched');
      if (unwatched) {
        unwatched.parentNode.removeChild(unwatched);
      }
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

  if (pendingPick) {
    pause();
  } else {
    hidePlayer(true);
  }
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

    var percent = (dom.player.currentTime / dom.player.duration) * 100 + '%';

    dom.elapsedText.textContent = formatDuration(dom.player.currentTime);
    dom.elapsedTime.style.width = percent;
    // Don't move the play head if the user is dragging it.
    if (!dragging)
      dom.playHead.style.left = percent;
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

  var isPaused = dom.player.paused;
  dragging = true;

  // We can't do anything if we don't know our duration
  if (dom.player.duration === Infinity)
    return;

  if (!isPaused) {
    dom.player.pause();
  }

  // Capture all mouse moves and the mouse up
  document.addEventListener('mousemove', mousemoveHandler, true);
  document.addEventListener('mouseup', mouseupHandler, true);

  function position(event) {
    var rect = dom.sliderWrapper.getBoundingClientRect();
    var position = (event.clientX - rect.left) / rect.width;
    position = Math.max(position, 0);
    position = Math.min(position, 1);
    return position;
  }

  function mouseupHandler(event) {
    document.removeEventListener('mousemove', mousemoveHandler, true);
    document.removeEventListener('mouseup', mouseupHandler, true);

    dragging = false;

    dom.playHead.classList.remove('active');

    if (dom.player.currentTime === dom.player.duration) {
      pause();
    } else if (!isPaused) {
      dom.player.play();
    }
  }

  function mousemoveHandler(event) {
    var pos = position(event);
    var percent = pos * 100 + '%';
    dom.playHead.classList.add('active');
    dom.playHead.style.left = percent;
    dom.elapsedTime.style.width = percent;
    dom.player.currentTime = dom.player.duration * pos;
    dom.elapsedText.textContent = formatDuration(dom.player.currentTime);
  }

  mousemoveHandler(e);
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

function padLeft(num, length) {
  var r = String(num);
  while (r.length < length) {
    r = '0' + r;
  }
  return r;
}

function formatDuration(duration) {
  var minutes = Math.floor(duration / 60);
  var seconds = Math.floor(duration % 60);
  if (minutes < 60) {
    return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
  }
  var hours = Math.floor(minutes / 60);
  minutes = Math.floor(minutes % 60);
  return hours + ':' + padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
}

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

// This app uses deprecated-hwvideo permission to access video decoding hardware
// But Camera and Gallery also need to use that hardware, and those three apps
// may only have one video playing at a time among them. So we need to be
// careful to relinquish the hardware when we are not visible.

var restoreTime;

// Call this when the app is hidden
function releaseVideo() {
  restoreTime = dom.player.currentTime;
  dom.player.removeAttribute('src');
  dom.player.load();
}

// Call this when the app becomes visible again
function restoreVideo() {
  setVideoUrl(dom.player, currentVideo, function() {
    setPlayerSize();
    dom.player.currentTime = restoreTime;
  });
}

// show|hide controls over the player
dom.videoControls.addEventListener('mousedown', playerMousedown);

// Force repainting of titles for enable overflow event
function forceRepaintTitles() {
  var texts = document.querySelectorAll('.details');
  for (var i = 0; i < texts.length; i++) {
    texts[i].style.overflow = 'visible';
    texts[i].firstElementChild.textContent = texts[i].dataset.title;
    texts[i].style.overflow = 'hidden';
  }
}

// Rescale when window size changes. This should get called when
// orientation changes
window.addEventListener('resize', function() {
  if (dom.player.readyState !== HAVE_NOTHING) {
    setPlayerSize();
  }
  forceRepaintTitles();
});

dom.player.addEventListener('timeupdate', timeUpdated);
dom.player.addEventListener('ended', playerEnded);

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showBody() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');

  // If this is the first time we've been called, initialize the database.
  // Don't reinitialize it if the user switches languages while we're running
  if (!videodb)
    init();
});

// We get headphoneschange event when the headphones is plugged or unplugged
var acm = navigator.mozAudioChannelManager;
if (acm) {
  acm.addEventListener('headphoneschange', function onheadphoneschange() {
    if (!acm.headphones && playing) {
      setVideoPlaying(false);
    }
  });
}

//
// Pick activity
//

var pendingPick;

function showPickView() {
  dom.thumbnails.classList.add('pick');
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

navigator.mozSetMessageHandler('activity', function activityHandler(a) {
  var activityName = a.source.name;

  if (activityName === 'pick') {
    pendingPick = a;

    showPickView();
  }
});

function showThrobber() {
  dom.throbber.classList.remove('hidden');
  dom.throbber.classList.add('throb');
}

function hideThrobber() {
  dom.throbber.classList.add('hidden');
  dom.throbber.classList.remove('throb');
}
