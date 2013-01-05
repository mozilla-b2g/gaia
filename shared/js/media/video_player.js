'use strict';

// Create a <video> element and  <div> containing a video player UI and
// add them to the specified container. The UI requires a GestureDetector
// to be running for the container or one of its ancestors.
function VideoPlayer(container) {
  if (typeof container === 'string')
    container = document.getElementById(container);

  function newelt(parent, type, classes) {
    var e = document.createElement(type);
    if (classes)
      e.className = classes;
    parent.appendChild(e);
    return e;
  }

  // This copies the controls structure of the Video app
  var player = newelt(container, 'video', 'videoPlayer');
  var controls = newelt(container, 'div', 'videoPlayerControls');
  var playbutton = newelt(controls, 'button', 'videoPlayerPlayButton');
  var footer = newelt(controls, 'div', 'videoPlayerFooter hidden');
  var pausebutton = newelt(footer, 'button', 'videoPlayerPauseButton');
  var slider = newelt(footer, 'div', 'videoPlayerSlider');
  var elapsedText = newelt(slider, 'span', 'videoPlayerElapsedText');
  var progress = newelt(slider, 'div', 'videoPlayerProgress');
  var backgroundBar = newelt(progress, 'div', 'videoPlayerBackgroundBar');
  var elapsedBar = newelt(progress, 'div', 'videoPlayerElapsedBar');
  var playHead = newelt(progress, 'div', 'videoPlayerPlayHead');
  var durationText = newelt(slider, 'span', 'videoPlayerDurationText');

  this.player = player;
  this.controls = controls;

  player.preload = 'metadata';

  var self = this;
  var controlsHidden = false;
  var dragging = false;
  var pausedBeforeDragging = false;
  var screenLock; // keep the screen on when playing
  var endedTimer;
  var rotation;   // Do we have to rotate the video? Set by load()

  this.load = function(url, rotate) {
    rotation = rotate || 0;
    player.src = url;
  };

  // Call this when the container size changes
  this.setPlayerSize = setPlayerSize;

  // Set up everything for the initial paused state
  this.pause = function pause() {
    // Pause video playback
    player.pause();

    // Hide the pause button and slider
    footer.classList.add('hidden');
    controlsHidden = true;

    // Show the big central play button
    playbutton.classList.remove('hidden');

    // Unlock the screen so it can sleep on idle
    if (screenLock) {
      screenLock.unlock();
      screenLock = null;
    }

    if (this.onpaused)
      this.onpaused();
  };

  // Set up the playing state
  this.play = function play() {
    // If we're at the end of the video, restart at the beginning.
    // This seems to happen automatically when an 'ended' event was fired.
    // But some media types don't generate the ended event and don't
    // automatically go back to the start.
    if (player.currentTime >= player.duration - 0.5)
      player.currentTime = 0;

    // Start playing the video
    player.play();

    // Hide the play button
    playbutton.classList.add('hidden');

    // Show the controls
    footer.classList.remove('hidden');
    controlsHidden = false;

    // Don't let the screen go to sleep
    if (!screenLock)
      screenLock = navigator.requestWakeLock('screen');

    if (this.onplaying)
      this.onplaying();
  };

  // Hook up the play button
  playbutton.addEventListener('tap', function(e) {
    // If we're paused, go to the play state
    if (player.paused) {
      self.play();
    }
    e.stopPropagation();
  });

  // Hook up the pause button
  pausebutton.addEventListener('tap', function(e) {
    self.pause();
    e.stopPropagation();
  });

  // A click anywhere else on the screen should toggle the footer
  // But only when the video is playing.
  controls.addEventListener('tap', function(e) {
    if (e.target === controls && !player.paused) {
      footer.classList.toggle('hidden');
      controlsHidden = !controlsHidden;
    }
  });

  // Set the video size and duration when we get metadata
  player.onloadedmetadata = function() {
    durationText.textContent = formatTime(player.duration);
    setPlayerSize();
    // start off in the paused state
    self.pause();
  };

  // Also resize the player on a resize event
  // (when the user rotates the phone)
  window.addEventListener('resize', function() {
    setPlayerSize();
  });

  // If we reach the end of a video, reset to beginning
  // This isn't always reliable, so we also set a timer in updateTime()
  player.onended = ended;

  function ended() {
    if (dragging)
      return;
    if (endedTimer) {
      clearTimeout(endedTimer);
      endedTimer = null;
    }
    self.pause();
  };

  // Update the slider and elapsed time as the video plays
  player.ontimeupdate = updateTime;

  // Set the elapsed time and slider position
  function updateTime() {
    if (!controlsHidden) {
      elapsedText.textContent = formatTime(player.currentTime);

      // We can't update a progress bar if we don't know how long
      // the video is. It is kind of a bug that the <video> element
      // can't figure this out for ogv videos.
      if (player.duration === Infinity || player.duration === 0)
        return;

      var percent = (player.currentTime / player.duration) * 100 + '%';
      elapsedBar.style.width = percent;
      playHead.style.left = percent;
    }

    // Since we don't always get reliable 'ended' events, see if
    // we've reached the end this way.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=783512
    // If we're within 1 second of the end of the video, register
    // a timeout a half a second after we'd expect an ended event.
    if (!endedTimer) {
      if (!dragging && player.currentTime >= player.duration - 1) {
        var timeUntilEnd = (player.duration - player.currentTime + .5);
        endedTimer = setTimeout(ended, timeUntilEnd * 1000);
      }
    }
    else if (dragging && player.currentTime < player.duration - 1) {
      // If there is a timer set and we drag away from the end, cancel the timer
      clearTimeout(endedTimer);
      endedTimer = null;
    }
  }

  // Make the video fit the container
  function setPlayerSize() {
    var containerWidth = container.clientWidth;
    var containerHeight = container.clientHeight;

    // Don't do anything if we don't know our size.
    // This could happen if we get a resize event before our metadata loads
    if (!player.videoWidth || !player.videoHeight)
      return;

    var width, height; // The size the video will appear, after rotation
    switch (rotation) {
    case 0:
    case 180:
      width = player.videoWidth;
      height = player.videoHeight;
      break;
    case 90:
    case 270:
      width = player.videoHeight;
      height = player.videoWidth;
    }

    var xscale = containerWidth / width;
    var yscale = containerHeight / height;
    var scale = Math.min(xscale, yscale);

    // Scale large videos down, and scale small videos up.
    // This might reduce image quality for small videos.
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

    player.style.transform = transform;
  }

  // handle drags on the time slider
  slider.addEventListener('pan', function pan(e) {
    e.stopPropagation();
    // We can't do anything if we don't know our duration
    if (player.duration === Infinity)
      return;

    if (!dragging) {  // Do this stuff on the first pan event only
      dragging = true;
      pausedBeforeDragging = player.paused;
      if (!pausedBeforeDragging) {
        player.pause();
      }
    }

    var rect = backgroundBar.getBoundingClientRect();
    var position = (e.detail.position.clientX - rect.left) / rect.width;
    var pos = Math.min(Math.max(position, 0), 1);
    player.currentTime = player.duration * pos;
    updateTime();
  });

  slider.addEventListener('swipe', function swipe(e) {
    e.stopPropagation();
    dragging = false;
    if (player.currentTime >= player.duration) {
      self.pause();
    } else if (!pausedBeforeDragging) {
      player.play();
    }
  });

  function formatTime(time) {
    function padLeft(num, length) {
      var r = String(num);
      while (r.length < length) {
        r = '0' + r;
      }
      return r;
    }

    time = Math.round(time);
    var minutes = Math.floor(time / 60);
    var seconds = time % 60;
    if (minutes < 60) {
      return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
    }
    return '';
  }
}

VideoPlayer.prototype.hide = function() {
  this.player.style.display = 'none';
  this.controls.style.display = 'none';
};

VideoPlayer.prototype.show = function() {
  this.player.style.display = 'block';
  this.controls.style.display = 'block';
};
