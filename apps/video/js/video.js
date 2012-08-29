'use strict';

var dom = {};

var ids = ['player', 'thumbnails', 'overlay', 'overlay-title',
           'overlay-text', 'videoControls', 'videoFrame', 'videoBar',
           'close', 'play', 'playHead', 'timeSlider', 'elapsedTime',
           'video-title', 'duration-text', 'elapsed-text', 'bufferedTime',
            'slider-wrapper'];

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
    if (why === 'unavailable') {
      showOverlay('nocard');
    } else if (why === 'shared') {
      showOverlay('cardinuse');
    }
  }

  videodb.onready = function() {
    createThumbnailList();
    scan();
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
}

function scan() {
  showOverlay('scanning');
  videodb.scan(function() {
    if (videos.length === 0) {
      showOverlay('novideos');
    } else {
      showOverlay(null);
    }
  });
}

function createThumbnailList() {
  if (videos.length) {
    videos = [];
  }

  videodb.enumerate(function(videodata) {
    if (videodata === null)
      return;
    processVideo(videodata);
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

    previewPlayer.currentTime = 20;  // Skip ahead 20 seconds
    if (previewPlayer.seeking) {
      previewPlayer.onseeked = doneSeeking;
    } else {
      doneSeeking();
    }

    // After we've skiped ahead, try go get a poster image for the movie
    // XXX Because of https://bugzilla.mozilla.org/show_bug.cgi?id=730765
    // Its not clear whether this is working right. But it does
    // end up producing an image for each video.
    function doneSeeking() {
      URL.revokeObjectURL(url);
      try {
        var canvas = document.createElement('canvas');
        canvas.width = THUMBNAIL_WIDTH;
        canvas.height = THUMBNAIL_HEIGHT;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(previewPlayer, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
        metadata.poster = canvas.mozGetAsFile('poster', 'image/jpeg');
      }
      catch (e) {
        console.error('Failed to create a poster image:', e);
      }

      previewPlayer.src = '';
      callback(metadata);
    }
  }
}

function addVideo(videodata) {
  // If this is the first video we've found,
  // remove the "no videos" message
  showOverlay(null);

  var index = videos.length;
  videos.push(videodata);

  if (videodata.metadata.poster) {
    var poster = document.createElement('img');
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
  thumbnail.appendChild(title);
  thumbnail.appendChild(duration);

  var hr = document.createElement('hr');
  thumbnail.appendChild(hr);

  thumbnail.addEventListener('click', function(e) {
    showPlayer(videodata);
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
//
// XXX:
// If the user switches to the homescreen, we want to pause the video,
// of course, but we'd like to come right back to it and be able to resume
// in place. That's a little tricky because we get the mozvisiblitychange
// event after we get the mozfullscreenchange event. So for now, we just
// go back to the thumbnail view and loose the user's place when the user
// presses the Home button.
document.addEventListener('mozfullscreenchange', function() {
  if (document.mozFullScreenElement === null)
    hidePlayer();
});

/*
 * XXX
 * This code is commented out because the mozvisibilitychange event is
 * delivered after the mozfullscreenchange event, so by the time we get
 * it the video is already paused. We either need to get gecko to deliver
 * the events in the other order, or do something clever with timers, or
 * just add code to retain the user's current playback position for resuming
 * videos from the thumbnail screen
 *
 // Pause on visibility change
 document.addEventListener('mozvisibilitychange', function visibilityChange() {
 if (document.mozHidden && playing) {
 // If we've been hidden, stop playing the video
 pause();
 }
 else {
 // If we've just become visible again, go back into fullscreen mode
 // if we are supposed to be in fullscreen
 if (playerShowing && !document.mozFullScreenElement) {
 $('videoFrame').mozRequestFullScreen();
 }
 }
 });
*/

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
    hidePlayer();
  } else if (event.target == dom.sliderWrapper) {
    dragSlider(event);
  } else {
    setControlsVisibility(false);
  }
});

// Make the video fit the screen
function setPlayerSize() {
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

// show video player
function showPlayer(data) {
  currentVideo = data;

  // switch to the video player view
  dom.videoFrame.classList.remove('hidden');
  dom.play.classList.remove('paused');
  playerShowing = true;

  dom.videoTitle.textContent = currentVideo.metadata.title;
  dom.durationText.textContent = formatDuration(currentVideo.metadata.duration);
  dom.elapsedText.textContent = formatDuration(0);

  dom.elapsedTime.style.width = '0%';

  // Go into full screen mode
  dom.videoFrame.mozRequestFullScreen();

  // Show the controls briefly then fade out
  setControlsVisibility(true);
  controlFadeTimeout = setTimeout(function() {
    setControlsVisibility(false);
  }, 250);

  // Get the video file and start the player
  videodb.getFile(data.name, function(file) {
    var url = URL.createObjectURL(file);
    dom.player.src = url;
    setPlayerSize();
    play();
  });
}

function hidePlayer() {
  if (!playerShowing)
    return;

  // This method may be invoked when we're in full screen mode, or as
  // as a result of leaving fullscreen mode. If we're still full-screen
  // exit full screen mode
  if (document.mozFullScreenElement)
    document.mozCancelFullScreen();

  // switch to the video gallery view
  dom.videoFrame.classList.add('hidden');
  dom.videoBar.classList.remove('paused');
  playerShowing = false;

  // stop player
  dom.player.pause();
  dom.player.currentTime = 0;

  // Allow the screen to blank now.
  screenLock.unlock();
  screenLock = null;
}

// If the movie ends, and no controls are showing, go back to movie list
dom.player.addEventListener('ended', function() {
  if (!controlShowing)
    hidePlayer();
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
dom.player.addEventListener('timeupdate', function() {
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
});

// handle drags on the time slider
function dragSlider(e) {

  var isPaused = dom.player.paused;
  dragging = true;

  // We can't do anything if we don't know our duration
  if (dom.player.duration === Infinity)
    return;

  if (!isPaused) {
    pause();
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
    if (!isPaused) {
      play();
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
}

// XXX if we don't have metadata about the video name
// do the best we can with the file name
function fileNameToVideoName(filename) {
  filename = filename
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
