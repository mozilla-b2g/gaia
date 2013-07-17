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
    if (data.allowSave && data.filename) {
      getStorageIfAvailable('videos', blob.size, function(ds) {
        storage = ds;
        dom.menu.hidden = false;
      });
    }
  }

  showPlayer(url, title);

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
    var ids = ['player', 'fullscreen-view', 'crop-view', 'videoControls',
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
    dom.videoControls.addEventListener('mousedown', playerMousedown);

    // Rescale when window size changes. This should get called when
    // orientation changes.
    window.addEventListener('resize', function() {
      if (dom.player.readyState !== dom.player.HAVE_NOTHING) {
        setPlayerSize();
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

  function setControlsVisibility(visible) {
    dom.videoControls.classList[visible ? 'remove' : 'add']('hidden');
    controlShowing = visible;
    if (visible) {
      // update elapsed time and slider while showing.
      updateSlider();
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
      if (dom.play.classList.contains('paused'))
        play();
      else
        pause();
    } else if (event.target == dom.close) {
      done();
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

  // Align vertically fullscreen view
  function setPlayerSize() {
    var containerHeight = (window.innerHeight > dom.player.offsetHeight) ?
      window.innerHeight : dom.player.offsetHeight;
    dom.cropView.style.marginTop = (containerHeight / 2) * -1 + 'px';
    dom.cropView.style.height = containerHeight + 'px';
  }

  // show video player
  function showPlayer(url, title) {

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
    var seconds = Math.floor(duration % 60);
    if (minutes < 60) {
      return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
    }
    var hours = Math.floor(minutes / 60);
    minutes = Math.floor(minutes % 60);
    return hours + ':' + padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
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
