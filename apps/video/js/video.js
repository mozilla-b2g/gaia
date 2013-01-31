'use strict';

var dom = {};

var ids = ['player', 'thumbnails', 'overlay', 'overlay-title',
           'overlay-text', 'videoControls', 'videoFrame', 'videoBar',
           'close', 'play', 'playHead', 'timeSlider', 'elapsedTime',
           'video-title', 'duration-text', 'elapsed-text', 'bufferedTime',
           'slider-wrapper', 'throbber', 'delete-video-button'];

ids.forEach(function createElementRef(name) {
  dom[toCamelCase(name)] = document.getElementById(name);
});

dom.player.mozAudioChannelType = 'content';

var playing = false;

// if this is true then the video tag is showing
// if false, then the gallery is showing
var playerShowing = false;
var ctxTriggered = false; // Workaround for bug 766813

// keep the screen on when playing
var screenLock;
var endedTimer;

// same thing for the controls
var controlShowing = false;
var controlFadeTimeout = null;

var videodb;
var currentVideo;  // The data for the currently playing video
var videoCount = 0;
var firstScanEnded = false;

var THUMBNAIL_WIDTH = 160;  // Just a guess at a size for now
var THUMBNAIL_HEIGHT = 160;

// Enumerating the readyState for html5 video api
var HAVE_NOTHING = 0;

var storageState;
var currentOverlay;

var dragging = false;

var fullscreenTimer;
var fullscreenCallback;

function init() {

  videodb = new MediaDB('videos', metaDataParser);

  videodb.onunavailable = function(event) {
    storageState = event.detail;
    updateDialog();
  };
  videodb.onready = function() {
    storageState = false;
    updateDialog();
    createThumbnailList();
  };

  videodb.onscanstart = function() {
    dom.throbber.classList.add('throb');
  };
  videodb.onscanend = function() {
    dom.throbber.classList.remove('throb');
    if (!firstScanEnded) {
      firstScanEnded = true;
      updateDialog();
    }
  };

  videodb.oncreated = function(event) {
    event.detail.forEach(videoAdded);
  };
  videodb.ondeleted = function(event) {
    event.detail.forEach(videoDeleted);
  };

  // We can't do this in the mouse down handler below because
  // calling confirm() from the mousedown generates a contextmenu
  // event when the alert goes away.
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=829214
  dom.deleteVideoButton.onclick = function() {
    document.mozCancelFullScreen();
    deleteFile(currentVideo.name);
  };
}

function videoAdded(videodata) {
  var poster;

  if (!videodata || !videodata.metadata.isVideo) {
    return;
  }

  videoCount += 1;

  if (videodata.metadata.poster) {
    poster = document.createElement('img');
    setPosterImage(poster, videodata.metadata.poster);
  }

  var title = document.createElement('p');
  title.className = 'name';
  title.textContent = videodata.metadata.title;

  var duration = document.createElement('p');
  duration.className = 'time';
  if (isFinite(videodata.metadata.duration)) {
    var d = Math.round(videodata.metadata.duration);
    duration.textContent = formatDuration(d);
  }

  var thumbnail = document.createElement('li');
  if (poster) {
    thumbnail.appendChild(poster);
  }

  if (!videodata.metadata.watched) {
    var unread = document.createElement('div');
    unread.classList.add('unwatched');
    thumbnail.appendChild(unread);
  }

  thumbnail.appendChild(title);
  thumbnail.appendChild(duration);
  thumbnail.dataset.name = videodata.name;

  var hr = document.createElement('hr');
  thumbnail.appendChild(hr);

  thumbnail.addEventListener('click', function(e) {
    // When the user presses and holds to delete a video, we get a
    // contextmenu event, but still apparently get a click event after
    // they lift their finger. This ctxTriggered flag prevents us from
    // playing a video after a contextmenu event.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=766813
    if (!ctxTriggered) {
      showPlayer(videodata, true);
    } else {
      ctxTriggered = false;
    }
  });
  dom.thumbnails.appendChild(thumbnail);
}

dom.thumbnails.addEventListener('contextmenu', function(evt) {
  var node = evt.target;
  while (node) {
    if (node.dataset.name) {
      ctxTriggered = true;
      deleteFile(node.dataset.name);
      return;
    }
    node = node.parentNode;
  }
});

function deleteFile(file) {
  var msg = navigator.mozL10n.get('confirm-delete');
  if (confirm(msg + ' ' + file)) {
    videodb.deleteFile(file);
  }
}

function videoDeleted(filename) {
  videoCount--;
  dom.thumbnails.removeChild(getThumbnailDom(filename));
  updateDialog();
}

// Only called on startup to generate initial list of already
// scanned media, once this is build videoDeleted/Added are used
// to keep it up to date
function createThumbnailList() {
  if (dom.thumbnails.firstChild !== null) {
    dom.thumbnails.textContent = '';
  }
  videodb.enumerate('date', null, 'prev', videoAdded);
}

function updateDialog() {
  if (videoCount !== 0 && (!storageState || playerShowing)) {
    showOverlay(null);
    return;
  }
  if (storageState === MediaDB.NOCARD) {
    showOverlay('nocard');
  } else if (storageState === MediaDB.UNMOUNTED) {
    showOverlay('pluggedin');
  } else if (firstScanEnded && videoCount === 0) {
    showOverlay('empty');
  }
}

function metaDataParser(videofile, callback, metadataError) {

  var previewPlayer = document.createElement('video');
  var completed = false;

  if (!previewPlayer.canPlayType(videofile.type)) {
    return callback({isVideo: false});
  }

  var url = URL.createObjectURL(videofile);
  var metadata = {
    isVideo: true,
    title: fileNameToVideoName(videofile.name)
  };

  previewPlayer.preload = 'metadata';
  previewPlayer.style.width = THUMBNAIL_WIDTH + 'px';
  previewPlayer.style.height = THUMBNAIL_HEIGHT + 'px';
  previewPlayer.src = url;
  previewPlayer.onerror = function(e) {
    if (!completed) {
      metadataError(metadata.title);
    }
  };
  previewPlayer.onloadedmetadata = function() {

    // File Object only does basic detection for content type,
    // if videoWidth is 0 then this is likely an audio file (ogg / mp4)
    if (!previewPlayer.videoWidth) {
      return callback({isVideo: false});
    }

    metadata.duration = previewPlayer.duration;
    metadata.width = previewPlayer.videoWidth;
    metadata.height = previewPlayer.videoHeight;

    function createThumbnail() {
      captureFrame(previewPlayer, metadata, function(poster) {
        metadata.poster = poster;
        URL.revokeObjectURL(url);
        completed = true;
        previewPlayer.removeAttribute('src');
        previewPlayer.load();
        callback(metadata);
      });
    }

    // If this is a .3gp video file, look for its rotation matrix and
    // then create the thumbnail. Otherwise set rotation to 0 and
    // create the thumbnail.
    // getVideoRotation is defined in shared/js/media/get_video_rotation.js
    if (/.3gp$/.test(videofile.name)) {
      getVideoRotation(videofile, function(rotation) {
        if (typeof rotation === 'number')
          metadata.rotation = rotation;
        else if (typeof rotation === 'string')
          console.warn('Video rotation:', rotation);
        createThumbnail();
      });
    } else {
      metadata.rotation = 0;
      createThumbnail();
    }
  };
}

function captureFrame(player, metadata, callback) {
  var skipped = false;
  var image = null;
  function doneSeeking() {
    player.onseeked = null;
    try {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = THUMBNAIL_HEIGHT;
      // If a rotation is specified, rotate the canvas context
      if ('rotation' in metadata) {
        ctx.save();
        switch (metadata.rotation) {
        case 90:
          ctx.translate(THUMBNAIL_WIDTH, 0);
          ctx.rotate(Math.PI / 2);
          break;
        case 180:
          ctx.translate(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
          ctx.rotate(Math.PI);
          break;
        case 270:
          ctx.translate(0, THUMBNAIL_HEIGHT);
          ctx.rotate(-Math.PI / 2);
          break;
        }
      }
      ctx.drawImage(player, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
      if (metadata.rotation) {
        ctx.restore();
      }
      image = canvas.mozGetAsFile('poster', 'image/jpeg');
    } catch (e) {
      console.error('Failed to create a poster image:', e);
    }
    if (skipped) {
      player.currentTime = 0;
    }
    callback(image);
  }

  // If we are on the first frame, lets skip into the video since some
  // videos just start with a black screen
  if (player.currentTime === 0) {
    player.currentTime = Math.floor(player.duration / 4);
    skipped = true;
  }

  if (player.seeking) {
    player.onseeked = doneSeeking;
  } else {
    doneSeeking();
  }
}

function getThumbnailDom(filename) {
  return dom.thumbnails.querySelectorAll('[data-name="' + filename + '"]')[0];
}

function setPosterImage(dom, poster) {
  dom.src = URL.createObjectURL(poster);
  dom.onload = function() {
    URL.revokeObjectURL(dom.src);
  };
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

function setControlsVisibility(visible) {
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
    setControlsVisibility(true);
    return;
  }
  if (event.target == dom.play) {
    setVideoPlaying(dom.player.paused);
  } else if (event.target == dom.close) {
    document.mozCancelFullScreen();
  } else if (event.target == dom.sliderWrapper) {
    dragSlider(event);
  } else {
    setControlsVisibility(false);
  }
}

// Make the video fit the container
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
    });
  } else if ('url' in video) {
    player.onloadedmetadata = callback;
    player.src = video.url;
  }
}

// show video player
function showPlayer(data, autoPlay) {
  currentVideo = data;

  dom.thumbnails.classList.add('hidden');

  // switch to the video player view
  updateDialog();
  dom.player.preload = 'metadata';

  function doneSeeking() {
    dom.player.onseeked = null;
    requestFullScreen(function() {
      // Show the controls briefly then fade out
      setControlsVisibility(true);
      controlFadeTimeout = setTimeout(function() {
        setControlsVisibility(false);
      }, 250);

      if (autoPlay) {
        play();
      }

      if ('metadata' in currentVideo) {
        currentVideo.metadata.watched = true;
        videodb.updateMetadata(currentVideo.name, currentVideo.metadata);
      }
    });
  }

  setVideoUrl(dom.player, currentVideo, function() {

    dom.durationText.textContent = formatDuration(dom.player.duration);
    timeUpdated();

    dom.videoFrame.classList.remove('hidden');
    dom.play.classList.remove('paused');
    playerShowing = true;
    setPlayerSize();

    if ('name' in currentVideo && /^DCIM/.test(currentVideo.name)) {
      dom.deleteVideoButton.classList.remove('hidden');
    }

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

function hidePlayer() {
  if (!playerShowing)
    return;

  dom.player.pause();
  dom.deleteVideoButton.classList.add('hidden');

  function completeHidingPlayer() {
    // switch to the video gallery view
    dom.videoFrame.classList.add('hidden');
    dom.videoBar.classList.remove('paused');
    dom.thumbnails.classList.remove('hidden');
    playerShowing = false;
    updateDialog();
  }

  if (!('metadata' in currentVideo)) {
    completeHidingPlayer();
    return;
  }

  var video = currentVideo;
  var li = getThumbnailDom(video.name);

  // Record current information about played video
  video.metadata.currentTime = dom.player.currentTime;
  captureFrame(dom.player, currentVideo.metadata, function(poster) {
    currentVideo.metadata.poster = poster;
    dom.player.currentTime = 0;

    // Allow the screen to blank now.
    if (screenLock) {
      screenLock.unlock();
      screenLock = null;
    }

    if (poster) {
      var posterImg = li.querySelectorAll('img')[0];
      setPosterImage(posterImg, poster);
    }

    var unwatched = li.querySelectorAll('div.unwatched');
    if (unwatched.length) {
      li.removeChild(unwatched[0]);
    }

    videodb.updateMetadata(video.name, video.metadata, completeHidingPlayer);
  });
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
  document.mozCancelFullScreen();
}

function play() {
  // Switch the button icon
  dom.play.classList.remove('paused');

  // Start playing
  dom.player.play();
  playing = true;

  // Don't let the screen go to sleep
  if (!screenLock)
    screenLock = navigator.requestWakeLock('screen');
}

function pause() {
  // Switch the button icon
  dom.play.classList.add('paused');

  // Stop playing the video
  dom.player.pause();
  playing = false;

  // Let the screen go to sleep
  if (screenLock) {
    screenLock.unlock();
    screenLock = null;
  }
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
  var seconds = Math.round(duration % 60);
  if (minutes < 60) {
    return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
  }
  return '';
}


// The mozRequestFullScreen can fail silently, so we keep asking
// for full screen until we detect that it happens, We limit the
// number of requests as this can be a permanent failure due to
// https://bugzilla.mozilla.org/show_bug.cgi?id=812850
var MAX_FULLSCREEN_REQUESTS = 5;
function requestFullScreen(callback) {
  fullscreenCallback = callback;
  var requests = 0;
  fullscreenTimer = setInterval(function() {
    if (++requests > MAX_FULLSCREEN_REQUESTS) {
      window.clearInterval(fullscreenTimer);
      fullscreenTimer = null;
      return;
    }
    dom.videoFrame.mozRequestFullScreen();
  }, 500);
}

// When we exit fullscreen mode, stop playing the video.
// This happens automatically when the user uses the back button (because
// back is Escape, which is also the "leave fullscreen mode" command).
// It also happens when the user uses the Home button to go to the
// homescreen or another app.
document.addEventListener('mozfullscreenchange', function() {
  // We have exited fullscreen
  if (document.mozFullScreenElement === null) {
    hidePlayer();
    return;
  }

  // We have entered fullscreen
  if (fullscreenTimer) {
    window.clearInterval(fullscreenTimer);
    fullscreenTimer = null;
  }
  if (fullscreenCallback) {
    fullscreenCallback();
    fullscreenCallback = null;
  }
});

 // Pause on visibility change
document.addEventListener('mozvisibilitychange', function visibilityChange() {
  if (document.mozHidden && playing) {
    pause();
  } else if (!document.mozHidden && document.mozFullScreenElement) {
    setControlsVisibility(true);
  }
});

// show|hide controls over the player
dom.videoControls.addEventListener('mousedown', playerMousedown);

// Rescale when window size changes. This should get called when
// orientation changes and when we go into fullscreen
window.addEventListener('resize', function() {
  if (dom.player.readyState !== HAVE_NOTHING) {
    setPlayerSize();
  }
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
