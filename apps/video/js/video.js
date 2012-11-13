'use strict';

var dom = {};

var ids = ['player', 'thumbnails', 'overlay', 'overlay-title',
           'overlay-text', 'videoControls', 'videoFrame', 'videoBar',
           'close', 'play', 'playHead', 'timeSlider', 'elapsedTime',
           'video-title', 'duration-text', 'elapsed-text', 'bufferedTime',
           'slider-wrapper', 'throbber'];

ids.forEach(function createElementRef(name) {
  dom[toCamelCase(name)] = document.getElementById(name);
});

var playing = false;

// if this is true then the video tag is showing
// if false, then the gallery is showing
var playerShowing = false;

// keep the screen on when playing
var screenLock;

// same thing for the controls
var controlShowing = false;
var controlFadeTimeout = null;

var videodb;
var currentVideo;  // The data for the current video
var videoCount = 0;
var firstScanEnded = false;

var THUMBNAIL_WIDTH = 160;  // Just a guess at a size for now
var THUMBNAIL_HEIGHT = 160;

// Enumerating the readyState for html5 video api
var HAVE_NOTHING = 0;

var urlToStream; // From an activity call
var appStarted = false;

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
    event.detail.forEach(addVideo);
  };
  videodb.ondeleted = function(event) {
    event.detail.forEach(deleteVideo);
  };

  if (urlToStream) {
    startStream();
  }

  appStarted = true;
}

function addVideo(videodata) {
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
  thumbnail.setAttribute('data-name', videodata.name);

  var hr = document.createElement('hr');
  thumbnail.appendChild(hr);

  thumbnail.addEventListener('click', function(e) {
    showPlayer(videodata, true);
  });

  dom.thumbnails.appendChild(thumbnail);
}

function deleteVideo(filename) {
  videoCount -= 1;
  dom.thumbnails.removeChild(getThumbnailDom(filename));
}

// Only called on startup to generate initial list of already
// scanned media, once this is build add/deleteVideo are used
// to keep it up to date
function createThumbnailList() {
  if (dom.thumbnails.firstChild !== null) {
    dom.thumbnails.textContent = '';
  }
  videodb.enumerate('date', null, 'prev', addVideo);
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

function startStream() {
  showPlayer({
    remote: true,
    url: urlToStream.url,
    title: urlToStream.title
  }, true);
  urlToStream = null;
}

function metaDataParser(videofile, callback, metadataError) {

  var previewPlayer = document.createElement('video');

  if (!previewPlayer.canPlayType(videofile.type)) {
    return callback({isVideo: false});
  }

  var url = URL.createObjectURL(videofile);
  var metadata = {
    isVideo: true,
    title: fileNameToVideoName(videofile.name)
  };

  previewPlayer.onerror = function() {
    metadataError(metadata.title);
  }
  previewPlayer.preload = 'metadata';
  previewPlayer.style.width = THUMBNAIL_WIDTH + 'px';
  previewPlayer.style.height = THUMBNAIL_HEIGHT + 'px';
  previewPlayer.src = url;
  previewPlayer.onloadedmetadata = function() {

    // File Object only does basic detection for content type,
    // if videoWidth is 0 then this is likely an audio file (ogg / mp4)
    if (!previewPlayer.videoWidth) {
      return callback({isVideo: false});
    }

    metadata.duration = previewPlayer.duration;
    metadata.width = previewPlayer.videoWidth;
    metadata.height = previewPlayer.videoHeight;

    captureFrame(previewPlayer, function(poster) {
      metadata.poster = poster;
      URL.revokeObjectURL(url);
      previewPlayer.src = '';
      callback(metadata);
    });
  };
}

function captureFrame(player, callback) {
  var skipped = false;
  var image = null;
  function doneSeeking() {
    player.onseeked = null;
    try {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = THUMBNAIL_HEIGHT;
      ctx.drawImage(player, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
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
    player.currentTime = 20;
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

// Make the video fit the screen
function setPlayerSize(videoWidth, videoHeight) {
  var xscale = window.innerWidth / videoWidth;
  var yscale = window.innerHeight / videoHeight;
  var scale = Math.min(xscale, yscale);
  var width = videoWidth * scale;
  var height = videoHeight * scale;
  var left = (window.innerWidth - width) / 2;
  var top = (window.innerHeight - height) / 2;
  dom.player.style.width = width + 'px';
  dom.player.style.height = height + 'px';
  dom.player.style.left = left + 'px';
  dom.player.style.top = top + 'px';
}

function setVideoUrl(player, video, callback) {
  if (video.remote) {
    player.onloadedmetadata = callback;
    player.src = video.url;
  } else {
    videodb.getFile(video.name, function(file) {
      var url = URL.createObjectURL(file);
      player.onloadedmetadata = callback;
      player.src = url;
    });
  }
}

// show video player
function showPlayer(data, autoPlay) {
  currentVideo = data;

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

      if (!currentVideo.remote) {
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
    setPlayerSize(dom.player.videoWidth, dom.player.videoHeight);

    if (currentVideo.remote) {
      dom.videoTitle.textContent = currentVideo.title || '';
      dom.player.currentTime = 0;
    } else {
      if (currentVideo.metadata.currentTime === dom.player.duration) {
        currentVideo.metadata.currentTime = 0;
      }
      dom.videoTitle.textContent = currentVideo.metadata.title;
      dom.player.currentTime = currentVideo.metadata.currentTime || 0;
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

  function completeHidingPlayer() {
    // switch to the video gallery view
    dom.videoFrame.classList.add('hidden');
    dom.videoBar.classList.remove('paused');
    playerShowing = false;
    updateDialog();
  }

  if (currentVideo.remote) {
    completeHidingPlayer();
    return;
  }

  var video = currentVideo;
  var li = getThumbnailDom(video.name);

  // Record current information about played video
  video.metadata.currentTime = dom.player.currentTime;
  captureFrame(dom.player, function(poster) {
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
  if (!controlShowing)
    return;

  // We can't update a progress bar if we don't know how long
  // the video is. It is kind of a bug that the <video> element
  // can't figure this out for ogv videos.
  if (dom.player.duration === Infinity)
    return;

  if (dom.player.duration === 0)
    return;

  var percent = (dom.player.currentTime / dom.player.duration) * 100 + '%';

  dom.elapsedText.textContent = formatDuration(dom.player.currentTime);
  dom.elapsedTime.style.width = percent;
  // Don't move the play head if the user is dragging it.
  if (!dragging)
    dom.playHead.style.left = percent;
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

    if (dom.player.currentTime === dom.player.duration) {
      pause();
    } else if (!isPaused) {
      dom.player.play();
    }
  }

  function mousemoveHandler(event) {
    var pos = position(event);
    var percent = pos * 100 + '%';
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

function actHandle(activity) {
  var data = activity.source.data;
  var title = 'extras' in data ? (data.extras.title || '') : '';
  urlToStream = {
    url: data.url,
    title: title
  };
  if (appStarted) {
    startStream();
  }
}

// The mozRequestFullScreen can fail silently, so we keep asking
// for full screen until we detect that it happens
function requestFullScreen(callback) {
  fullscreenCallback = callback;
  fullscreenTimer = setInterval(function() {
    dom.videoFrame.mozRequestFullScreen();
  }, 500);
}

if (window.navigator.mozSetMessageHandler) {
  window.navigator.mozSetMessageHandler('activity', actHandle);
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
    setPlayerSize(dom.player.videoWidth, dom.player.videoHeight);
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
