'use strict';
/* global Format */

//
// Create a <video> element and  <div> containing a video player UI and
// add them to the specified container. The UI requires a GestureDetector
// to be running for the container or one of its ancestors.
//
// Some devices have only a single hardware video decoder and can only
// have one video tag playing anywhere at once. So this class is careful
// to only load content into a <video> element when the user really wants
// to play it. At other times it displays a poster image for the video.
// Initially, it displays the poster image. Pressing play starts the video.
// Pausing pauses the video but does not revert to the poster. Finishing the
// video reverts to the initial state with the poster image displayed.
// If we get a visiblitychange event saying that we've been hidden, we
// remember the playback position, pause the video take a temporary
// screenshot and display it, and unload the video. If shown again
// and if the user clicks play again, we resume the video where we left off.
//
// WARNING (bug 1135278):
//
// The VideoPlayer object registers event listeners on the window object
// and never unregisters them. This means that VideoPlayer objects will
// never be garbage collected since the window will always have a reference
// to every one that has been created.
//
// A conscious decision has been made to not fix this issue because:
//
// 1) Currently only gallery and camera use the object and they use a
//    fixed number of objects whose lifetime is the same as that of the
//    app.
// 2) We are moving towards replacing this VideoPlayer object with web
//    components (bug 1117885, bug 1131321)
//
function VideoPlayer(container) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }

  // Add a class to the container so we could find it later and use it as
  // a key in the instance weakmap.
  container.classList.add('video-player-container');
  VideoPlayer.instancesToLocalize.set(container, this);

  function newelt(parent, type, classes, l10n_id, attributes) {
    var e = document.createElement(type);
    if (classes) {
      e.className = classes;
    }
    if (l10n_id) {
      e.dataset.l10nId = l10n_id;
    }
    if (attributes) {
      for (var attribute in attributes) {
        e.setAttribute(attribute, attributes[attribute]);
      }
    }
    parent.appendChild(e);
    return e;
  }

  // This copies the controls structure of the Video app
  var poster = newelt(container, 'img', 'videoPoster');
  var player = newelt(container, 'video', 'videoPlayer', null,
                      { 'aria-hidden': true }); // Since Video Player controls
                                                // are custom, we need to hide
                                                // the video element to not
                                                // confuse screen reader users.
  var controls = newelt(container, 'div', 'videoPlayerControls');
  var playbutton = newelt(controls, 'button', 'videoPlayerPlayButton',
                          'playbackPlay');
  var footer = newelt(controls, 'div', 'videoPlayerFooter hidden');
  var pausebutton = newelt(footer, 'button', 'videoPlayerPauseButton',
                           'playbackPause');
  var slider = newelt(footer, 'div', 'videoPlayerSlider', null,
                      { 'role': 'slider', 'aria-valuemin': 0 });
  var elapsedText = newelt(slider, 'span', 'videoPlayerElapsedText');
  var progress = newelt(slider, 'div', 'videoPlayerProgress');
  var backgroundBar = newelt(progress, 'div', 'videoPlayerBackgroundBar');
  var elapsedBar = newelt(progress, 'div', 'videoPlayerElapsedBar');
  var playHead = newelt(progress, 'div', 'videoPlayerPlayHead');
  var durationText = newelt(slider, 'span', 'videoPlayerDurationText');
  // expose fullscreen button, so that client can manipulate it directly
  var fullscreenButton = newelt(slider, 'button', 'videoPlayerFullscreenButton',
                                'playbackFullscreen');

  this.poster = poster;
  this.player = player;
  this.controls = controls;
  this.playing = false;

  player.preload = 'metadata';
  player.mozAudioChannelType = 'content';

  var self = this;
  var controlsHidden = false;
  var dragging = false;
  var pausedBeforeDragging = false;
  var endedTimer;
  var videourl;   // the url of the video to play
  var posterurl;  // the url of the poster image to display
  var rotation;   // Do we have to rotate the video? Set by load()
  var videotimestamp;
  var orientation = 0; // current player orientation

  // These are the raw (unrotated) size of the poster image, which
  // may have the same size as the video. We may find when we actually
  // load the video they are different and resize the video element.
  var videowidth, videoheight;
  var posterwidth, posterheight;

  var playbackTime;
  var capturedFrame;

  this.load = function(video, posterimage, width, height, rotate, timestamp) {
    this.reset();
    videourl = video;
    posterurl = posterimage;
    rotation = rotate || 0;
    videowidth = width;
    videoheight = height;
    posterwidth = width;
    posterheight = height;
    videotimestamp = timestamp;

    // If a locale is present and ready, go ahead and localize now.
    if (navigator.mozL10n.readyState === 'complete') {
      this.localize();
    }

    this.init();
    setPlayerSize();
  };

  this.reset = function() {
    videotimestamp = 0;
    hidePlayer();
    hidePoster();
  };

  this.init = function() {
    playbackTime = 0;
    hidePlayer();
    showPoster();
    this.pause();
  };

  function hidePlayer() {
    player.style.display = 'none';
    player.removeAttribute('src');
    player.load();
    self.playerShowing = false;
  }

  function showPlayer() {
    if (self.onloading) {
      self.onloading();
    }

    player.style.display = 'block';
    player.src = videourl;
    self.playerShowing = true;

    // Verify that our guess at the video size is correct once we have loaded
    // the metadata. This will happen if the poster image size differs.
    player.onloadedmetadata = function() {
      player.onloadedmetadata = null;
      if (videowidth != player.videoWidth ||
          videoheight != player.videoHeight)
      {
        videowidth = player.videoWidth;
        videoheight = player.videoHeight;
        setPlayerSize(true);
      }
    };

    // The only place we call showPlayer() is from the play() function.
    // If play() has to show the player, call it again when we're ready to play.
    player.oncanplay = function() {
      player.oncanplay = null;
      if (playbackTime !== 0) {
        player.currentTime = playbackTime;
      }
      self.play();
    };
  }

  function hidePoster() {
    poster.style.display = 'none';
    poster.removeAttribute('src');
    if (capturedFrame) {
      URL.revokeObjectURL(capturedFrame);
      capturedFrame = null;
    }
  }

  function showPoster() {
    poster.style.display = 'block';
    if (capturedFrame) {
      poster.src = capturedFrame;
    }
    else {
      poster.src = posterurl;
    }
  }

  // Call this when the container size changes
  this.setPlayerSize = setPlayerSize;

  // Call this when phone orientation changes
  this.setPlayerOrientation = setPlayerOrientation;

  this.pause = function pause() {
    // Pause video playback
    if (self.playerShowing) {
      this.playing = false;
      player.pause();
    }

    // Hide the pause button and slider
    footer.classList.add('hidden');
    controlsHidden = true;

    // Show the big central play button
    playbutton.classList.remove('hidden');

    if (this.onpaused) {
      this.onpaused();
    }
  };

  // Set up the playing state
  this.play = function play() {
    if (!this.playerShowing) {
      // If we're displaying the poster image, we have to switch
      // to the player first. When the player is ready it wil call this
      // function again.
      hidePoster();
      showPlayer();
      return;
    }

    // Hide the play button
    playbutton.classList.add('hidden');
    this.playing = true;

    // Start playing the video
    player.play();

    // Show the controls
    footer.classList.remove('hidden');
    controlsHidden = false;

    if (this.onplaying) {
      this.onplaying();
    }
  };

  fullscreenButton.addEventListener('tap', function(e) {
    if (self.onfullscreentap) {
      // If the event propagate to controller, videoplayer will hide
      // the toolbar, so we stopPropagation here.
      e.stopPropagation();
      self.onfullscreentap();
    }
  });

  // Hook up the play button
  playbutton.addEventListener('tap', function(e) {
    // If we're not showing the player or are paused, go to the play state
    if (!self.playerShowing || player.paused) {
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
  container.addEventListener('tap', function(e) {
    if ((e.target === player || e.target === container) && !player.paused) {
      footer.classList.toggle('hidden');
      controlsHidden = !controlsHidden;
    }
  });

  // Set the video duration when we get metadata
  player.onloadedmetadata = function() {
    var formattedTime = formatTime(player.duration);
    durationText.textContent = formattedTime;
    slider.setAttribute('aria-valuemax', player.duration);
    // This sets the aria-label to a localized slider description
    navigator.mozL10n.setAttributes(slider, 'playbackSeekBar',
                                    {'duration': formattedTime});
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
    if (dragging) {
      return;
    }
    if (endedTimer) {
      clearTimeout(endedTimer);
      endedTimer = null;
    }
    self.pause();
    self.init();
  }

  // Update the slider and elapsed time as the video plays
  player.ontimeupdate = updateTime;

  // Set the elapsed time and slider position
  function updateTime() {
    if (!controlsHidden) {
      var formattedTime = formatTime(player.currentTime);
      elapsedText.textContent = formattedTime;
      slider.setAttribute('aria-valuenow', player.currentTime);
      slider.setAttribute('aria-valuetext', formattedTime);

      // We can't update a progress bar if we don't know how long
      // the video is. It is kind of a bug that the <video> element
      // can't figure this out for ogv videos.
      if (player.duration === Infinity || player.duration === 0) {
        return;
      }

      var percent = (player.currentTime / player.duration) * 100 + '%';
      var startEdge =
        navigator.mozL10n.language.direction === 'ltr' ? 'left' : 'right';
      elapsedBar.style.width = percent;
      playHead.style[startEdge] = percent;
    }

    // Since we don't always get reliable 'ended' events, see if
    // we've reached the end this way.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=783512
    // If we're within 1 second of the end of the video, register
    // a timeout a half a second after we'd expect an ended event.
    if (!endedTimer) {
      if (!dragging && player.currentTime >= player.duration - 1) {
        var timeUntilEnd = (player.duration - player.currentTime + 0.5);
        endedTimer = setTimeout(ended, timeUntilEnd * 1000);
      }
    }
    else if (dragging && player.currentTime < player.duration - 1) {
      // If there is a timer set and we drag away from the end, cancel the timer
      clearTimeout(endedTimer);
      endedTimer = null;
    }
  }

  // Pause and unload the video if we're hidden so that other apps
  // can use the video decoder hardware.
  window.addEventListener('visibilitychange', visibilityChanged);

  function visibilityChanged() {
    if (document.hidden) {
      // If we're just showing the poster image when we're hidden
      // then we don't have to do anything special
      if (!self.playerShowing) {
        return;
      }

      self.pause();

      // If we're not at the beginning of the video, capture a
      // temporary poster image to display when we come back
      if (player.currentTime !== 0) {
        playbackTime = player.currentTime;
        captureCurrentFrame(function(blob) {
          capturedFrame = URL.createObjectURL(blob);
          hidePlayer();
          showPoster();
        });
      }
      else {
        // Even if we don't capture a frame, hide the video
        hidePlayer();
        showPoster();
      }
    }
  }

  function captureCurrentFrame(callback) {
    var canvas = document.createElement('canvas');
    canvas.width = videowidth;
    canvas.height = videoheight;
    var context = canvas.getContext('2d');
    context.drawImage(player, 0, 0);
    canvas.toBlob(callback);
  }

  function createTransform(containerWidth, containerHeight,
                           givenWidth, givenHeight)
  {
    var width, height; // The size the video will appear, after rotation
    switch (rotation) {
    case 0:
    case 180:
      width = givenWidth;
      height = givenHeight;
      break;
    case 90:
    case 270:
      width = givenHeight;
      height = givenWidth;
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
    return transform;
  }

  // Make the video fit the container
  function setPlayerSize(playerOnly) {
    var containerWidth = container.clientWidth;
    var containerHeight = container.clientHeight;

    // Don't do anything if we don't know our size.
    // This could happen if we get a resize event before our metadata loads
    if (!videowidth || !videoheight || !posterwidth || !posterheight) {
      return;
    }
    player.style.transform = createTransform(containerWidth, containerHeight,
                                             videowidth, videoheight);
    if (playerOnly) {
      return;
    }
    poster.style.transform = createTransform(containerWidth, containerHeight,
                                             posterwidth, posterheight);
  }

  // Update current player orientation
  function setPlayerOrientation(newOrientation) {
    orientation = newOrientation;
  }

  // Compute position based on player orientation
  function computePosition(panPosition, rect) {
    var position;
    switch (orientation) {
      case 0:
        position = (panPosition.clientX - rect.left) / rect.width;
        break;
      case 90:
        position = (rect.bottom - panPosition.clientY) / rect.height;
        break;
      case 180:
        position = (rect.right - panPosition.clientX) / rect.width;
        break;
      case 270:
        position = (panPosition.clientY - rect.top) / rect.height;
        break;
    }
    return position;
  }

  // handle drags on the time slider
  slider.addEventListener('pan', function pan(e) {
    e.stopPropagation();
    // We can't do anything if we don't know our duration
    if (player.duration === Infinity) {
      return;
    }

    if (!dragging) {  // Do this stuff on the first pan event only
      dragging = true;
      pausedBeforeDragging = player.paused;
      if (!pausedBeforeDragging) {
        player.pause();
      }
    }

    var rect = backgroundBar.getBoundingClientRect();
    var position = computePosition(e.detail.position, rect);
    var pos = Math.min(Math.max(position, 0), 1);
    // Handle pos so that slider moves correct way
    // when user drags it for RTL locales
    if (navigator.mozL10n.language.direction === 'rtl') {
      pos = 1 - pos;
    }
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

  slider.addEventListener('keypress', function(e) {
    // The standard accessible control for sliders is arrow up/down keys.
    // Our screenreader synthesizes those events on swipe up/down gestures.
    // Currently, we only allow screen reader users to adjust sliders with a
    // constant step size (there is no page up/down equivalent). In the case
    // of videos, we make sure that the maximum amount of steps for the entire
    // duration is 20, or 2 second increments if the duration is less then 40
    // seconds.
    var step = Math.max(player.duration/20, 2);
    if (e.keyCode == e.DOM_VK_DOWN) {
      player.currentTime -= step;
    } else if (e.keyCode == e.DOM_VK_UP) {
      player.currentTime += step;
    }
  });

  function formatTime(time) {
    time = Math.round(time);
    var minutes = Math.floor(time / 60);
    var seconds = time % 60;
    if (minutes < 60) {
      return Format.padLeft(minutes, 2, '0') + ':' +
        Format.padLeft(seconds, 2, '0');
    } else {
      var hours = Math.floor(minutes / 60);
      minutes = Math.round(minutes % 60);
      return hours + ':' + Format.padLeft(minutes, 2, '0') + ':' +
        Format.padLeft(seconds, 2, '0');
    }
    return '';
  }

  // pause the video player if user unplugs headphone
  var acm = navigator.mozAudioChannelManager;
  if (acm) {
    acm.addEventListener('headphoneschange', function onheadphoneschange() {
      if (!acm.headphones && self.playing) {
        self.pause();
      }
    });
  }

  this.localize = function() {
    // XXX: Ideally, we would add the duration too, but that is not
    // available via fileinfo metadata yet.
    var label;
    var portrait = videowidth < videoheight;
    if (rotation == 90 || rotation == 270) {
      // If rotated sideways, then width and height are swapped.
      portrait = !portrait;
    }

    var orientation = navigator.mozL10n.get(
      portrait ? 'orientationPortrait' : 'orientationLandscape');
    if (videotimestamp) {
      var locale_entry = navigator.mozL10n.get(
        'videoDescription', { orientation: orientation });
      if (!self.dtf) {
        self.dtf = new navigator.mozL10n.DateTimeFormat();
      }
      label = self.dtf.localeFormat(videotimestamp, locale_entry);
    } else {
      label = navigator.mozL10n.get(
        'videoDescriptionNoTimestamp', { orientation: orientation });
    }
    poster.setAttribute('aria-label', label);
  };
}

VideoPlayer.prototype.hide = function() {
  // Call reset() to hide the poster and player
  this.controls.style.display = 'none';
};

VideoPlayer.prototype.show = function() {
  // Call init() to show the poster
  this.controls.style.display = 'block';
};

VideoPlayer.instancesToLocalize = new WeakMap();

navigator.mozL10n.ready(function() {
  // Retrieve VideoPlayer instances by searching for container nodes.
  for (var container of document.querySelectorAll('.video-player-container')) {
    var instance = VideoPlayer.instancesToLocalize.get(container);
    if (instance) {
      instance.localize();
    }
  }
});
