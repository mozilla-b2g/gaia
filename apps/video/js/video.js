'use strict';

window.addEventListener('DOMContentLoaded', function() {
  function $(id) {
    return document.getElementById(id);
  }
  var player = $('player');

  // if this is true then the video tag is showing
  // if false, then the gallery is showing
  var playerShowing = false;

  // keep the screen on when playing
  var screenLock;

  // same thing for the controls
  var controlShowing = false;

  // An array of data about each of the videos we know about.
  // XXX: for now we rebuild this array each time the app starts,
  // but ideally we'll store most of it in indexedDB.
  var videos = [];

  var currentVideo;  // The data for the current video

  var THUMBNAIL_WIDTH = 160;  // Just a guess at a size for now
  var THUMBNAIL_HEIGHT = 160;

  //
  // XXX
  // We want /sdcard storage. Right now, that will be the last
  // element in the array returned by getDeviceStorage().  But that is
  // fragile and may change, so this code needs to evolve with the
  // device storage API
  //
  var storages = navigator.getDeviceStorage('videos');
  var storage = storages[storages.length - 1];

  try {
    var cursor = storage.enumerate();
    cursor.onerror = function() {
      console.error('Error in DeviceStorage.enumerate()', cursor.error.name);
    };

    cursor.onsuccess = function() {
      if (!cursor.result)
        return;
      var file = cursor.result;

      // If this isn't a video, skip it
      if (file.type.substring(0, 6) !== 'video/') {
        cursor.continue();
        return;
      }

      // If it isn't playable, skip it
      var testplayer = document.createElement('video');
      if (!testplayer.canPlayType(file.type)) {
        cursor.continue();
        return;
      }

      // XXX if we don't have metadata about the video name
      // do the best we can with the file name
      function fileNameToVideoName(filename) {
        return filename
          .replace(/\.(webm|ogv|mp4)$/, '')
          .replace(/[_\.]/g, ' ');
      }

      // Otherwise, collect data about the video.
      // There are the things we know about it already
      var videodata = {
        name: file.name,
        title: fileNameToVideoName(file.name),
        type: file.type,
        size: file.size
      };

      // We get metadata asynchronously
      testplayer.preload = 'metadata';
      var url = URL.createObjectURL(file);
      testplayer.style.width = THUMBNAIL_WIDTH + 'px';
      testplayer.style.height = THUMBNAIL_HEIGHT + 'px';
      testplayer.src = url;
      testplayer.onloadedmetadata = function() {
        videodata.duration = testplayer.duration;
        videodata.width = testplayer.videoWidth;
        videodata.height = testplayer.videoHeight;

        testplayer.currentTime = 20;  // Skip ahead 20 seconds
        if (testplayer.seeking) {
          testplayer.onseeked = doneSeeking;
        }
        else
          doneSeeking();

        // After we've skiped ahead, try go get a poster image for the movie
        // XXX Because of https://bugzilla.mozilla.org/show_bug.cgi?id=730765
        // Its not clear whether this is working right. But it does
        // end up producing an image for each video.
        function doneSeeking() {
          try {
            var canvas = document.createElement('canvas');
            canvas.width = THUMBNAIL_WIDTH;
            canvas.height = THUMBNAIL_HEIGHT;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(testplayer, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
            videodata.poster = canvas.mozGetAsFile('poster', 'image/jpeg');
          }
          catch (e) {
            console.error('Failed to create a poster image:', e);
          }

          addVideo(videodata);
        }

        URL.revokeObjectURL(url);

        // And move on to the next video
        cursor.continue();
      };
    };
  }
  catch (e) {
    console.error('Exception while enumerating files:', e);
  }

  function addVideo(videodata) {
    // If this is the first video we've found,
    // remove the "no videos" message
    if (videos.length === 0)
      document.getElementById('novideos')
      .classList.add('hidden');

    var index = videos.length;
    videos.push(videodata);

    var poster = document.createElement('img');
    poster.src = URL.createObjectURL(videodata.poster);
    poster.onload = function() {
      URL.revokeObjectURL(poster.src);
    };

    var title = document.createElement('p');
    title.className = 'name';
    title.textContent = videodata.title;

    var duration = document.createElement('p');
    duration.className = 'time';
    if (isFinite(videodata.duration)) {
      var d = Math.round(videodata.duration);
      var mins = Math.floor(d / 60);
      var secs = d % 60;
      if (secs < 10) secs = '0' + secs;
      duration.textContent = mins + ':' + secs;
    }

    var thumbnail = document.createElement('li');
    thumbnail.appendChild(poster);
    thumbnail.appendChild(title);
    thumbnail.appendChild(duration);
    thumbnail.addEventListener('click', function(e) {
      showPlayer(videodata);
    });

    $('thumbnails').appendChild(thumbnail);
  }

  // When we exit fullscreen mode, stop playing the video.
  // This happens automatically when the user uses the back button.
  document.addEventListener('mozfullscreenchange', function() {
    if (document.mozFullScreenElement === null) {
      hidePlayer();
    }
  });

  // show|hide controls over the player
  $('videoControls').addEventListener('click', function(event) {
    if (!controlShowing) {
      this.classList.remove('hidden');
      controlShowing = true;
    }
    else if (this == event.target) {
      this.classList.add('hidden');
      controlShowing = false;
    }
  });

  // Make the video fit the screen
  function setPlayerSize() {
    var xscale = window.innerWidth / currentVideo.width;
    var yscale = window.innerHeight / currentVideo.height;
    var scale = Math.min(xscale, yscale);
    var width = currentVideo.width * scale;
    var height = currentVideo.height * scale;
    var left = (window.innerWidth - width) / 2;
    var top = (window.innerHeight - height) / 2;
    player.style.width = width + 'px';
    player.style.height = height + 'px';
    player.style.left = left + 'px';
    player.style.top = top + 'px';
  }

  // Rescale when window size changes. This should get called when
  // orientation changes and when we go into fullscreen
  window.addEventListener('resize', setPlayerSize);

  // show video player
  function showPlayer(data) {
    currentVideo = data;

    // switch to the video player view
    $('videoFrame').classList.remove('hidden');
    $('videoControls').classList.add('hidden');
    $('videoBar').classList.remove('paused');
    playerShowing = true;
    controlShowing = false;

    // Go into full screen mode
    $('videoFrame').mozRequestFullScreen();

    // Don't blank the screen while the video is playing
    screenLock = navigator.requestWakeLock('screen');

    // Get the video file and start the player
    storage.get(data.name).onsuccess = function(event) {
      var file = event.target.result;
      var url = URL.createObjectURL(file);
      player.src = url;
      player.play();
      setPlayerSize();
    }
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
    $('videoFrame').classList.add('hidden');
    $('videoBar').classList.remove('paused');
    playerShowing = false;

    // stop player
    player.pause();
    player.currentTime = 0;

    // Allow the screen to blank now.
    screenLock.unlock();
    screenLock = null;
  }

  // If the user clicks the close button, exit the playing movie
  $('close').addEventListener('click', hidePlayer);

  // If the movie ends, and no controls are showing, go back to movie list
  player.addEventListener('ended', function() {
    if (!controlShowing)
      hidePlayer();
  });

  // Handle clicks on the play/pause button
  $('play').addEventListener('click', function() {
    if (player.paused) {
      // Switch the button icon
      this.classList.remove('paused');

      // Start playing
      player.play();

      // Don't let the screen go to sleep
      if (!screenLock)
        screenLock = navigator.requestWakeLock('screen');
    }
    else {
      // Switch the button icon
      this.classList.add('paused');

      // Stop playing the video
      player.pause();

      // Let the screen go to sleep
      if (screenLock) {
        screenLock.unlock();
        screenLock = null;
      }
    }
  });

  // XXX: the back and forward buttons aren't working for my webm videos

  // Back 15s
  $('rwd').addEventListener('click', function() {
    player.currentTime -= 15;
  });

  // Forward 15s
  $('fwd').addEventListener('click', function() {
    player.currentTime += 15;
  });

  var playHead = $('playHead');
  var timeSlider = $('timeSlider');
  var elapsedTime = $('elapsedTime');
  var dragging = false;

  // XXX The progress bar doesn't update for my ogv video because
  // the <video> elememt can't figure out its duration.

  // Update the progress bar and play head as the video plays
  player.addEventListener('timeupdate', function() {
    if (!controlShowing)
      return;

    // We can't update a progress bar if we don't know how long
    // the video is. It is kind of a bug that the <video> element
    // can't figure this out for ogv videos.
    if (player.duration === Infinity)
      return;

    if (player.duration === 0)
      return;

    var percent = (player.currentTime / player.duration) * 100 + '%';

    elapsedTime.style.width = percent;
    // Don't move the play head if the user is dragging it.
    if (!dragging)
      playHead.style.left = percent;
  });

  // handle drags on the time slider
  playHead.addEventListener('mousedown', function() {
    // We can't do anything if we don't know our duration
    if (player.duration === Infinity)
      return;

    dragging = true;

    // Capture all mouse moves and the mouse up
    document.addEventListener('mousemove', mousemoveHandler, true);
    document.addEventListener('mouseup', mouseupHandler, true);

    function position(event) {
      var rect = timeSlider.getBoundingClientRect();
      var position = (event.clientX - rect.left) / rect.width;
      position = Math.max(position, 0);
      position = Math.min(position, 1);
      return position;
    }

    function mouseupHandler(event) {
      document.removeEventListener('mousemove', mousemoveHandler, true);
      document.removeEventListener('mouseup', mouseupHandler, true);

      var pos = position(event);
      var percent = pos * 100 + '%';
      playHead.style.left = percent;
      elapsedTime.style.width = percent;

      player.currentTime = player.duration * pos;

      dragging = false;
    }

    function mousemoveHandler(event) {
      var pos = position(event);
      var percent = pos * 100 + '%';
      playHead.style.left = percent;
      elapsedTime.style.width = percent;
    }
  });
});

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showBody() {
  var html = document.querySelector('html');
  var lang = document.mozL10n.language;
  html.lang = lang.code;
  html.dir = lang.direction;
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
