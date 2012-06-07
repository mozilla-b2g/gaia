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

  //
  // XXX
  // We want /sdcard storage. Right now, that will be the last
  // element in the array returned by getDeviceStorage().  But that is
  // fragile and may change, so this code needs to evolve with the
  // device storage API
  //
  var storages = navigator.getDeviceStorage('videos');
  var storage = storages[storages.length-1];

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
      if (file.type.substring(0,6) !== 'video/') {
        cursor.continue();
        return;
      }
      
      // If it isn't playable, skip it
      var testplayer = document.createElement('video');
      if (!testplayer.canPlayType(file.type)) {
        cursor.continue();
        return;
      }

      // Otherwise, collect data about the video.
      // There are the things we know about it already
      var videodata = {
        name: file.name,
        type: file.type,
        size: file.size 
      };
      
      // We get metadata asynchronously
      testplayer.preload = "metadata";
      var url = URL.createObjectURL(file);
      testplayer.src = url;
      testplayer.onloadedmetadata = function() {
        videodata.duration = testplayer.duration;
        videodata.width = testplayer.videoWidth;
        videodata.height = testplayer.videoHeight;

        // XXX try to get a thumbnail from 30 seconds in or something?

        // add this video and its metadata to our list
        addVideo(videodata);

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
    // poster.src = videodata.poster;

    var title = document.createElement('p');
    title.className = 'name';
    title.textContent = videodata.name;

    var duration = document.createElement('p');
    duration.className = 'time';
    if (isFinite(videodata.duration)) {
      var d = Math.round(videodata.duration);
      duration.textContent = Math.floor(d/60) + ":" + d%60;
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

    console.log("setting video to", width, height, left, top);

    player.style.width = width + "px";
    player.style.height = height + "px";
    player.style.left = left + "px";
    player.style.top = top + "px";
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
    $('videoFrame').mozRequestFullScreen();

    // Get the video file and start the player
    storage.get(data.name).onsuccess = function(event) {
      var file = event.target.result;
      var url = URL.createObjectURL(file);
      player.src = url;
      player.play();
      setPlayerSize();
      playerShowing = true;
      controlShowing = false;
      screenLock = navigator.requestWakeLock('screen');
    }
  }

  function hidePlayer() {
    if (!playerShowing)
      return;

    // switch to the video gallery view
    document.mozCancelFullScreen();
    $('videoFrame').classList.add('hidden');
    $('videoBar').classList.remove('paused');

    // stop player
    player.pause();
    player.currentTime = 0;

    playerShowing = false;
    screenLock.unlock();
  }

  $('close').addEventListener('click', hidePlayer);
  player.addEventListener('ended', function() {
    if (!controlShowing)
      hidePlayer();
  });
  window.addEventListener('keyup', function(event) {
    if (playerShowing && event.keyCode == event.DOM_VK_ESCAPE) {
      hidePlayer();
      event.preventDefault();
    }
    if (event.keyCode == event.DOM_VK_HOME) {
      hidePlayer();
    }
  });

  // control buttons: play|pause, rwd|fwd
  $('videoBar').addEventListener('click', function(event) {
    if (!controlShowing)
      return;
    switch (event.target.id) {
      case 'play':
        if (player.paused) {
          this.classList.remove('paused');
          player.play();
        }
        else {
          this.classList.add('paused');
          player.pause();
        }
        break;
      case 'rwd':
        player.currentTime -= 15;
        break;
      case 'fwd':
        player.currentTime += 15;
        break;
    }
  });

  // handle drags/clicks on the time slider
  var isDragging = false;
  var playHead = $('playHead');
  var timeSlider = $('timeSlider');
  var elapsedTime = $('elapsedTime');
  var rect = null;
  function getTimePos(event) {
    if (!rect)
      rect = timeSlider.getBoundingClientRect();
    return (event.clientY - rect.top) / rect.height;
  }
  function setProgress(event) {
    var progress = isDragging ?
      getTimePos(event) : player.currentTime / player.duration;
    var pos = progress * 100 + '%';
    playHead.style.left = pos;
    elapsedTime.style.width = pos;
  }
  function setCurrentTime(event) {
    if (controlShowing)
      player.currentTime = getTimePos(event) * player.duration;
  }
  player.addEventListener('timeupdate', setProgress);
  playHead.addEventListener('mousemove', setProgress);
  playHead.addEventListener('mousedown', function() {
    if (controlShowing)
      isDragging = true;
  });
  timeSlider.addEventListener('mouseup', setCurrentTime);
  timeSlider.addEventListener('mouseout', function(event) {
    if (isDragging)
      setCurrentTime(event);
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
