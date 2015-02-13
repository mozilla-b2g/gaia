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
  var controlFadeTimeout = null;
  var data = activity.source.data;
  var blob = data.blob;
  var type = data.type;
  var url = data.url;
  var title = data.title || '';
  var storage;       // A device storage object used by the save button
  var saved = false; // Did we save it?
  var videoRotation = 0;
  // touch start id is the identifier of touch event. we only need to process
  // events related to this id.

  //
  // Bug 1088456: when the view activity is launched by the bluetooth transfer
  // app (when the user taps on a downloaded file in the notification tray)
  // this code starts running while the regular video app is still running as
  // the foreground app. Since the video app does not get sent to the
  // background in this case, the currently playing video (if there is one) is
  // not paused. And so, in the case of videos that require decoder hardware,
  // the view activity cannot play the video. For this workaround, we have set
  // a localStorage property here. The video.js file should receive an event
  // when we do that and will use that as a signal to unload its video. We use
  // Date.now() as the value of the property so we get a different value and
  // generate an event each time we run.
  //
  localStorage.setItem('view-activity-wants-to-use-hardware', Date.now());

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
        dom.save.hidden = false;

        // HACK: Cause gaia-header to re-run font-fit logic
        // now that the 'save' button is visible.
        dom.videoTitle.textContent = dom.videoTitle.textContent;

        storage = ds;
      });
    }

    // to hide player because it shows in the wrong rotation.
    dom.player.classList.add('hidden');
    // video rotation is not parsed, parse it.
    getVideoRotation(blob, function(rotation) {
      // when error found, fallback to 0
      if (typeof rotation === 'string') {
        console.error('get video rotation error: ' + rotation);
        videoRotation = 0;
      } else {
        videoRotation = rotation;
      }
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

  // We get headphoneschange event when the headphones is plugged or unplugged
  var acm = navigator.mozAudioChannelManager;
  if (acm) {
    acm.addEventListener('headphoneschange', function onheadphoneschange() {
      if (!acm.headphones && !dom.player.paused) {
        pause();
      }
    });
  }

  function setVideoPlaying() {
    if (dom.player.paused) {
      play();
    } else {
      pause();
    }
  }

  function initUI() {
    // Fullscreen mode and inline activities don't seem to play well together
    // so we'll play the video without going into fullscreen mode.

    // Get all the elements we use by their id
    var ids = ['player', 'player-view', 'mediaControlsContainer',
               'player-header', 'video-container', 'video-title',
               'spinner-overlay', 'save', 'banner', 'message',
               'in-use-overlay', 'in-use-overlay-title',
               'in-use-overlay-text', 'media-controls'];

    ids.forEach(function createElementRef(name) {
      dom[toCamelCase(name)] = document.getElementById(name);
    });

    function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    }

    dom.player.mozAudioChannelType = 'content';

    // Rescale when window size changes. This should get called when
    // orientation changes.
    window.addEventListener('resize', function() {
      if (dom.player.readyState !== dom.player.HAVE_NOTHING) {
        VideoUtils.fitContainer(dom.videoContainer, dom.player,
                                videoRotation || 0);
      }
    });

    // showing + hiding the loading spinner
    dom.player.addEventListener('waiting', showSpinner);
    dom.player.addEventListener('playing', hideSpinner);
    dom.player.addEventListener('play', hideSpinner);
    dom.player.addEventListener('pause', hideSpinner);
    dom.player.addEventListener('canplaythrough', hideSpinner);

    // option buttons
    dom.playerHeader.addEventListener('action', done);
    dom.save.addEventListener('click', save);

    // video controls component
    dom.mediaControls.initialize(dom.player);

    // Add listeners for video controls web component
    //
    // play, pause
    dom.mediaControls.addEventListener('play-button-click',
      handlePlayButtonClick);

    dom.mediaControlsContainer.addEventListener('click',
                                                toggleVideoControls,
                                                true);
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
    dom.mediaControlsContainer.classList[visible ? 'remove' : 'add']('hidden');
    dom.mediaControls.hidden = !visible;
  }

  function toggleVideoControls(e) {
    // When we change the visibility state of video controls, we need to check
    // the timeout of auto hiding.
    if (controlFadeTimeout) {
      clearTimeout(controlFadeTimeout);
      controlFadeTimeout = null;
    }
    // We cannot change the visibility state of video contorls when we are in
    // picking mode.
    if (dom.mediaControls.hidden) {
      // If control not shown, tap any place to show it.
      setControlsVisibility(true);
      e.cancelBubble = true;
    } else if (e.originalTarget === dom.mediaControlsContainer) {
      // If control is shown, only tap the empty area should show it.
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

    // Undo the bug 1088456 workaround hack.
    localStorage.removeItem('view-activity-wants-to-use-hardware');
  }

  function save() {
    // Hide the menu that holds the save button: we can only save once
    dom.save.hidden = true;
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
    function handleLoadedMetadata() {

      VideoUtils.fitContainer(dom.videoContainer, dom.player,
                              videoRotation || 0);

      dom.player.currentTime = 0;

      // Show the controls briefly then fade out
      controlFadeTimeout = setTimeout(function() {
        setControlsVisibility(false);
      }, 2000);

      play();
    }

    dom.videoTitle.textContent = title || '';
    setControlsVisibility(true);

    var loadingChecker =
      new VideoLoadingChecker(dom.player, dom.inUseOverlay,
                              dom.inUseOverlayTitle,
                              dom.inUseOverlayText);
    loadingChecker.ensureVideoLoads(handleLoadedMetadata);

    dom.player.src = url;

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
    // Start playing
    dom.player.play();
  }

  function pause() {
    // Stop playing the video
    dom.player.pause();
  }

  function handlePlayButtonClick() {
    setVideoPlaying();
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
