/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(window) {
  'use strict';
  window.AppWindow = function AppWindow(configuration) {
    for (var key in configuration) {
      this[key] = configuration[key];
    }

    // Check if it's a fullscreen app.
    var manifest = this.manifest;
    if ('entry_points' in manifest && manifest.entry_points &&
        manifest.type == 'certified') {
      var miniManifest = manifest.entry_points[this.origin.split('/')[3]];
      manifest = miniManifest || manifest;
    }
    this._fullScreen = 'fullscreen' in manifest ? manifest.fullscreen : false;

    // We keep the appError object here for the purpose that
    // we may need to export the error state of AppWindow instance
    // to the other module in the future.
    this.appError = new AppError(this);

    this.render();

    return this;
  };


  /**
   * Represent the current visibility state,
   * i.e. what is currently visible. Possible value:
   * 'frame': the actual app iframe
   * 'screenshot': the screenshot overlay,
   *               serve as a placeholder for visible but not active apps.
   * 'none': nothing is currently visible.
   */
  AppWindow.prototype._visibilityState = 'frame',

  /**
   * The current orientation of this app window corresponding to screen
   * orientation.
   */
  AppWindow.prototype.currentOrientation = 'portrait-primary',

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
      if (visible) {
        this._visibilityState = 'frame';
        this._showFrame();
      } else {
        if (screenshotIfInvisible) {
          this._visibilityState = 'screenshot';
          this._showScreenshotOverlay();
        } else {
          this._visibilityState = 'none';
          this._hideFrame();
          this._hideScreenshotOverlay();
        }
      }
    };

  /**
   * _showFrame will check |this._visibilityState|
   * and then turn on the frame visibility.
   * So this shouldn't be invoked by others directly.
   */
  AppWindow.prototype._showFrame = function aw__showFrame() {
    if (this._visibilityState != 'frame')
      return;

    // Require a next paint event
    // to remove the screenshot overlay if it exists.
    if (this.screenshotOverlay.classList.contains('visible')) {
      this._waitForNextPaint(this._hideScreenshotOverlay.bind(this));
    }

    this.iframe.classList.remove('hidden');
    this.iframe.setVisible(true);
  };

  /**
   * _hideFrame will check |this._visibilityState|
   * and then turn off the frame visibility.
   * So this shouldn't be invoked by others directly.
   */
  AppWindow.prototype._hideFrame = function aw__hideFrame() {
    if (this._visibilityState !== 'frame') {
      this.iframe.setVisible(false);
      this.iframe.classList.add('hidden');
    }
  };

  AppWindow.prototype.reload = function aw_reload() {
    this.iframe.reload(true);
  };

  AppWindow.prototype.kill = function aw_kill() {
    if (this._screenshotURL) {
      URL.revokeObjectURL(this._screenshotURL);
    }
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
  };

  /**
   * A temp variable to store current screenshot object URL.
   */
  AppWindow.prototype._screenshotURL = undefined;

  /**
   * A static timeout to make sure
   * the next event don't happen too late.
   * (The same as WindowManager: kTransitionTimeout)
   */
  AppWindow.prototype.NEXTPAINT_TIMEOUT = 1000;

  AppWindow.prototype.debug = function aw_debug(msg) {
    console.log('[appWindow][' + this.origin + ']' +
                '[' + new Date().getTime() / 1000 + ']' + msg);
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

      var nextPaintTimer;
      var iframe = this.iframe;
      var onNextPaint = function aw_onNextPaint() {
        iframe.removeNextPaintListener(onNextPaint);
        clearTimeout(nextPaintTimer);

        callback();
      };

      nextPaintTimer = setTimeout(function ifNextPaintIsTooLate() {
        iframe.removeNextPaintListener(onNextPaint);

        callback();
      }, this.NEXTPAINT_TIMEOUT);

      iframe.addNextPaintListener(onNextPaint);
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

      this.getScreenshot(function onGettingScreenshot(screenshot) {
        // If the callback is too late,
        // and we're brought to foreground by somebody.
        if (this._visibilityState == 'frame')
          return;

        if (!screenshot) {
          // If no screenshot,
          // still hide the frame.
          this._hideFrame();
          return;
        }

        this._screenshotURL = URL.createObjectURL(screenshot);
        this.screenshotOverlay.style.backgroundImage =
          'url(' + this._screenshotURL + ')';
        this.screenshotOverlay.classList.add('visible');

        if (!this.iframe.classList.contains('hidden'))
          this._hideFrame();

        // XXX: we ought not to change screenshots at Window Manager
        // here. In the long run Window Manager should replace
        // its screenshots variable with appWindow._screenshotURL.
        if (WindowManager.screenshots[this.origin]) {
          URL.revokeObjectURL(WindowManager.screenshots[this.origin]);
        }
        WindowManager.screenshots[this.origin] = this._screenshotURL;
      }.bind(this));
    };

  /**
   * Check if current visibility state is screenshot or not,
   * to hide the screenshot overlay.
   */
  AppWindow.prototype._hideScreenshotOverlay =
    function aw__hideScreenshotOverlay() {
      if (this._visibilityState != 'screenshot' &&
          this.screenshotOverlay.classList.contains('visible'))
        this.screenshotOverlay.classList.remove('visible');
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

    var req = this.iframe.getScreenshot(
      this.iframe.offsetWidth, this.iframe.offsetHeight);

    req.onsuccess = function gotScreenshotFromFrame(evt) {
      var result = evt.target.result;
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
                        true, false, detail || this.config);
    this.frame.dispatchEvent(evt);
  };

  /**
   * We will rotate the app window during app transition per current screen
   * orientation and app's orientation. The width and height would be
   * temporarily changed during the transition in this function.
   *
   * For example, when browser app is opened from
   * homescreen and the current device orientation is
   * 1) 'portrait-primary' :   Do nothing.
   * 2) 'landscape-primary':   Rotate app frame by 90 degrees and set
   *    width/height to device height/width correspondingly. Move frame position
   *    to counter the position change due to rotation.
   * 3) 'portrait-secondary':  Rotate app frame by 180 degrees.
   * 4) 'landscape-secondary': Rotate app frame by 270 degrees and set
   *    width/height to device height/width correspondingly. Move frame position
   *    to counter the position change due to rotation.
   */
  AppWindow.prototype.setRotateTransition = function aw_setRotateTransition() {
    var statusBarHeight = StatusBar.height;
    var softkeyHeight = SoftwareButtonManager.height;

    var width;
    var height;

    var appOrientation = this.manifest.orientation;
    var orientation = this.determineOrientation(appOrientation);

    this.frame.classList.remove(this.currentOrientation);
    this.currentOrientation = orientation;
    this.frame.classList.add(orientation);

    if (!AttentionScreen.isFullyVisible() && !AttentionScreen.isVisible() &&
      this.isFullScreen()) {
      statusBarHeight = 0;
    }

    // Rotate the frame if needed
    if (orientation == 'landscape-primary' ||
        orientation == 'landscape-secondary') {
      width = window.innerHeight;
      height = window.innerWidth - statusBarHeight - softkeyHeight;
      this.frame.style.left = ((height - width) / 2) + 'px';
      this.frame.style.top = ((width - height) / 2) + 'px';
    } else {
      width = window.innerWidth;
      height = window.innerHeight - statusBarHeight - softkeyHeight;
    }
    this.frame.style.width = width + 'px';
    this.frame.style.height = height + 'px';
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
        this._defaultOrientation = 'portrait-primary';
        return this._defaultOrientation;
      }

      if (!Array.isArray(orientation))
        orientation = [orientation];

      orientation.every(function orientationIterator(o) {
        if (o.endsWith('-primary') || o.endsWith('-secondary')) {
          this._defaultOrientation = o;
          return false;
        }
      }, this);

      // Make a guess to the orientation,
      // if there's no '-primary' or '-secondary' suffix.
      if (!this._defaultOrientation)
        this._defaultOrientation = orientation[0] + '-primary';

      return this._defaultOrientation;
    };

  // Queueing a cleaning task for styles set for rotate transition.
  // We need to clear rotate after orientation changes; however when
  // orientation changes didn't raise (ex: user rotates the device during
  // transition; or the device is always in portrait primary;
  // we should do cleanup on appopen / appclose instead)
  AppWindow.prototype.addClearRotateTransition =
    function aw_clearRotateTransition() {
      var self = this;
      var onClearRotate = function aw_onClearRotate(evt) {
        window.screen.removeEventListener('mozorientationchange',
                                          onClearRotate);
        window.removeEventListener('appopen', onClearRotate);
        window.removeEventListener('appclose', onClearRotate);

        self.frame.style.left = '';
        self.frame.style.top = '';
        self.frame.classList.remove(self.currentOrientation);

        if (self.currentOrientation != screen.mozOrientation &&
            evt.type != 'appclose') {
          self.resize();
        }
      };

      window.screen.addEventListener('mozorientationchange', onClearRotate);
      window.addEventListener('appopen', onClearRotate);
      window.addEventListener('appclose', onClearRotate);
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
  };

}(this));
