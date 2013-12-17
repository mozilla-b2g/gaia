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
  var playing = false;
  var endedTimer;
  var controlShowing = false;
  var controlFadeTimeout = null;
  var dragging = false;
  var data = activity.source.data;
  var blob = data.blob;
  var type = data.type;
  var url = data.url;
  var title = data.title || '';
  var storage;       // A device storage object used by the save button
  var saved = false; // Did we save it?
  var endedTimer;    // The workaround of bug 783512.
  var videoRotation = 0;
  // touch start id is the identifier of touch event. we only need to process
  // events related to this id.
  var touchStartID = null;
  var isPausedWhileDragging;
  var sliderRect;

  initUI();

  // If blob exists, video should be launched by open activity
  if (blob) {
    // The title we display for this video may be explicitly specified,
    // or it might be the specified filename to save to or it might be
    // the filename of the blob.
    title = data.title || baseName(data.filename) || baseName(blob.name);
    url = URL.createObjectURL(blob);

    // If the app that initiated this activity wants us to allow the
    // user to save this blob as a file, and if device storage is available
    // and if there is enough free space, then display a save button.
    if (data.allowSave && data.filename && checkFilename()) {
      getStorageIfAvailable('videos', blob.size, function(ds) {
        storage = ds;
        dom.menu.hidden = false;
      });
    }

    // to hide player because it shows in the wrong rotation.
    dom.player.classList.add('hidden');
    // video rotation is not parsed, parse it.
    getVideoRotation(blob, function(rotation) {
      videoRotation = rotation;
      // show player when player size and rotation are correct.
      dom.player.classList.remove('hidden');
      // start to play the video that showPlayer also calls fitContainer.
      showPlayer(url, title);
    });
  } else {
    // In the url case, we don't need to calculate the rotation.
    showPlayer(url, title);
  }

  // Terminate video playback when visibility is changed.
  window.addEventListener('visibilitychange',
    function onVisibilityChanged() {
      if (document.hidden) {
        done();
      }
    });

  function initUI() {
    // Fullscreen mode and inline activities don't seem to play well together
    // so we'll play the video without going into fullscreen mode.

    // Get all the elements we use by their id
    var ids = ['player', 'fullscreen-view', 'videoControls',
               'close', 'play', 'playHead',
               'elapsedTime', 'video-title', 'duration-text', 'elapsed-text',
               'slider-wrapper', 'spinner-overlay',
               'menu', 'save', 'banner', 'message'];

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
    dom.videoControls.addEventListener('touchstart', handlePlayerTouchStart);
    dom.videoControls.addEventListener('touchmove', handlePlayerTouchMove);
    dom.videoControls.addEventListener('touchend', handlePlayerTouchEnd);

    // Rescale when window size changes. This should get called when
    // orientation changes.
    window.addEventListener('resize', function() {
      if (dom.player.readyState !== dom.player.HAVE_NOTHING) {
        VideoUtils.fitContainer(dom.fullscreenView, dom.player,
                                videoRotation || 0);
      }
    });

    dom.player.addEventListener('timeupdate', timeUpdated);

    // showing + hiding the loading spinner
    dom.player.addEventListener('waiting', showSpinner);
    dom.player.addEventListener('playing', hideSpinner);
    dom.player.addEventListener('play', hideSpinner);
    dom.player.addEventListener('pause', hideSpinner);
    dom.player.addEventListener('ended', playerEnded);
    dom.player.addEventListener('canplaythrough', hideSpinner);

    // Set the 'lang' and 'dir' attributes to <html> when the page is translated
    window.addEventListener('localized', function showBody() {
      document.documentElement.lang = navigator.mozL10n.language.code;
      document.documentElement.dir = navigator.mozL10n.language.direction;
    });
  }

  function checkFilename() {
    var dotIdx = data.filename.lastIndexOf('.');
    if (dotIdx > -1) {
      var ext = data.filename.substr(dotIdx + 1);
      return MimeMapper.guessTypeFromExtension(ext) === blob.type;
    } else {
      return false;
    }
  }

  function setControlsVisibility(visible) {
    dom.videoControls.classList[visible ? 'remove' : 'add']('hidden');
    controlShowing = visible;
    if (visible) {
      // update elapsed time and slider while showing.
      updateSlider();
    }
  }

  function handlePlayerTouchStart(event) {
    // If we have a touch start event, we don't need others.
    if (null != touchStartID) {
      return;
    }
    touchStartID = event.changedTouches[0].identifier;
    // If we interact with the controls before they fade away,
    // cancel the fade
    if (controlFadeTimeout) {
      clearTimeout(controlFadeTimeout);
      controlFadeTimeout = null;
    }
    if (!controlShowing) {
      setControlsVisibility(true);
      // add preventDefault to prevent click dispatching.
      event.preventDefault();
      return;
    }
    if (event.target == dom.play) {
      if (dom.play.classList.contains('paused'))
        play();
      else
        pause();
    } else if (event.target == dom.close) {
      done();
      event.preventDefault();
    } else if (event.target == dom.save) {
      save();
    } else if (event.target == dom.sliderWrapper) {
      dragSlider(event);
    } else {
      setControlsVisibility(false);
    }
  }

  function done() {
    pause();

    // Release any video resources
    dom.player.removeAttribute('src');
    dom.player.load();

    // End the activity
    activity.postResult({saved: saved});
  }

  function save() {
    // Hide the menu that holds the save button: we can only save once
    dom.menu.hidden = true;
    // XXX work around bug 870619
    dom.videoTitle.textContent = dom.videoTitle.textContent;

    getUnusedFilename(storage, data.filename, function(filename) {
      var savereq = storage.addNamed(blob, filename);
      savereq.onsuccess = function() {
        // Remember that it has been saved so we can pass this back
        // to the invoking app
        saved = filename;
        // And tell the user
        showBanner(navigator.mozL10n.get('saved', { title: title }));
      };
      savereq.onerror = function(e) {
        // XXX we don't report this to the user because it is hard to
        // localize.
        console.error('Error saving', filename, e);
      };
    });
  }

  // show video player
  function showPlayer(url, title) {

    dom.videoTitle.textContent = title || '';
    dom.player.src = url;
    dom.player.onloadedmetadata = function() {
      dom.durationText.textContent = MediaUtils.formatDuration(
        dom.player.duration);
      timeUpdated();

      dom.play.classList.remove('paused');
      VideoUtils.fitContainer(dom.fullscreenView, dom.player,
                              videoRotation || 0);

      dom.player.currentTime = 0;

      // Show the controls briefly then fade out
      setControlsVisibility(true);
      controlFadeTimeout = setTimeout(function() {
        setControlsVisibility(false);
      }, 2000);

      play();
    };
    dom.player.onloadeddata = function(evt) { URL.revokeObjectURL(url); };
    dom.player.onerror = function(evt) {
      var errorid = '';

      switch (evt.target.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          // This aborted error should be triggered by the user
          // so we don't have to show any error messages
          return;
        case MediaError.MEDIA_ERR_NETWORK:
          errorid = 'error-network';
          break;
        case MediaError.MEDIA_ERR_DECODE:
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          // If users tap some video link in an offline page
          // the error code will be MEDIA_ERR_SRC_NOT_SUPPORTED
          // we also prompt the unsupported error message for it
          errorid = 'error-unsupported';
          break;
        // Is it possible to be unknown errors?
        default:
          errorid = 'error-unknown';
          break;
      }

      handleError(navigator.mozL10n.get(errorid));
    };
  }

  function handleError(msg) {
    alert(msg);
    done();
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

      updateSlider();
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

  function playerEnded() {
    if (dragging) {
      return;
    }
    if (endedTimer) {
      clearTimeout(endedTimer);
      endedTimer = null;
    }

    dom.player.currentTime = 0;
    pause();
  }

  function updateSlider() {
    var percent = (dom.player.currentTime / dom.player.duration) * 100;
    if (isNaN(percent)) // this happens when we end the activity
      return;
    percent += '%';

    dom.elapsedText.textContent = MediaUtils.formatDuration(
      dom.player.currentTime);
    dom.elapsedTime.style.width = percent;
    // Don't move the play head if the user is dragging it.
    if (!dragging)
      dom.playHead.style.left = percent;
  }

  // handle drags on the time slider
  function dragSlider(e) {
    isPausedWhileDragging = dom.player.paused;
    dragging = true;
    // calculate the slider wrapper size for slider dragging.
    sliderRect = dom.sliderWrapper.getBoundingClientRect();

    // We can't do anything if we don't know our duration
    if (dom.player.duration === Infinity)
      return;

    if (!isPausedWhileDragging) {
      dom.player.pause();
    }

    handlePlayerTouchMove(e);
  }

  function handlePlayerTouchEnd(event) {
    // We don't care the event not related to touchStartID
    if (!event.changedTouches.identifiedTouch(touchStartID)) {
      return;
    }
    touchStartID = null;

    if (!dragging) {
      // We don't need to do anything without dragging.
      return;
    }

    dragging = false;

    dom.playHead.classList.remove('active');

    if (dom.player.currentTime === dom.player.duration) {
      pause();
    } else if (!isPausedWhileDragging) {
      dom.player.play();
    }
  }

  function handlePlayerTouchMove(event) {
    if (!dragging) {
      return;
    }

    var touch = event.changedTouches.identifiedTouch(touchStartID);
    // We don't care the event not related to touchStartID
    if (!touch) {
      return;
    }

    var pos = (touch.clientX - sliderRect.left) / sliderRect.width;
    pos = Math.max(pos, 0);
    pos = Math.min(pos, 1);

    var percent = pos * 100 + '%';
    dom.playHead.classList.add('active');
    dom.playHead.style.left = percent;
    dom.elapsedTime.style.width = percent;
    dom.player.currentTime = dom.player.duration * pos;
    dom.elapsedText.textContent = MediaUtils.formatDuration(
      dom.player.currentTime);
  }

  function showBanner(msg) {
    dom.message.textContent = msg;
    dom.banner.hidden = false;
    setTimeout(function() {
      dom.banner.hidden = true;
    }, 3000);
  }

  // Strip directories and just return the base filename
  function baseName(filename) {
    if (!filename)
      return '';
    return filename.substring(filename.lastIndexOf('/') + 1);
  }

  function showSpinner() {
    if (!blob) {
      dom.spinnerOverlay.classList.remove('hidden');
    }
  }

  function hideSpinner() {
    dom.spinnerOverlay.classList.add('hidden');
  }
});
