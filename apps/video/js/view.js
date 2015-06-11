/* global getStorageIfAvailable,getVideoRotation,VideoUtils,
  ForwardRewindController,MimeMapper,getUnusedFilename,MediaUtils,
  VideoLoadingChecker,MediaError */
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
  var controlShowing = false;
  var controlFadeTimeout = null;
  var dragging = false;
  var data = activity.source.data;
  var blob = data.blob;
  var url = data.url;
  var title = data.title || '';
  var storage;       // A device storage object used by the save button
  var saved = false; // Did we save it?
  var videoRotation = 0;
  // touch start id is the identifier of touch event. we only need to process
  // events related to this id.
  var touchStartID = null;
  var isPausedWhileDragging;
  var sliderRect;
  window.pause = pause;

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
      if (!acm.headphones && playing) {
        setVideoPlaying(false);
      }
    });
  }

  function setVideoPlaying(playing) {
    if (playing) {
      play();
    } else {
      pause();
    }
  }

  function initUI() {
    // Fullscreen mode and inline activities don't seem to play well together
    // so we'll play the video without going into fullscreen mode.

    // Get all the elements we use by their id
    var ids = ['player', 'player-view',
               'player-header', 'play', 'playHead', 'video-container',
               'elapsedTime', 'video-title', 'duration-text', 'elapsed-text',
               'slider-wrapper', 'spinner-overlay', 'timeSlider',
               'save', 'banner', 'message', 'seek-forward',
               'seek-backward', 'videoControlBar', 'in-use-overlay',
               'in-use-overlay-title', 'in-use-overlay-text'];

    ids.forEach(function createElementRef(name) {
      dom[toCamelCase(name)] = document.getElementById(name);
    });

    function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    }

    dom.player.mozAudioChannelType = 'content';

    // handling the dragging of slider
    dom.sliderWrapper.addEventListener('touchstart', handleSliderTouchStart);
    dom.sliderWrapper.addEventListener('touchmove', handleSliderTouchMove);
    dom.sliderWrapper.addEventListener('touchend', handleSliderTouchEnd);

    // Rescale when window size changes. This should get called when
    // orientation changes.
    window.addEventListener('resize', function() {
      if (dom.player.readyState !== dom.player.HAVE_NOTHING) {
        VideoUtils.fitContainer(dom.videoContainer, dom.player,
                                videoRotation || 0);
      }
    });

    dom.player.addEventListener('timeupdate', timeUpdated);
    dom.player.addEventListener('seeked', updateSlider);

    // showing + hiding the loading spinner
    dom.player.addEventListener('waiting', showSpinner);
    dom.player.addEventListener('playing', hideSpinner);
    dom.player.addEventListener('play', hideSpinner);
    dom.player.addEventListener('pause', hideSpinner);
    dom.player.addEventListener('ended', playerEnded);
    dom.player.addEventListener('canplaythrough', hideSpinner);

    // option buttons
    dom.play.addEventListener('click', handlePlayButtonClick);
    dom.playerHeader.addEventListener('action', done);
    dom.save.addEventListener('click', save);
    // show/hide controls
    dom.videoContainer.addEventListener('click', toggleVideoControls);

    // handle slider keypress, emitted by the screen reader
    dom.timeSlider.addEventListener('keypress', handleSliderKeypress);

    ForwardRewindController.init(dom.player, dom.seekForward, dom.seekBackward);
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
    dom.playerView.classList[visible ? 'remove' : 'add'](
      'video-controls-hidden');
    controlShowing = visible;
    // Set the proper accessibility label for the video container based on
    // controls showing.
    dom.videoContainer.setAttribute('data-l10n-id', controlShowing ?
      'hide-controls-button' : 'show-controls-button');
    if (visible) {
      // update elapsed time and slider while showing.
      updateSlider();
    }
  }

  function handlePlayButtonClick() {
    setVideoPlaying(dom.player.paused);
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
    e.cancelBubble = !controlShowing;
    setControlsVisibility(!controlShowing);
  }

  function handleSliderTouchStart(event) {
    // If we have a touch start event, we don't need others.
    if (null != touchStartID) {
      return;
    }
    touchStartID = event.changedTouches[0].identifier;

    isPausedWhileDragging = dom.player.paused;
    dragging = true;
    // calculate the slider wrapper size for slider dragging.
    sliderRect = dom.sliderWrapper.getBoundingClientRect();

    // We can't do anything if we don't know our duration
    if (dom.player.duration === Infinity) {
      return;
    }

    if (!isPausedWhileDragging) {
      dom.player.pause();
    }

    handleSliderTouchMove(event);
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
      var formattedDuration = MediaUtils.formatDuration(dom.player.duration);
      dom.durationText.textContent = formattedDuration;
      timeUpdated();

      setButtonPaused(false);
      VideoUtils.fitContainer(dom.videoContainer, dom.player,
                              videoRotation || 0);

      dom.player.currentTime = 0;

      // Show the controls briefly then fade out
      controlFadeTimeout = setTimeout(function() {
        setControlsVisibility(false);
      }, 2000);

      navigator.mozL10n.setAttributes(dom.timeSlider, 'seek-bar',
        { duration: formattedDuration });
      dom.timeSlider.setAttribute('aria-valuemin', 0);
      dom.timeSlider.setAttribute('aria-valuemax', dom.player.duration);
      dom.timeSlider.setAttribute('aria-valuenow', dom.player.currentTime);
      dom.timeSlider.setAttribute('aria-valuetext',
        MediaUtils.formatDuration(dom.player.currentTime));

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
    // Switch the button icon
    setButtonPaused(false);

    // Start playing
    dom.player.play();
    playing = true;
  }

  function pause() {
    // Switch the button icon
    setButtonPaused(true);

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

    dom.timeSlider.setAttribute('aria-valuenow', dom.player.currentTime);
    dom.timeSlider.setAttribute('aria-valuetext',
      MediaUtils.formatDuration(dom.player.currentTime));
  }

  function playerEnded() {
    if (dragging) {
      return;
    }

    // If we are still playing when this 'ended' event arrives, then the
    // user played the video all the way to the end, and we skip to the
    // beginning and pause so it is easy for the user to restart. If we
    // reach the end because the user fast forwarded or dragged the slider
    // to the end, then we will have paused the video before we get this
    // event and in that case we will remain paused at the end of the video.
    if (playing) {
      dom.player.currentTime = 0;
      pause();
    }
  }

  function setButtonPaused(paused) {
    dom.play.classList.toggle('paused', paused);
    dom.play.setAttribute('data-l10n-id',
      paused ? 'play-button' : 'pause-button');
  }

  function movePlayHead(percent) {
    if (navigator.mozL10n.language.direction === 'ltr') {
      dom.playHead.style.left = percent;
    }
    else {
      dom.playHead.style.right = percent;
    }
  }

  function updateSlider() {
    // We update the slider when we get a 'seeked' event.
    // Don't do updates while we're seeking because the position we fastSeek()
    // to probably isn't exactly where we requested and we don't want jerky
    // updates
    if (dom.player.seeking) {
      return;
    }

    var percent = (dom.player.currentTime / dom.player.duration) * 100;
    if (isNaN(percent)) { // this happens when we end the activity
      return;
    }
    percent += '%';

    dom.elapsedText.textContent = MediaUtils.formatDuration(
      dom.player.currentTime);
    dom.elapsedTime.style.width = percent;
    // Don't move the play head if the user is dragging it.
    if (!dragging) {
      movePlayHead(percent);
    }
  }

  function handleSliderTouchEnd(event) {
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

  function handleSliderTouchMove(event) {
    if (!dragging) {
      return;
    }

    var touch = event.changedTouches.identifiedTouch(touchStartID);
    // We don't care the event not related to touchStartID
    if (!touch) {
      return;
    }

    function getTouchPos() {
      return (navigator.mozL10n.language.direction === 'ltr') ?
         (touch.clientX - sliderRect.left) :
         (sliderRect.right - touch.clientX);
    }

    var touchPos = getTouchPos();

    var pos = touchPos / sliderRect.width;
    pos = Math.max(pos, 0);
    pos = Math.min(pos, 1);

    // Update the slider to match the position of the user's finger.
    // Note, however, that we don't update the displayed time until
    // we actually get a 'seeked' event.
    var percent = pos * 100 + '%';
    dom.playHead.classList.add('active');
    movePlayHead(percent);
    dom.elapsedTime.style.width = percent;
    dom.player.fastSeek(dom.player.duration * pos);
  }

  function handleSliderKeypress(event) {
    // The standard accessible control for sliders is arrow up/down keys.
    // Our screenreader synthesizes those events on swipe up/down gestures.
    // Currently, we only allow screen reader users to adjust sliders with a
    // constant step size (there is no page up/down equivalent). In the case
    // of videos, we make sure that the maximum amount of steps for the entire
    // duration is 20, or 2 second increments if the duration is less then 40
    // seconds.
    var step = Math.max(dom.player.duration / 20, 2);
    if (event.keyCode === event.DOM_VK_DOWN) {
      dom.player.fastSeek(dom.player.currentTime - step);
    } else if (event.keyCode === event.DOM_VK_UP) {
      dom.player.fastSeek(dom.player.currentTime + step);
    }
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
    if (!filename) {
      return '';
    }
    return filename.substring(filename.lastIndexOf('/') + 1);
  }

  function setDisabled(element, disabled) {
    element.classList.toggle('disabled', disabled);

    // Set ARIA disabled attribute to maintain semantic meaning for the
    // assistive technologies like screen reader.
    element.setAttribute('aria-disabled', disabled);
  }

  function showSpinner() {
    if (!blob) {
      dom.spinnerOverlay.classList.remove('hidden');
      setDisabled(dom.playerView, true);
    }
  }

  function hideSpinner() {
    dom.spinnerOverlay.classList.add('hidden');
    setDisabled(dom.playerView, false);
  }
});
