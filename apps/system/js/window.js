/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(window) {
  'use strict';
  var DEBUG = false;
  window.AppWindow = function AppWindow(configuration) {
    for (var key in configuration) {
      this[key] = configuration[key];
    }

    this.config = configuration;

    // Check if it's a fullscreen app.
    var manifest = this.manifest;
    if ('entry_points' in manifest && manifest.entry_points &&
        manifest.type == 'certified') {
      var miniManifest = manifest.entry_points[this.origin.split('/')[3]];
      manifest = miniManifest || manifest;
    }
    this._fullScreen = 'fullscreen' in manifest ? manifest.fullscreen : false;

    this.render();

    this.publish('created');

    return this;
  };


  /**
   * Represent the current screenshoting state,
   * i.e. what is currently visible. Possible value:
   * 'frame': the actual app iframe
   * 'screenshot': the screenshot overlay,
   *               serve as a placeholder for visible but not active apps.
   * 'none': nothing is currently visible.
   */
  AppWindow.prototype._screenshotOverlayState = 'frame';

  /**
   * Represent the current pagee visibility state,
   * i.e. what is currently visible. Possible value:
   * 'foreground': setVisible(true)
   * 'background': setVisible(false)
   *
   * Default value is foreground.
   */
  AppWindow.prototype._visibilityState = 'foreground';

  /**
   * The rotating degree of current frame.
   */
  AppWindow.prototype.rotatingDegree = 0;

  /**
   * In order to prevent flashing of unpainted frame/screenshot overlay
   * during switching from one to another,
   * many event listener & callbacks are employed.
   *
   * 1. Switching from 'frame' to 'screenshot' state:
   *   _showScreenshotOverlay() is called
   *   get screenshot from frame
   *   when getting the screenshot,
   *   show the screenshot overlay and hide the frame
   *
   * 2. Switching from 'screenshot' to 'frame' state:
   *   _showFrame() is called
   *   register next paint listener, and set the frame to visible
   *   finally, when next painted, hide the screenshot
   *
   * 3. Switching from 'none' to 'frame' state:
   *   _showFrame() is called
   *
   * 4. Switching from 'frame' to 'none' state:
   *   _hideFrame() is called
   *
   * 5. Switching from 'none' to 'screenshot' state:
   *   get screenshot from frame
   *   when getting the screenshot, show the screenshot overlay
   *
   * 6. Switching from 'screenshot' to 'none' state:
   *   _hideScreenshotOverlay is called
   *
   */

  AppWindow.prototype.setVisible =
    function aw_setVisible(visible, screenshotIfInvisible) {
      this.debug('set visibility -> ', visible);
      if (visible) {
        this.frame.removeAttribute('aria-hidden');
        this._screenshotOverlayState = 'frame';
        this._showFrame();
      } else {
        this.frame.setAttribute('aria-hidden', 'true');
        if (screenshotIfInvisible) {
          this._screenshotOverlayState = 'screenshot';
          this._showScreenshotOverlay();
        } else {
          this._screenshotOverlayState = 'none';
          this._hideFrame();
          this._hideScreenshotOverlay();
        }
      }

      this.debug('screenshot state -> ', this._screenshotOverlayState);
    };

  /**
   * _showFrame will check |this._screenshotOverlayState|
   * and then turn on the frame visibility.
   * So this shouldn't be invoked by others directly.
   */
  AppWindow.prototype._showFrame = function aw__showFrame() {
    if (this._screenshotOverlayState != 'frame')
      return;

    // Require a next paint event
    // to remove the screenshot overlay if it exists.
    if (this.screenshotOverlay.classList.contains('visible')) {
      this._waitForNextPaint(this._hideScreenshotOverlay.bind(this));
    }

    this.iframe.classList.remove('hidden');
    if ('setVisible' in this.iframe)
      this.iframe.setVisible(true);
  };

  /**
   * _hideFrame will check |this._screenshotOverlayState|
   * and then turn off the frame visibility.
   * So this shouldn't be invoked by others directly.
   */
  AppWindow.prototype._hideFrame = function aw__hideFrame() {
    if (this._screenshotOverlayState !== 'frame') {
      if ('setVisible' in this.iframe)
        this.iframe.setVisible(false);
      this.iframe.classList.add('hidden');
    }
  };

  AppWindow.prototype.reload = function aw_reload() {
    this.iframe.reload(true);
  };

  AppWindow.prototype.kill = function aw_kill() {
    // XXX: A workaround because a AppWindow instance shouldn't
    // reference Window Manager directly here.
    // In the future we should make every app maintain and execute the events
    // in itself like resize, setVisibility...
    // And Window Manager is in charge of cross app management.
    WindowManager.kill(this.origin);
  };

  AppWindow.prototype.render = function aw_render() {
    var screenshotOverlay = document.createElement('div');
    screenshotOverlay.classList.add('screenshot-overlay');
    this.frame.appendChild(screenshotOverlay);
    this.screenshotOverlay = screenshotOverlay;

    var fadeOverlay = document.createElement('div');
    fadeOverlay.classList.add('fade-overlay');
    this.frame.appendChild(fadeOverlay);
    this.fadeOverlay = fadeOverlay;

    this.iframe.addEventListener('mozbrowservisibilitychange',
      function visibilitychange(e) {
        var type = e.detail.visible ? 'foreground' : 'background';
        this.publish(type);
      }.bind(this));

    // Pre determine the rotation degree.
    this.determineRotationDegree();
  };

  /**
   * A temp variable to store current screenshot blob.
   * We should store the blob and create objectURL
   * once we need to display the image,
   * and revoke right away after we finish rendering the image.
   */
  AppWindow.prototype._screenshotBlob = undefined;

  /**
   * A static timeout to make sure
   * the next event don't happen too late.
   * (The same as WindowManager: kTransitionTimeout)
   */
  AppWindow.prototype.NEXTPAINT_TIMEOUT = 1000;

  AppWindow.prototype.debug = function aw_debug(msg) {
    if (DEBUG) {
      console.log('[appWindow][' + this.origin + ']' +
        '[' + new Date().getTime() / 1000 + ']' +
        Array.slice(arguments).concat());
    }
  };

  /**
   * Wait for a full repaint of the mozbrowser iframe.
   */
  AppWindow.prototype.ensureFullRepaint = function onFullRepaint(callback) {
    if (!callback)
      return;

    var iframe = this.iframe;
    if ('getScreenshot' in iframe) {
      var request = iframe.getScreenshot(1, 1);
      request.onsuccess = request.onerror = function onRepainted() {
        setTimeout(callback);
      };
    } else {
      setTimeout(callback);
    }
  };

  /**
   * Wait for a next paint event from mozbrowser iframe,
   * The callback would be called in this.NEXTPAINT_TIMEOUT ms
   * if the next paint event doesn't happen.
   * The use case is for the moment just before we turn on
   * the iframe visibility, so the TIMEOUT isn't too long.
   * @param  {Function} callback The callback function to be invoked
   *                             after we get next paint event.
   */
  AppWindow.prototype._waitForNextPaint =
    function aw__waitForNextPaint(callback) {
      if (!callback)
        return;

      var self = this;

      var nextPaintTimer;
      var iframe = this.iframe;
      var onNextPaint = function aw_onNextPaint() {
        self.debug(' nextpainted.');
        iframe.removeNextPaintListener(onNextPaint);
        clearTimeout(nextPaintTimer);

        callback();
      };

      nextPaintTimer = setTimeout(function ifNextPaintIsTooLate() {
        self.debug(' nextpaint is timeouted.');
        iframe.removeNextPaintListener(onNextPaint);

        callback();
      }, this.NEXTPAINT_TIMEOUT);

      iframe.addNextPaintListener(onNextPaint);
      // XXX: Open window quickly.
      // We have a ~1sec delay here, still don't know why.
      if (!this.isHomescreen)
        onNextPaint();
    };

  /**
   * Request a screenshot ObjectURL temporarily.
   * The image would be discarded after 200ms or the revoke callback
   * is invoked.
   */
  AppWindow.prototype.requestScreenshotURL =
    function aw__requestScreenshotURL() {
      if (!this._screenshotBlob) {
        return null;
      }
      var screenshotURL = URL.createObjectURL(this._screenshotBlob);

      setTimeout(function onTimeout() {
        if (screenshotURL) {
          URL.revokeObjectURL(screenshotURL);
          screenshotURL = null;
        }
      }, 200);

      return screenshotURL;
    };

  /**
   * Currently this happens to active app window when:
   * Attentionscreen shows no matter it's fresh newly created
   * or slide down from active-statusbar mode.
   */
  AppWindow.prototype._showScreenshotOverlay =
    function aw__showScreenshotOverlay() {
      if (this._nextPaintTimer) {
        clearTimeout(this._nextPaintTimer);
        this._nextPaintTimer = null;
      }

      this.getScreenshot(function onGettingScreenshot(screenshotBlob) {
        // If the callback is too late,
        // and we're brought to foreground by somebody.
        if (this._screenshotOverlayState == 'frame')
          return;

        if (!screenshotBlob) {
          // If no screenshot,
          // still hide the frame.
          this._hideFrame();
          return;
        }

        var screenshotURL = this.requestScreenshotURL();

        this.screenshotOverlay.style.backgroundImage =
          'url(' + screenshotURL + ')';
        this.screenshotOverlay.classList.add('visible');

        if (!this.iframe.classList.contains('hidden'))
          this._hideFrame();
      }.bind(this));
    };

  /**
   * Check if current visibility state is screenshot or not,
   * to hide the screenshot overlay.
   */
  AppWindow.prototype._hideScreenshotOverlay =
    function aw__hideScreenshotOverlay() {
      if (this._screenshotOverlayState != 'screenshot' &&
          this.screenshotOverlay.classList.contains('visible'))
        this.screenshotOverlay.classList.remove('visible');
    };

  // Get cached screenshot Blob if there is one.
  // Note: the caller should revoke the created ObjectURL once it's finishing.
  AppWindow.prototype.getCachedScreenshotBlob =
    function aw_getCachedScreenshotBlob() {
      return this._screenshotBlob;
    };

  // Save and update screenshot Blob.
  AppWindow.prototype.renewCachedScreenshotBlob =
    function aw_renewScreenshot(screenshotBlob) {
      this._screenshotBlob = screenshotBlob;
    };

  /**
   * get the screenshot of mozbrowser iframe.
   * @param  {Function} callback The callback function to be invoked
   *                             after we get the screenshot.
   */
  AppWindow.prototype.getScreenshot = function aw_getScreenshot(callback) {
    // XXX: We had better store offsetWidth/offsetHeight.

    // We don't need the screenshot of homescreen because:
    // 1. Homescreen background is transparent,
    //    currently gecko only sends JPG to us.
    //    See bug 878003.
    // 2. Homescreen screenshot isn't required by card view.
    //    Since getScreenshot takes additional memory usage,
    //    let's early return here.

    // XXX: Determine |this.isHomescreen| or not on our own in
    // appWindow.
    if (this.isHomescreen) {
      callback();
      return;
    }

    var self = this;

    var req = this.iframe.getScreenshot(
      this.iframe.offsetWidth, this.iframe.offsetHeight);

    req.onsuccess = function gotScreenshotFromFrame(evt) {
      var result = evt.target.result;
      self._screenshotBlob = result;
      callback(result);
    };

    req.onerror = function gotScreenshotFromFrameError(evt) {
      callback();
    };
  };

  /**
   * Event prefix presents the object type
   * when publishing an event from the element.
   * Always 'app' for now.
   *
   * @type {String}
   */
  AppWindow.prototype.eventPrefix = 'app';

  /**
   * Publish an event.
   *
   * @param  {String} event  Event name, without object type prefix.
   * @param  {Object} detail Parameters in JSON format.
   */
  AppWindow.prototype.publish = function(event, detail) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(this.eventPrefix + event,
                        true, false, detail || this);

    this.debug('publish: ' + event);

    if (this.frame) {
      this.frame.dispatchEvent(evt);
    } else {
      window.dispatchEvent(evt);
    }
  };

  var isDefaultPortrait =
    (ScreenLayout.defaultOrientation === 'portrait-primary');

  var OrientationRotationArray = [
    'portrait-primary', 'portrait-secondary', 'portrait',
    'landscape-primary', 'landscape-secondary', 'landscape', 'default'];
  var OrientationRotationTable = {
    'portrait-primary': [0, 180, 0, 90, 270, 90, isDefaultPortrait ? 0 : 90],
    'landscape-primary': [270, 90, 270, 0, 180, 0, isDefaultPortrait ? 0 : 270]
  };

  AppWindow.prototype.determineRotationDegree =
    function aw__determineRotationDegree() {
      if (!this.manifest)
        return 0;

      var appOrientation = this.manifest.orientation;
      var orientation = this.determineOrientation(appOrientation);
      var table = OrientationRotationTable[ScreenLayout.defaultOrientation];
      var degree = table[OrientationRotationArray.indexOf(orientation)];
      this.rotatingDegree = degree;
      if (degree == 90 || degree == 270) {
        this.frame.classList.add('perpendicular');
      }
      return degree;
    };

  AppWindow.prototype.determineClosingRotationDegree =
    function aw__determineClosingRotationDegree() {
      if (!this.manifest)
        return 0;

      // XXX: Assume homescreen's orientation is just device default.
      var homeOrientation = ScreenLayout.defaultOrientation;
      var currentOrientation = ScreenLayout.fetchCurrentOrientation();
      var table = OrientationRotationTable[currentOrientation];
      var degree = table[OrientationRotationArray.indexOf(homeOrientation)];
      return degree;
    };

  // Detect whether this is a full screen app by its manifest.
  AppWindow.prototype.isFullScreen = function aw_isFullScreen() {
    return this._fullScreen;
  };

  AppWindow.prototype._defaultOrientation = null;

  AppWindow.prototype.determineOrientation =
    function aw_determineOrientation(orientation) {
      if (this._defaultOrientation) {
        return this._defaultOrientation;
      } else if (!orientation) {
        this._defaultOrientation = 'default';
        return this._defaultOrientation;
      }

      if (!Array.isArray(orientation))
        orientation = [orientation];

      this._defaultOrientation = orientation[0];

      return this._defaultOrientation;
    };

  // Set the size of the app's iframe to match the size of the screen.
  // We have to call this on resize events (which happen when the
  // phone orientation is changed). And also when an app is launched
  // and each time an app is brought to the front, since the
  // orientation could have changed since it was last displayed
  // @param {changeActivityFrame} to denote if needed to change inline
  //                              activity size
  AppWindow.prototype.resize = function aw_resize(changeActivityFrame) {
    var keyboardHeight = KeyboardManager.getHeight();
    var cssWidth = window.innerWidth + 'px';
    var cssHeight = window.innerHeight -
                    StatusBar.height -
                    SoftwareButtonManager.height -
                    keyboardHeight;
    if (!keyboardHeight && 'wrapper' in this.frame.dataset) {
      cssHeight -= 10;
    }
    cssHeight += 'px';

    if (!AttentionScreen.isFullyVisible() && !AttentionScreen.isVisible() &&
        this.isFullScreen()) {
      cssHeight = window.innerHeight - keyboardHeight -
                  SoftwareButtonManager.height + 'px';
    }

    this.frame.style.width = cssWidth;
    this.frame.style.height = cssHeight;

    this.publish('resize', {changeActivityFrame: changeActivityFrame});
    this.resized = true;
  };

  AppWindow.prototype.setOrientation =
    function aw_setOrientation(globalOrientation) {
      var manifest = this.manifest || this.config.manifest;

      var orientation = manifest.orientation || globalOrientation;
      if (orientation) {
        var rv = false;
        if ('lockOrientation' in screen) {
          rv = screen.lockOrientation(orientation);
        } else if ('mozLockOrientation' in screen) {
          rv = screen.mozLockOrientation(orientation);
        }
        if (rv === false) {
          console.warn('screen.mozLockOrientation() returned false for',
                       this.origin, 'orientation', orientation);
        }
      } else {  // If no orientation was requested, then let it rotate
        if ('unlockOrientation' in screen) {
          screen.unlockOrientation();
        } else if ('mozUnlockOrientation' in screen) {
          screen.mozUnlockOrientation();
        }
      }
    };


  AppWindow.prototype.fadeOut = function hw__fadeout() {
    this.frame.classList.add('fadeout');
    this.iframe.style.display = 'none';
  };

  AppWindow.prototype.fadeIn = function hw__fadein() {
    this.frame.classList.remove('fadeout');
    this.iframe.style.display = 'block';
  };

}(this));
