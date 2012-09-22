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

// An array of data about each of the videos we know about.
var videos = [];
var videodb;

var currentVideo;  // The data for the current video

// Video object used to create previews
var previewPlayer = document.createElement('video');

var THUMBNAIL_WIDTH = 160;  // Just a guess at a size for now
var THUMBNAIL_HEIGHT = 160;

var urlToStream; // From an activity call

var storageState;

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showBody() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
  init();
});

function init() {

  videodb = new MediaDB('videos', metaDataParser);

  videodb.onunavailable = function(why) {
    storageState = why;
    createThumbnailList();
  };

  videodb.onready = function() {
    storageState = false;
    scan();
    createThumbnailList();
  };

  document.addEventListener('mozvisibilitychange', function vc() {
    if (!document.mozHidden && videodb.ready) {
      scan();
    }
  });

  videodb.onchange = function(type, files) {
    // TODO: Dynamically update the UI, for now doing a full
    // repaint
    createThumbnailList();
  };


  if (urlToStream) {
    showPlayer({
      remote: true,
      url: urlToStream.url,
      title: urlToStream.title
    }, true);
    urlToStream = null;
  }
}

function scan() {
  dom.throbber.classList.add('throb');
  videodb.scan(function() {
    dom.throbber.classList.remove('throb');
  });
}

function createThumbnailList() {

  if (!playerShowing && storageState) {
    if (storageState === 'unavailable') {
      showOverlay('nocard');
    } else if (storageState === 'shared') {
      showOverlay('cardinuse');
    }
    return;
  }

  dom.thumbnails.innerHTML = '';

  if (videos.length) {
    videos = [];
  }

  videodb.count(function(count) {
    if (count === 0) {
      showOverlay('novideos');
      return;
    }
    showOverlay(null);
    videodb.enumerate(function(videodata) {
      if (videodata === null)
        return;
      processVideo(videodata);
    });
  });
}

function processVideo(videodata) {
  // If this isn't a video, skip it
  if (videodata.type.substring(0, 6) !== 'video/')
    return;
  if (!previewPlayer.canPlayType(videodata.type))
    return;
  addVideo(videodata);
}

function metaDataParser(videofile, callback) {

  if (!previewPlayer.canPlayType(videofile.type)) {
    return callback({});
  }

  var url = URL.createObjectURL(videofile);
  var metadata = {
    title: fileNameToVideoName(videofile.name)
  };

  previewPlayer.preload = 'metadata';
  previewPlayer.style.width = THUMBNAIL_WIDTH + 'px';
  previewPlayer.style.height = THUMBNAIL_HEIGHT + 'px';
  previewPlayer.src = url;
  previewPlayer.onloadedmetadata = function() {

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
  function doneSeeking() {
    player.onseeked = null;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    ctx.drawImage(player, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    if (skipped) {
      player.currentTime = 0;
    }
    callback(canvas.mozGetAsFile('poster', 'image/jpeg'));
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

function addVideo(videodata) {
  var index = videos.length;
  var poster;
  videos.push(videodata);

  if (videodata.metadata.poster) {
    poster = document.createElement('img');
    poster.src = URL.createObjectURL(videodata.metadata.poster);
    poster.onload = function() {
      URL.revokeObjectURL(poster.src);
    };
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

  var hr = document.createElement('hr');
  thumbnail.appendChild(hr);

  thumbnail.addEventListener('click', function(e) {
    showPlayer(videodata, true);
  });

  dom.thumbnails.appendChild(thumbnail);
}

var currentOverlay;

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


// When we exit fullscreen mode, stop playing the video.
// This happens automatically when the user uses the back button (because
// back is Escape, which is also the "leave fullscreen mode" command).
// It also happens when the user uses the Home button to go to the
// homescreen or another app.
document.addEventListener('mozfullscreenchange', function() {
  if (document.mozFullScreenElement === null) {
    hidePlayer();
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

// show|hide controls over the player
dom.videoControls.addEventListener('mousedown', function(event) {
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
});

// Make the video fit the screen
function setPlayerSize() {
  if (!currentVideo.metadata) {
    return;
  }
  var xscale = window.innerWidth / currentVideo.metadata.width;
  var yscale = window.innerHeight / currentVideo.metadata.height;
  var scale = Math.min(xscale, yscale);
  var width = currentVideo.metadata.width * scale;
  var height = currentVideo.metadata.height * scale;
  var left = (window.innerWidth - width) / 2;
  var top = (window.innerHeight - height) / 2;
  dom.player.style.width = width + 'px';
  dom.player.style.height = height + 'px';
  dom.player.style.left = left + 'px';
  dom.player.style.top = top + 'px';
}

// Rescale when window size changes. This should get called when
// orientation changes and when we go into fullscreen
window.addEventListener('resize', setPlayerSize);

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
  dom.videoFrame.classList.remove('hidden');
  dom.play.classList.remove('paused');
  playerShowing = true;
  dom.player.preload = 'metadata';

  function doneSeeking() {
    dom.videoFrame.mozRequestFullScreen();

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
  }

  setVideoUrl(dom.player, currentVideo, function() {

    dom.durationText.textContent = formatDuration(dom.player.duration);
    timeUpdated();
    setPlayerSize();

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

    // Currently if we attempt to grab fullscreen without a timeout
    // it never happen
    var pauseDoneSeeking = function() {
      setTimeout(doneSeeking, currentVideo.remote ? 1000 : 0);
    };

    if (dom.player.seeking) {
      dom.player.onseeked = pauseDoneSeeking();
    } else {
      pauseDoneSeeking();
    }
  });
}

function hidePlayer() {
  if (!playerShowing)
    return;

  dom.player.pause();

  function completeHidingPlayer() {
    // switch to the video gallery view
    createThumbnailList();
    dom.videoFrame.classList.add('hidden');
    dom.videoBar.classList.remove('paused');
    playerShowing = false;
  }

  if (currentVideo.remote) {
    completeHidingPlayer();
    return;
  }

  var video = currentVideo;

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

    videodb.updateMetadata(video.name, video.metadata, completeHidingPlayer);
  });
}

// If the movie ends, and no controls are showing, go back to movie list
dom.player.addEventListener('ended', function() {
  if (dragging) {
    return;
  }
  dom.player.currentTime = 0;
  document.mozCancelFullScreen();
});

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

// XXX: the back and forward buttons aren't working for my webm videos
var dragging = false;

// XXX The progress bar doesn't update for my ogv video because
// the <video> elememt can't figure out its duration.

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


dom.player.addEventListener('timeupdate', timeUpdated);

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
  urlToStream = {
    url: activity.source.data.url,
    title: activity.source.data.title || ''
  };
}

if (window.navigator.mozSetMessageHandler) {
  window.navigator.mozSetMessageHandler('activity', actHandle);
}
