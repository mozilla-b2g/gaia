'use strict';

/*
 * This is a stripped down version of video.js that handles the view activity
 * and displays streaming videos specified by url.
 *
 * Unfortunately, there is a fair bit of code duplication between this
 * file and video.js, but we are too close to the v1 deadline to refactor
 * the shared code into a single shared file. If the video player UI changes
 * those changes will have to be made in both video.js and view.js
 */
navigator.mozSetMessageHandler('activity', function viewVideo(activity) {
  var dom = {};            // document elements
  var screenLock;          // keep the screen on when playing
  var playing = false;
  var endedTimer;
  var controlShowing = false;
  var controlFadeTimeout = null;
  var dragging = false;
  var data = activity.source.data;
  var type = data.type;
  var url = data.url;
  var title = data.title || '';

  initUI();

  if (type !== 'video/youtube') {
    showPlayer(url, title);
    return;
  }

  // This is the youtube case. We need to ensure that we have been
  // localized before trying to fetch the youtube video so youtube
  // knows what language to send errors to us in.
  // XXX: show a loading spinner here?
  if (navigator.mozL10n.readyState === 'complete') {
    getYoutubeVideo(url, showPlayer, handleError);
  }
  else {
    window.addEventListener('localized', function handleLocalized() {
      window.removeEventListener('localized', handleLocalized);
      getYoutubeVideo(url, showPlayer, handleError);
    });
  }

  function handleError(message) {
    // Start with a localized error message prefix
    var error = navigator.mozL10n.get('youtube-error-prefix');

    if (message) {
      // Remove any HTML tags from the youtube error message
      var div = document.createElement('div');
      div.innerHTML = message;
      message = div.textContent;
      error += '\n\n' + message;
    }

    // Display the error message to the user
    // XXX Using alert() is simple but ugly.
    alert(error);

    // When the user clicks okay, end the activity.
    // Do this on a timer so the alert has time to go away.
    // Otherwise it appears to remain up over the caller and the user
    // has to dismiss it twice. See bug 825435.
    setTimeout(function() { activity.postResult({}); }, 50);
  }

  function initUI() {
    // Fullscreen mode and inline activities don't seem to play well together
    // so we'll play the video without going into fullscreen mode.

    // Get all the elements we use by their id
    var ids = ['player', 'videoFrame', 'videoControls',
               'close', 'play', 'playHead',
               'elapsedTime', 'video-title', 'duration-text', 'elapsed-text',
               'slider-wrapper', 'spinner-overlay'];

    ids.forEach(function createElementRef(name) {
      dom[toCamelCase(name)] = document.getElementById(name);
    });

    function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    }

    dom.player.mozAudioChannelType = 'content';

    // show|hide controls over the player
    dom.videoControls.addEventListener('mousedown', playerMousedown);

    // Rescale when window size changes. This should get called when
    // orientation changes.
    window.addEventListener('resize', function() {
      if (dom.player.readyState !== dom.player.HAVE_NOTHING) {
        setPlayerSize();
      }
    });

    dom.player.addEventListener('timeupdate', timeUpdated);
    dom.player.addEventListener('ended', playerEnded);

    // Set the 'lang' and 'dir' attributes to <html> when the page is translated
    window.addEventListener('localized', function showBody() {
      document.documentElement.lang = navigator.mozL10n.language.code;
      document.documentElement.dir = navigator.mozL10n.language.direction;
    });
  }

  function setControlsVisibility(visible) {
    dom.videoControls.classList[visible ? 'remove' : 'add']('hidden');
    controlShowing = visible;
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
      if (dom.player.paused)
        play();
      else
        pause();
    } else if (event.target == dom.close) {
      done();
    } else if (event.target == dom.sliderWrapper) {
      dragSlider(event);
    } else {
      setControlsVisibility(false);
    }
  }

  function done() {
    // release our screen lock
    pause();

    // Release any video resources
    dom.player.removeAttribute('src');
    dom.player.load();

    // End the activity
    activity.postResult({});
  }

  // Make the video fit the container
  function setPlayerSize() {
    var containerWidth = window.innerWidth;
    var containerHeight = window.innerHeight;

    // Don't do anything if we don't know our size.
    // This could happen if we get a resize event before our metadata loads
    if (!dom.player.videoWidth || !dom.player.videoHeight)
      return;

    var width = dom.player.videoWidth;
    var height = dom.player.videoHeight;
    var xscale = containerWidth / width;
    var yscale = containerHeight / height;
    var scale = Math.min(xscale, yscale);

    // scale large videos down, and scale small videos up
    width *= scale;
    height *= scale;

    var left = ((containerWidth - width) / 2);
    var top = ((containerHeight - height) / 2);

    var transform = 'translate(' + left + 'px,' + top + 'px)';

    transform += ' scale(' + scale + ')';

    dom.player.style.transform = transform;
  }

  // show video player
  function showPlayer(url, title) {
    // Dismiss the spinner
    dom.spinnerOverlay.classList.add('hidden');

    dom.videoTitle.textContent = title || '';
    dom.player.src = url;
    dom.player.onloadedmetadata = function() {
      dom.durationText.textContent = formatDuration(dom.player.duration);
      timeUpdated();

      dom.play.classList.remove('paused');
      setPlayerSize();

      dom.player.currentTime = 0;

      // Show the controls briefly then fade out
      setControlsVisibility(true);
      controlFadeTimeout = setTimeout(function() {
        setControlsVisibility(false);
      }, 2000);

      play();
    };
  }

  function playerEnded() {
    if (dragging) {
      return;
    }
    if (endedTimer) {
      clearTimeout(endedTimer);
      endedTimer = null;
    }
    // When the video is done, go right back to the calling app
    done();
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

      var percent = (dom.player.currentTime / dom.player.duration) * 100;
      if (isNaN(percent)) // this happens when we end the activity
        return;
      percent += '%';

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

  function formatDuration(duration) {
    function padLeft(num, length) {
      var r = String(num);
      while (r.length < length) {
        r = '0' + r;
      }
      return r;
    }

    var minutes = Math.floor(duration / 60);
    var seconds = Math.round(duration % 60);
    if (minutes < 60) {
      return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
    }
    return '';
  }
});
