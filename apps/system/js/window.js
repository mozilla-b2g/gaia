'use strict';

(function(window) {
  'use strict';
  var DEBUG = true;
  var _id = 0;
  var _start = new Date().getTime() / 1000;

  window.AppWindow = function AppWindow(configuration) {
    for (var key in configuration) {
      this[key] = configuration[key];
    }

    this.config = configuration;

    // Check if it's a fullscreen app.
    var manifest = this.manifest;
    if (manifest && 'entry_points' in manifest && manifest.entry_points &&
        manifest.type == 'certified') {
      var miniManifest = manifest.entry_points[this.origin.split('/')[3]];
      manifest = miniManifest || manifest;
    }

    this.getIconForSplash();
    this.preloadSplash();

    this._fullScreen = manifest &&
      ('fullscreen' in manifest ? manifest.fullscreen : false);

    this.element = this.frame;

    this.instanceID = this.CLASS_NAME + '-' + _id;

    _id++;


    if (!this.element) {
      this.browser_config = {
        origin: this.origin,
        url: this.url,
        name: this.name,
        manifest: this.manifest,
        manifestURL: this.manifestURL
      };
    }

    this.render();

    if (!this.loaded)
      this.setFrameBackground();

    this.publish('created');

    if (DEBUG) {
      AppWindow[this.instanceID] = this;
    }

    this._start = Date.now();

    // Launched as background: set visibility and overlay screenshot.
    if (this.config.stayBackground) {
      this.setVisible(false, true);
    }

    return this;
  };

  AppWindow.prototype._DEBUG = true;

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

    this.iframe.classList.remove('hidden');
    this._setVisible(true);

    // Getting a new screenshot to force compositing before
    // removing the screenshot overlay if it exists.
    if (this.screenshotOverlay.classList.contains('visible')) {
      this.ensureFullRepaint(this._hideScreenshotOverlay.bind(this));
    }
  };

  /**
   * _hideFrame will check |this._screenshotOverlayState|
   * and then turn off the frame visibility.
   * So this shouldn't be invoked by others directly.
   */
  AppWindow.prototype._hideFrame = function aw__hideFrame() {
    if (this._screenshotOverlayState !== 'frame') {
      this._setVisible(false);
      this.iframe.classList.add('hidden');
    }
  };

  AppWindow.prototype.isActive = function aw_isActive() {
    if (this._transitionState) {
      return (this._transitionState == 'opened' ||
              this._transitionState == 'opening');
    } else {
      // Fallback
      return (this._visibilityState == 'foreground' ||
            this.element.classList.contains('active'));
    }
  };

  AppWindow.prototype.kill = function aw_kill() {
    // As we can't immediatly remove runningApps entry,
    // we flag it as being killed in order to avoid trying to remove it twice.
    // (Check required because of bug 814583)
    if (this._killed) {
      return;
    }
    this.killed = true;

    if (DEBUG) {
      AppWindow[this.instanceID] = null;
    }

    // Clear observers
    if (this._observers && this._observers.length > 0) {
      this._observers.forEach(function iterator(observer) {
        observer.disconnect();
      }, this);
    }

    // Remove callee <-> caller reference before we remove the window.
    if (this.activityCaller) {
      delete this.activityCaller.activityCallee;
      delete this.activityCaller;
    }

    if (this.activityCallee) {
      if (this.activityCallee instanceof ActivityWindow) {
        this.activityCallee.kill();
      } else if (this.activityCallee instanceof AppWindow) {
        delete this.activityCallee.activityCaller;
        delete this.activityCallee;
      } else {
        // TODO: any new Window type is manipulated here.
      }
    }

    // If the app is the currently displayed app, switch to the homescreen
    if (this.isActive() && !this.isHomescreen) {
      // XXX: Refine this in transition state controller.
      var self = this;
      window.addEventListener('homescreenopened', function onhomeopen() {
        window.removeEventListener('homescreenopened', onhomeopen);
        self.destroy();
      });
      this.requestClose();
    } else {
      this.destroy();
    }
    this.publish('terminated');
  };

  AppWindow.prototype.destroy = function aw_destroy() {
    if (this.element) {
      this.containerElement.removeChild(this.element);
      this.element = null;
    }
    if (this.appChrome) {
      this.appChrome = null;
    }
  };

  AppWindow.prototype.containerElement = document.getElementById('windows');

  AppWindow.prototype.view = function aw_view() {
    return '<div class="appWindow" id="' + this.instanceID + '">' +
              '<div class="screenshot-overlay"></div>' +
              '<div class="fade-overlay"></div>' +
           '</div>';
  };

  AppWindow.prototype._render = function aw__render() {
    if (this.element)
      return;
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = new BrowserFrame(this.browser_config);
    this.element = document.getElementById(this.instanceID);

    // XXX: Remove following two lines once mozbrowser element is moved
    // into appWindow.
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.iframe.dataset.frameType = 'window';
    this.iframe.dataset.frameOrigin = this.origin;

    this.element.appendChild(this.browser.element);
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');
    this.publish('rendered');
  };

  AppWindow.prototype.render = function aw_render() {
    if (!this.element) {
      this._render();
    } else {
      // backward compatibility
      var screenshotOverlay = document.createElement('div');
      screenshotOverlay.classList.add('screenshot-overlay');

      this.element = this.frame;

      this.frame.appendChild(screenshotOverlay);
      this.screenshotOverlay = screenshotOverlay;

      var fadeOverlay = document.createElement('div');
      fadeOverlay.classList.add('fade-overlay');
      this.frame.appendChild(fadeOverlay);
      this.fadeOverlay = fadeOverlay;
    }

    this._registerEvents();

    // Pre determine the rotation degree.
    this.determineRotationDegree();
  };

  AppWindow.prototype._registerEvents = function aw__registerEvents() {
    if (window.AppModalDialog) {
      new AppModalDialog(this);
    }
    if (window.AppAuthenticationDialog) {
      new AppAuthenticationDialog(this);
    }
    if (this.manifest && this.manifest.chrome) {
      this.appChrome = new AppChrome(this.manifest.chrome, this);
      this.hasNavigation = this.manifest.chrome.navigation;
      this.hasTitle = this.manifest.chrome.rocketbar;
    } else if (this.hasNavigation || this.hasTitle) {
      this.appChrome = new AppChrome({
        title: this.hasTitle,
        navigation: this.hasNavigation
      }, this);
    }

    if (this.hasNavigation) {
      this.element.classList.add('navigation');
    }

    if (this.hasTitle) {
      this.element.classList.add('rocketbar');
    }

    this.element.addEventListener('_localized', function() {
      if (!this.manifest)
        return;
      this.name = new ManifestHelper(this.manifest).name;
      // For uitest.
      this.element.dataset.name = this.name;
    }.bind(this));

    this.iframe.addEventListener('mozbrowservisibilitychange',
      function visibilitychange(e) {
        var type = e.detail.visible ? 'foreground' : 'background';
        this.publish(type);
      }.bind(this));

    // In case we're not ActivityWindow but we're launched
    // as window disposition activity.
    this.iframe.addEventListener('mozbrowseractivitydone',
      function activitydone(e) {
        if (this.activityCaller &&
            this.activityCaller instanceof AppWindow) {
          this.activityCaller = null;
          this.activityCaller.activityCallee = null;
          // XXX: Do call appWindow.open()
          AppWindowManager.display(this.activityCaller.origin);
        }
      }.bind(this));

    this.iframe.addEventListener('mozbrowserclose',
      function onclose(e) {
        this.kill();
      }.bind(this));

    this.iframe.addEventListener('mozbrowsererror',
      function onerror(e) {
        if (e.detail.type !== 'fatal')
          return;
        // If the crashing app is currently displayed, we will present
        // the user with a banner notification.
        if (this.isActive()) {
          CrashReporter.setAppName(this.name);
        }

        this.kill();
      }.bind(this));

    this.element.addEventListener('mozbrowserloadstart',
      function loadstart(evt) {
        this.loading = true;
        this._changeState('loading', true);
        this.publish('loading');
      }.bind(this));

    this.element.addEventListener('mozbrowserloadend', function loadend(evt) {
      if (!this.loaded) {
        this.publish('loadtime', true, false, {
          time: parseInt(Date.now() - this._start),
          type: 'c'
        });
      }
      this.loading = false;
      this.loaded = true;
      this._changeState('loading', false);
      this.publish('loaded');
      var backgroundColor = evt.detail.backgroundColor;
      this.debug('bgcolor: ', backgroundColor);
      /* When rotating the screen, the child may take some time to reflow.
       * If the child takes longer than layers.orientation.sync.timeout
       * to respond, gecko will go ahead and draw anyways. This code
       * uses a simple heuristic to guess the least distracting color
       * we should draw in the blank space. */

      /* Only allow opaque colors */
      // TODOEVME - this kept throwing errors when homescreen launched,
      // bgcolor was null
      if (backgroundColor && backgroundColor.indexOf('rgb(') != -1) {
        this.iframe.style.backgroundColor = backgroundColor;
      }
    }.bind(this));

    // Deal with locationchange
    this.element.addEventListener('mozbrowserlocationchange', function(evt) {
      this.iframe.dataset.url = evt.detail;
    }.bind(this));
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
   */
  AppWindow.prototype.NEXTPAINT_TIMEOUT = 1000;

  AppWindow.prototype.CLASS_NAME = 'AppWindow';

  AppWindow.prototype.debug = function aw_debug(msg) {
    if (DEBUG && this._DEBUG) {
      console.log('[' + this.CLASS_NAME + ']' +
        '[' + (this.name || this.origin) + ']' +
        '[' + System.currentTime() + ']' +
        Array.slice(arguments).concat());
    }
  };

  AppWindow.prototype.show = function aw_show() {
    if (!this.isActive()) {
      this.element.classList.add('active');
    }
  };

  AppWindow.prototype.hide = function aw_hide() {
    if (this.isActive()) {
      this.element.classList.remove('active');
    }
  };

  /**
   * Wait for a full repaint of the mozbrowser iframe.
   */
  AppWindow.prototype.ensureFullRepaint = function onFullRepaint(callback) {
    if (!callback)
      return;

    if (this._ignoreRepaintRequest) {
      this.fadeOut();
      callback();
      return;
    }

    var iframe = this.iframe;
    var self = this;
    if ('getScreenshot' in iframe) {
      var request = iframe.getScreenshot(1, 1);
      request.onsuccess = request.onerror = function onRepainted() {
        self.debug('repainted by screenshoting.');
        setTimeout(callback);
      };
    } else {
      this.debug('no repaint.');
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

    this.debug(' publishing external event: ' + event);

    window.dispatchEvent(evt);
    this._publish(event, detail);
  };

  AppWindow.prototype._publish = function(event, detail) {
    // Dispatch internal event.
    if (this.element) {
      var internalEvent = document.createEvent('CustomEvent');
      internalEvent.initCustomEvent('_' + this.eventPrefix + event,
                          true, false, detail || this);

      this.debug(' publishing internal event: ' + event);
      this.element.dispatchEvent(internalEvent);
    }
  };

  var isDefaultPortrait =
    (OrientationManager.defaultOrientation === 'portrait-primary');

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
      var table =
        OrientationRotationTable[OrientationManager.defaultOrientation];
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
      var homeOrientation = OrientationManager.defaultOrientation;
      var currentOrientation = OrientationManager.fetchCurrentOrientation();
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

  AppWindow.prototype.calibratedHeight = function aw_calibratedHeight() {
    if (this.hasNavigation && !this.appChrome.hidingNavigation) {
      return -10;
    } else {
      return 0;
    }
  };

  // Set the size of the app's iframe to match the size of the screen.
  // We have to call this on resize events (which happen when the
  // phone orientation is changed). And also when an app is launched
  // and each time an app is brought to the front, since the
  // orientation could have changed since it was last displayed
  //
  // An appWindow instance only resizes if it's active.
  // Since we already pre-config the size in window.css,
  // if an app is launched by system message we don't need to resize
  // it.
  AppWindow.prototype.resize = function aw_resize(force) {
    this.debug('request RESIZE...active? ', this.isActive());
    if (force || this.isActive() || this.isHomescreen) {
      if (LayoutManager.keyboardEnabled) {
        this._publish('withkeyboard');
      } else {
        this._publish('withoutkeyboard');
      }
      if (this.isFullScreen()) {
        this.height = LayoutManager.fullscreenHeight + this.calibratedHeight();
      } else {
        this.height = LayoutManager.usualHeight + this.calibratedHeight();
      }

      this.width = LayoutManager.width;

      this.element.style.width = this.width + 'px';
      this.element.style.height = this.height + 'px';

      this.publish('resize');
      this.debug('W:', this.width, 'H:', this.height);
      this.resized = true;
    }

    // TODO: Put ActivityWindow resize logic inside AppWindow
    // seems strange.
    if (this.activityCallee &&
        this.activityCallee instanceof ActivityWindow) {
      this.activityCallee.resize();
    }
  };

  AppWindow.prototype.setOrientation =
    function aw_setOrientation(noCapture) {
      var manifest = this.manifest || this.config.manifest;
      var orientation = manifest ? (manifest.orientation ||
                        OrientationManager.globalOrientation) :
                        OrientationManager.globalOrientation;
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

      if (!noCapture && this.activityCallee &&
          this.activityCallee instanceof ActivityWindow) {
        this.activityCallee.setOrientation(noCapture);
      }
    };


  AppWindow.prototype.fadeOut = function aw__fadeout() {
    this.element.classList.add('fadeout');
  };

  AppWindow.prototype.fadeIn = function aw__fadein() {
    this.element.classList.remove('fadeout');
  };

  AppWindow.prototype.setActivityCallee =
    function aw_setActivityCallee(callee) {
      this.activityCallee = callee;
    };

  AppWindow.prototype.unsetActivityCallee =
    function aw_setActivityCallee() {
      this.activityCallee = null;
    };

  /**
   * Acquire one-time callback of certain type of state
   * XXX: Still unstable.
   */
  AppWindow.prototype.one = function aw_one(type, state, callback) {
    var self = this;
    var observer = new MutationObserver(function(mr, o) {
      if (self.element.getAttribute(type + '-state') === state) {
        self.debug('observing ' + type + ' ===> ' + state);
        callback();
        o.disconnect();
      }
    });

    // configuration of the observer:
    // we only care dataset change here.
    var config = { attributes: true };

    // pass in the target node, as well as the observer options
    observer.observe(this.element, config);
  };


  /**
   * Continues monitor certain type of state change.
   * XXX: Still unstable
   */
  AppWindow.prototype.once = function aw_once(type, state, callback) {
    var self = this;
    var observer = new MutationObserver(function(mr, o) {
      if (self.element.getAttribute(type + '-state') === state) {
        self.debug('observing ' + type + ' ===> ' + state);
        callback();
      }
    });

    // configuration of the observer:
    // we only care dataset change here.
    var config = { attributes: true };

    // pass in the target node, as well as the observer options
    observer.observe(this.element, config);

    // Store the new observers.
    if (!this._observers) {
      this._observers = [];
    }

    this._observers.push(observer);
  };

  AppWindow.prototype._changeState = function aw__changeState(type, state) {
    this.element.setAttribute(type + '-state', state.toString());
  };

  /**
   * Mixin the appWindow prototype with {mixin} object.
   * @param  {Object} mixin The object to be mixed.
   */
  AppWindow.addMixin = function AW_addMixin(mixin) {
    for (var prop in mixin) {
      if (mixin.hasOwnProperty(prop)) {
        // Put event handler function into an array,
        // if the name of the propery is '_on'.
        if (!this.prototype.hasOwnProperty(prop)) {
          this.prototype[prop] = mixin[prop];
        }
      }
    }
  };

  AppWindow.prototype.preloadSplash = function aw_preloadSplash() {
    if (this._splash || this.config.icon) {
      var a = document.createElement('a');
      a.href = this.config.origin;
      if (this.config.icon) {
        this._splash = this.config.icon;
      } else {
        this._splash = a.protocol + '//' + a.hostname + ':' +
                    (a.port || 80) + this._splash;
      }
      // Start to load the image in background to avoid flickering if possible.
      var img = new Image();
      img.src = this._splash;
    }
  };

  AppWindow.prototype.getIconForSplash =
    function aw_getIconForSplash(manifest) {
      var icons = this.manifest ?
        ('icons' in this.manifest ? this.manifest['icons'] : null) : null;
      if (!icons) {
        return null;
      }

      var sizes = Object.keys(icons).map(function parse(str) {
        return parseInt(str, 10);
      });

      sizes.sort(function(x, y) { return y - x; });

      var index = 0;
      var width = document.documentElement.clientWidth;
      for (var i = 0; i < sizes.length; i++) {
        if (sizes[i] < width) {
          index = i;
          break;
        }
      }

      this._splash = icons[sizes[index]];

      return icons[sizes[index]];
    };

  AppWindow.prototype.setFrameBackground =
    function aw_setFrameBackground(frame, callback) {
      this.element.style.backgroundImage = 'url("' + this._splash + '")';
      if (callback)
        setTimeout(callback);
    };

  AppWindow.prototype.requestOpen = function aw_requestOpen() {
    this.publish('requestopen');
  };

  AppWindow.prototype.requestClose = function aw_requestClose() {
    this.publish('requestclose');
  };

  AppWindow.prototype.subsribe = function aw_subsribe(eventName, callback) {
    this.element.addEventListener('_' + eventName, callback);
  };

  AppWindow.prototype.unsubsribe = function aw_subsribe(eventName, callback) {
    this.element.removeEventListener('_' + eventName, callback);
  };

  AppWindow.prototype.changeURL = function aw_changeURL(url) {
    // If the app is in foreground, it's too risky to change it's
    // URL. We'll ignore this request.
    if (!this.isActive()) {
      var iframe = this.browser.element;
      // If the app is opened and it is loaded to the correct page,
      // then th=ere is nothing to do.
      if (iframe.src !== url) {
        // Rewrite the URL of the app frame to the requested URL.
        // XXX: We could ended opening URls not for the app frame
        // in the app frame. But we don't care.
        iframe.src = url;
      }
    }
  };

}(this));
