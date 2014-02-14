'use strict';

(function(exports) {
  var DEBUG = false;
  var _id = 0;

  /**
   * AppWindow creates, contains, manages a
   * [mozbrowser](https://developer.mozilla.org/en-US/docs/WebAPI/Browser)
   * iframe. AppWindow is directly managed by AppWindowManager,
   * by call resize(), open(), close() on AppWindow.
   *
   * Basically AppWindow would manipulate all mozbrowser events
   * fired from the mozbrowser iframe by itself and show relevant UI.
   *
   * AppWindow is also the parent class of ActivityWindow and HomescreenWindow.
   * Mostly they do the same thing but is different at some points
   * like the way transitioning.
   *
   * About creating an AppWindow,
   * you need to provide at least the web app/page URL.
   * If you have also provided the manifest,
   * then you would get an AppWindow object which is a web app.
   * Otherwise you would get an AppWindow which is in 'Wrapper' type.
   * The only one different thing between web app and web page is
   * just the manifestURL.
   *
   * ##### Life cycle state machine of an appWindow instance
   * ![appWindow Life cycle state machine](http://i.imgur.com/ELuEopw.png)
   *
   * @example
   * var app = new AppWindow({
   *   url: 'http://uitest.gaiamobile.org:8080/index.html',
   *   manifestURL: 'http://uitest.gaiamobile.org:8080/manifest.webapp'
   * });
   * app.open();
   *
   * @class AppWindow
   * @mixes BrowserMixin into AppWindow.prototype
   */
  var AppWindow = function AppWindow(configuration) {
    this.reConfig(configuration);
    this.render();
    /**
     * This is fired when the app window is instantiated.
     * @event AppWindow#appcreated
     */
    this.publish('created');

    if (DEBUG) {
      AppWindow[this.instanceID] = this;
    }

    this.launchTime = Date.now();

    return this;
  };

  /**
   * Change this if new window has its own styles.
   *
   * @type string
   * @memberof AppWindow
   */
  AppWindow.prototype.CLASS_LIST = 'appWindow';
  AppWindow.prototype._DEBUG = false;

  /**
   * Generate instanceID of this instance.
   */
  AppWindow.prototype.generateID = function() {
    if (!this.instanceID) {
      this.instanceID = this.CLASS_NAME + '-' + _id;
      _id++;
    }
  };

  /**
   * Generate all configurations we need.
   * @param  {Object} configuration Initial configuration object
   *  Includes manifestURL, manifest, url, origin, name.
   */
  AppWindow.prototype.reConfig = function aw_reConfig(configuration) {
    // Some modules are querying appWindow.manifestURL or appWindow.origin
    // so we inject all configurations into appWindow first.
    for (var key in configuration) {
      this[key] = configuration[key];
    }

    this.browser_config = configuration;
    // Store initial configuration in this.config
    this.config = configuration;
    this.config.chrome = (this.manifest && this.manifest.chrome) ?
      this.manifest.chrome :
      this.config.chrome;

    if (!this.manifest && this.config && this.config.title) {
      this.updateName(this.config.title);
    }

    // Get icon splash
    this.getIconForSplash();

    this.generateID();
  };

  /**
   * Update the name of this window.
   * @param {String} name The new name.
   */
  AppWindow.prototype.updateName = function aw_updateName(name) {
    if (this.config && this.config.title) {
      this.config.title = name;
    }
    this.name = name;
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

  AppWindow.prototype._dump = function aw__dump() {
    self.dump('======================');
    try {
      throw new Error('e');
    } catch (e) {
      this.debug(e.stack);
    }
    self.dump('======================');
  };

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
      this.debug('Dump: set visibility -> ', visible);
      if (visible) {
        this.element.removeAttribute('aria-hidden');
        this._screenshotOverlayState = 'frame';
        this._showFrame();
      } else {
        this.element.setAttribute('aria-hidden', 'true');
        if (screenshotIfInvisible && !this.isHomescreen) {
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
    this.debug('before showing frame');
    if (this._screenshotOverlayState != 'frame') {
      return;
    }

    this.browser.element.classList.remove('hidden');
    this._setVisible(true);

    if (this.isHomescreen) {
      return;
    }

    // Getting a new screenshot to force compositing before
    // removing the screenshot overlay if it exists.
    if (this.screenshotOverlay &&
        this.screenshotOverlay.classList.contains('visible')) {
      this.tryWaitForFullRepaint(this._hideScreenshotOverlay.bind(this));
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

  /**
   * An appWindow is active means:
   * 1. Going to be opened.
   * 2. Already opened.
   *
   * Note: The element has active class unless it's at closed state.
   * But a closing instance is not recognized as active.
   *
   * @return {Boolean} The instance is active or not.
   */
  AppWindow.prototype.isActive = function aw_isActive() {
    if (this.transitionController) {
      return (this.transitionController._transitionState == 'opened' ||
              this.transitionController._transitionState == 'opening');
    } else {
      // Before the transition controller is inited
      return false;
    }
  };

  /**
   * TODO: Integrate swipe transition.
   *
   * @return {Boolean} The instance is transitioning or not.
   */
  AppWindow.prototype.isTransitioning = function aw_isTransitioning() {
    if (this.transitionController) {
      return (this.transitionController._transitionState == 'opening' ||
              this.transitionController._transitionState == 'closing');
    } else {
      // Fallback
      return (this.element.classList.contains('transition-opening') ||
              this.element.classList.contains('transition-closing'));
    }
  };

  /**
   * Kill an instance.
   *
   * 1. If this instance has any living activity window as callee,
   *    all of the activity window callee would be killed.
   * 2. If this instance is active, it would request to close.
   *
   * @fires AppWindow#appterminated
   */
  AppWindow.prototype.kill = function aw_kill() {
    if (this._killed) {
      return;
    }
    this._killed = true;

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
      if (this.activityCallee instanceof self.ActivityWindow) {
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
      this.element.addEventListener('_closed', (function onClosed() {
        window.removeEventListener('_closed', onClosed);
        this.destroy();
      }).bind(this));
      this.requestClose();
    } else {
      this.destroy();
    }
    /**
     * Fired when the instance is terminated.
     * @event AppWindow#appterminated
     */
    this.publish('terminated');
  };

  /**
   * An appWindow is dead if somebody requested it to be killed.
   *
   * @return {Boolean} The instance is dead or not.
   */
  AppWindow.prototype.isDead = function aw_isDead() {
    return (this._killed);
  };


  /**
   * Destroy the instance.
   * @fires AppWindow#appdestroyed
   */
  AppWindow.prototype.destroy = function aw_destroy() {
    /**
     * Fired before the instance id destroyed.
     * @event AppWindow#appwilldestroy
     */
    this.publish('willdestroy');
    this.uninstallSubComponents();
    if (this.element) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }

    /**
     * Fired after the instance id destroyed.
     * @event AppWindow#appdestroyed
     */
    this.publish('destroyed');
  };

  AppWindow.prototype.containerElement = document.getElementById('windows');

  AppWindow.prototype.view = function aw_view() {
    return '<div class=" ' + this.CLASS_LIST +
            ' " id="' + this.instanceID +
            '" transition-state="closed">' +
              '<div class="screenshot-overlay"></div>' +
              '<div class="fade-overlay"></div>' +
           '</div>';
  };

  /**
   * Render the mozbrowser iframe and some overlays.
   * @inner
   */
  AppWindow.prototype._render = function aw__render() {
    if (this.element) {
      return;
    }
    /**
     * Fired before this element is appended to the DOM tree.
     * @event AppWindow#appwillrender
     */
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = new self.BrowserFrame(this.browser_config);
    this.element = document.getElementById(this.instanceID);

    // For gaiauitest usage.
    this.element.dataset.manifestName = this.manifest ? this.manifest.name : '';

    // XXX: Remove following two lines once mozbrowser element is moved
    // into appWindow.
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.iframe.dataset.frameType = 'window';
    this.iframe.dataset.frameOrigin = this.origin;

    if (this.isFullScreen()) {
      this.element.classList.add('fullscreen-app');
    }

    this.element.appendChild(this.browser.element);
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');

    // Launched as background: set visibility and overlay screenshot.
    if (this.config.stayBackground) {
      this.setVisible(false);
    }

    /**
     * Fired after the app window element is appended to the DOM tree.
     * @event AppWindow#apprendered
     */
    this.publish('rendered');
    this._rendered = true;
    setTimeout(this.setFrameBackground.bind(this));
  };

  AppWindow.prototype.render = function aw_render() {
    this._render();
    this._registerEvents();
    this.installSubComponents();
    // Pre determine the rotation degree.
    this.determineRotationDegree();
  };

  /**
   * The event is necessary for edge gesture swiper.
   * It means the app window is swiped in.
   *
   * @access private
   * @event AppWindow~_swipein
   */

  /**
   * The event is necessary for edge gesture swiper.
   * It means the app window is swiped out.
   *
   * @access private
   * @event AppWindow~_swipeout
   */
  AppWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
     'mozbrowserloadend', 'mozbrowseractivitydone', 'mozbrowserloadstart',
     'mozbrowsertitlechange', 'mozbrowserlocationchange',
     'mozbrowsericonchange',
     '_localized', '_swipein', '_swipeout'];

  AppWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog,
    'contextmenu': window.BrowserContextMenu
  };

  AppWindow.prototype.openAnimation = 'enlarge';
  AppWindow.prototype.closeAnimation = 'reduce';

  /**
   * Install sub components belong to this window instance.
   * The necessary components are based on AppWindow.SUB_COMPONENTS,
   * now they are AppModalDialog/AppAuthenticationDialog.
   *
   * @example
   * // Implement a new dialog
   * var myDialog = function myDialog(app) {
   * };
   *
   * var appWindow = new AppWindow();
   * AppWindow.prototype.SUB_COMPONENTS.push(myDialog);
   *
   * app.installSubComponents();
   */
  AppWindow.prototype.installSubComponents =
    function aw_installSubComponents() {
      this.debug('installing sub components...');
      for (var componentName in this.constructor.SUB_COMPONENTS) {
        if (this.constructor.SUB_COMPONENTS[componentName]) {
          this[componentName] =
            new this.constructor.SUB_COMPONENTS[componentName](this);
        }
      }

      if (this.config.chrome) {
        this.appChrome = new self.AppChrome(this);
      }
    };

  AppWindow.prototype.uninstallSubComponents =
    function aw_uninstallSubComponents() {
      for (var componentName in this.constructor.prototype.SUB_COMPONENTS) {
        if (this[componentName]) {
          this[componentName].destroy();
          this[componentName] = null;
        }
      }

      if (this.config.chrome) {
        this.appChrome.destroy();
        this.appChrome = null;
      }
    };

  AppWindow.prototype._handle__localized = function aw__handle__localized() {
    if (!this.manifest) {
      return;
    }
    this.name = new self.ManifestHelper(this.manifest).name;
    // For uitest.
    this.element.dataset.localizedName = this.name;
    this.publish('namechanged');
  };

  AppWindow.prototype._handle_mozbrowservisibilitychange =
    function aw__handle_mozbrowservisibilitychange(evt) {

      var type = evt.detail.visible ? 'foreground' : 'background';
      this.publish(type);
    };

  AppWindow.prototype._handle_mozbrowseractivitydone =
    function aw__handle_mozbrowseractivitydone(evt) {
      // In case we're not ActivityWindow but we're launched
      // as window disposition activity.
      if (this.activityCaller &&
          this.activityCaller instanceof AppWindow) {
        var caller = this.activityCaller;
        this.activityCaller.activityCallee = null;
        this.activityCaller = null;
        caller.requestOpen();
      }
    };

  AppWindow.prototype._handle_mozbrowserclose =
    function aw__handle_mozbrowserclose(evt) {
      this.kill();
    };

  AppWindow.prototype._handle_mozbrowsererror =
    function aw__handle_mozbrowsererror(evt) {
      if (evt.detail.type !== 'fatal') {
        return;
      }
      // Send event instead of call crash reporter directly.
      this.publish('crashed');
      this.kill();
    };

  AppWindow.prototype._handle_mozbrowserloadstart =
    function aw__handle_mozbrowserloadstart(evt) {
      this.loading = true;
      this._changeState('loading', true);
      this.publish('loading');
    };

  AppWindow.prototype._handle_mozbrowsertitlechange =
    function aw__handle_handle_mozbrowsertitlechange(evt) {
      this.title = evt.detail;
      this.publish('titlechange');
    };

  AppWindow.prototype._handle_mozbrowserloadend =
    function aw__handle_mozbrowserloadend(evt) {
      if (!this.loaded) {
        // Perf test needs.
        this.publish('loadtime', {
          time: parseInt(Date.now() - this.launchTime),
          type: 'c',
          src: this.config.url
        });
      }
      this.loading = false;
      this.loaded = true;
      this.element.classList.add('render');
      this._changeState('loading', false);
      this.publish('loaded');
      var backgroundColor = evt.detail.backgroundColor;
      this.debug('bgcolor= ', backgroundColor);
      /* When rotating the screen, the child may take some time to reflow.
       * If the child takes longer than layers.orientation.sync.timeout
       * to respond, gecko will go ahead and draw anyways. This code
       * uses a simple heuristic to guess the least distracting color
       * we should draw in the blank space. */

      /* Only allow opaque colors */
      // TODOEVME - this kept throwing errors when homescreen launched,
      // bgcolor was null
      if (backgroundColor && backgroundColor.indexOf('rgb(') != -1 &&
          !this.isHomescreen) {
        this.debug('setting background color..');
        this.browser.element.style.backgroundColor = backgroundColor;
      }
    };

  AppWindow.prototype._handle_mozbrowserlocationchange =
    function aw__handle_mozbrowserlocationchange(evt) {
      this.config.url = evt.detail;
      this.publish('locationchange');
    };

  AppWindow.prototype._handle_mozbrowsericonchange =
    function aw__handle_mozbrowsericonchange(evt) {
      this.config.favicon = evt.detail;
      this.publish('iconchange');
    };

  AppWindow.prototype._registerEvents = function aw__registerEvents() {
    if (this.element === null) {
      this._dump();
      return;
    }
    this.constructor.REGISTERED_EVENTS.forEach(function iterator(evt) {
      this.element.addEventListener(evt, this);
    }, this);
  };

  /**
   * General event handler interface.
   * Child classes shouldn't change this.
   * @param  {DOMEvent} evt The event.
   */
  AppWindow.prototype.handleEvent = function aw_handleEvent(evt) {
    this.debug(' Handling ' + evt.type + ' event...');
    if (this['_handle_' + evt.type]) {
      this.debug(' Handling ' + evt.type + ' event...');
      this['_handle_' + evt.type](evt);
    }
  };

  /**
   * A temp variable to store current screenshot blob.
   * We should store the blob and create objectURL
   * once we need to display the image,
   * and revoke right away after we finish rendering the image.
   */
  AppWindow.prototype._screenshotBlob = undefined;

  AppWindow.prototype.CLASS_NAME = 'AppWindow';

  AppWindow.prototype.debug = function aw_debug(msg) {
    if (DEBUG || this._DEBUG) {
      console.log('[Dump: ' + this.CLASS_NAME + ']' +
        '[' + (this.name || this.origin) + ']' +
        '[' + self.System.currentTime() + ']' +
        Array.slice(arguments).concat());
    }
  };

  // Force debug output.
  AppWindow.prototype.forceDebug = function aw_debug(msg) {
    console.log('[Dump:' + this.CLASS_NAME + ']' +
      '[' + (this.name || this.origin) + ']' +
      '[' + self.System.currentTime() + ']' +
      Array.slice(arguments).concat());
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
  AppWindow.prototype.tryWaitForFullRepaint = function onTWFRepaint(callback) {
    if (!callback) {
      return;
    }

    if (this.isHomescreen) {
      setTimeout(callback);
      return;
    }

    this.getScreenshot(function() {
      setTimeout(callback);
    }, 1, 1, 400);
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
   * Show screenshot overlay and hide the iframe.
   */
  AppWindow.prototype._showScreenshotOverlay =
    function aw__showScreenshotOverlay() {
      if (!this.screenshotOverlay) {
        this._hideFrame();
        return;
      }
      this.getScreenshot(function onGettingScreenshot(screenshotBlob) {
        // If the callback is too late,
        // and we're brought to foreground by somebody.
        if (this._screenshotOverlayState == 'frame') {
          return;
        }

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

        if (!this.iframe.classList.contains('hidden')) {
          this._hideFrame();
        }
      }.bind(this));
    };

  /**
   * Check if current visibility state is screenshot or not,
   * to hide the screenshot overlay.
   */
  AppWindow.prototype._hideScreenshotOverlay =
    function aw__hideScreenshotOverlay() {
      if (this.screenshotOverlay &&
          this._screenshotOverlayState != 'screenshot' &&
          this.screenshotOverlay.classList.contains('visible')) {
        this.screenshotOverlay.classList.remove('visible');
      }
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
    // Dispatch internal event before external events.
    this.broadcast(event, detail);
    var evt = new CustomEvent(this.eventPrefix + event,
                {
                  bubbles: true,
                  detail: detail || this
                });

    this.debug(' publishing external event: ' + event);

    // Publish external event.
    window.dispatchEvent(evt);
  };

  AppWindow.prototype.broadcast = function aw_broadcast(event, detail) {
    // Broadcast internal event.
    if (this.element) {
      var internalEvent = new CustomEvent('_' + event,
                            {
                              bubbles: false,
                              detail: detail || this
                            });

      this.debug(' publishing internal event: ' + event);
      this.element.dispatchEvent(internalEvent);
    }
  };

  var OrientationRotationArray = [
    'portrait-primary', 'portrait-secondary', 'portrait',
    'landscape-primary', 'landscape-secondary', 'landscape', 'default'];

  var OrientationRotationTable = {
    'portrait-primary': [0, 180, 0, 90,
              270, 90, self.OrientationManager.isDefaultPortrait() ? 0 : 90],
    'landscape-primary': [270, 90, 270, 0,
              180, 0, self.OrientationManager.isDefaultPortrait() ? 270 : 0],
    'portrait-secondary': [180, 0, 180, 270,
              90, 270, self.OrientationManager.isDefaultPortrait() ? 180 : 270],
    'landscape-secondary': [90, 270, 90, 180,
              0, 180, self.OrientationManager.isDefaultPortrait() ? 180 : 90]
  };

  AppWindow.prototype.determineRotationDegree =
    function aw__determineRotationDegree() {
      if (!this.manifest) {
        return 0;
      }

      var appOrientation = this.manifest.orientation;
      var orientation = this.determineOrientation(appOrientation);
      var table =
        OrientationRotationTable[
          self.OrientationManager.defaultOrientation];
      var degree = table[OrientationRotationArray.indexOf(orientation)];
      this.rotatingDegree = degree;
      if (degree == 90 || degree == 270) {
        this.element.classList.add('perpendicular');
      }
      return degree;
    };

  AppWindow.prototype.determineClosingRotationDegree =
    function aw__determineClosingRotationDegree() {
      if (!this.manifest) {
        return 0;
      }

      // XXX: Assume homescreen's orientation is just device default.
      var homeOrientation = self.OrientationManager.defaultOrientation;
      var currentOrientation = self.OrientationManager
        .fetchCurrentOrientation();
      this.debug(currentOrientation);
      var table = OrientationRotationTable[homeOrientation];
      var degree = table[OrientationRotationArray.indexOf(currentOrientation)];
      return Math.abs(360 - degree) % 360;
    };

  /**
   * Detect whether this is a full screen app by its manifest.
   * @return {Boolean} We're a fullscreen app or not.
   */
  AppWindow.prototype.isFullScreen = function aw_isFullScreen() {
    if (typeof(this._fullScreen) !== 'undefined') {
      return this._fullScreen;
    }
    // Fullscreen
    this._fullScreen = this.manifest &&
      ('fullscreen' in this.manifest ? this.manifest.fullscreen : false);

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

      if (!Array.isArray(orientation)) {
        orientation = [orientation];
      }

      this._defaultOrientation = orientation[0];

      return this._defaultOrientation;
    };

  AppWindow.prototype.calibratedHeight = function aw_calibratedHeight() {
    if (this.appChrome && this.appChrome.hidingNavigation) {
      return this.appChrome.getBarHeight();
    } else {
      return 0;
    }
  };

  AppWindow.prototype._resize = function aw__resize() {
    var height, width;
    this.debug('force RESIZE...');
    if (self.LayoutManager.keyboardEnabled) {
      /**
       * The event is dispatched on the app window only when keyboard is up.
       *
       * @access private
       * @event AppWindow~_withkeyboard
       */
      this.broadcast('withkeyboard');
    } else {
      /**
       * The event is dispatched on the app window only when keyboard is hidden.
       *
       * @access private
       * @event AppWindow~_withoutkeyboard
       */
      this.broadcast('withoutkeyboard');
    }
    if (this.isFullScreen()) {
      height = self.LayoutManager.fullscreenHeight + this.calibratedHeight();
    } else {
      height = self.LayoutManager.usualHeight + this.calibratedHeight();
    }

    // If we have sidebar in the future, change LayoutManager then.
    width = self.LayoutManager.width;

    this.width = width;
    this.height = height;
    this.element.style.width = this.width + 'px';
    this.element.style.height = this.height + 'px';

    /**
     * Fired when the app is resized.
     *
     * @event AppWindow#appresize
     */
    this.publish('resize');
    this.debug('W:', this.width, 'H:', this.height);

    // TODO: Put ActivityWindow resize logic inside AppWindow
    // seems strange.
    if (this.activityCallee &&
        this.activityCallee instanceof self.ActivityWindow) {
      this.activityCallee.resize();
    }
  };

 /**
  * Set the size of the app's iframe to match the size of the screen.
  * We have to call this on resize events (which happen when the
  * phone orientation is changed). And also when an app is launched
  * and each time an app is brought to the front, since the
  * orientation could have changed since it was last displayed
  *
  * An appWindow instance only resizes if it's active.
  * Since we already pre-config the size in window.css,
  * if an app is launched by system message we don't need to resize
  * it.
  *
  * ![AppWindow resize flow chart](http://i.imgur.com/bUMm4VM.png)
  */
  AppWindow.prototype.resize = function aw_resize() {
    this.debug('request RESIZE...active? ', this.isActive());
    if (!this.isActive() || this.isTransitioning()) {
      return;
    }
    this.debug(' will resize... ');
    this._resize();
    this.resized = true;
  };

  /**
   * Lock or unlock orientation for this app.
   */
  AppWindow.prototype.setOrientation =
    function aw_setOrientation(noCapture) {
      // Only lock active app's orientation.
      if (this.isActive()) {
        var manifest = this.manifest || this.config.manifest;
        var orientation = manifest ? (manifest.orientation ||
                          self.OrientationManager.globalOrientation) :
                          self.OrientationManager.globalOrientation;
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
          } else {
            this.debug(' locking screen orientation to ' + orientation);
          }
        } else {  // If no orientation was requested, then let it rotate
          if ('unlockOrientation' in screen) {
            screen.unlockOrientation();
          } else if ('mozUnlockOrientation' in screen) {
            screen.mozUnlockOrientation();
          }
          this.debug(' Unlocking screen orientation..');
        }
      }

      // TODO: Maybe have orientation manager to do this.
      if (!noCapture && this.activityCallee &&
          this.activityCallee instanceof self.ActivityWindow) {
        this.activityCallee.setOrientation(noCapture);
      }
    };

  /**
   * fade out to window to black.
   */
  AppWindow.prototype.fadeOut = function aw__fadeout() {
    if (!this.isActive()) {
      this.element.classList.add('fadeout');
      this.debug(' fade out >>>> ');
    }
  };

  /**
   * fade in the window from black.
   */
  AppWindow.prototype.fadeIn = function aw__fadein() {
    if (this.isActive()) {
      this.element.classList.remove('fadeout');
      this.debug(' fade in <<<<< ');
    }
  };

  AppWindow.prototype.setActivityCallee =
    function aw_setActivityCallee(callee) {
      this.activityCallee = callee;
      callee.activityCaller = this;
    };

  AppWindow.prototype.unsetActivityCallee =
    function aw_setActivityCallee() {
      if (this.activityCallee.activityCaller) {
        this.activityCallee.activityCaller = null;
      }
      this.activityCallee = null;
    };

  /**
   * Modify an attribute on this.element
   * @param  {String} type  State type.
   * @param  {String} state State name.
   */
  AppWindow.prototype._changeState = function aw__changeState(type, state) {
    if (this.element) {
      this.element.setAttribute(type + '-state', state.toString());
    }
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

  /**
   * The preferred CSS size of the icon used for cold launch splash for phones.
   */
  AppWindow.prototype.SPLASH_ICON_SIZE_TINY = 60;

  /**
   * The preferred CSS size of the icon used for cold launch splash for
   * other devices.
   */
  AppWindow.prototype.SPLASH_ICON_SIZE_NOT_TINY = 90;

  AppWindow.prototype.getIconForSplash =
    function aw_getIconForSplash(manifest) {
      var icons = this.manifest ?
        ('icons' in this.manifest ? this.manifest.icons : null) : null;
      if (!icons) {
        return null;
      }

      var targetedPixelSize = 2 * (self.ScreenLayout.getCurrentLayout('tiny') ?
        this.SPLASH_ICON_SIZE_TINY : this.SPLASH_ICON_SIZE_NOT_TINY) *
        Math.ceil(window.devicePixelRatio || 1);

      var preferredSize = Number.MAX_VALUE;
      var max = 0;

      for (var size in icons) {
        size = parseInt(size, 10);
        if (size > max) {
          max = size;
        }

        if (size >= targetedPixelSize && size < preferredSize) {
          preferredSize = size;
        }
      }
      // If there is an icon matching the preferred size, we return the result,
      // if there isn't, we will return the maximum available size.
      if (preferredSize === Number.MAX_VALUE) {
        preferredSize = max;
      }

      this._splash = icons[preferredSize];
      this.preloadSplash();
      return icons[preferredSize];
    };

  /**
   * Set splash as our inital background.
   * If the content is loaded then just skip.
   */
  AppWindow.prototype.setFrameBackground =
    function aw_setFrameBackground() {
      if (!this.isHomescreen &&
          !this.loaded && !this.splashed && this.element && this._splash) {
        this.splashed = true;
        this.element.style.backgroundImage = 'url("' + this._splash + '")';

        var iconCSSSize = 2 * (self.ScreenLayout.getCurrentLayout('tiny') ?
        this.SPLASH_ICON_SIZE_TINY : this.SPLASH_ICON_SIZE_NOT_TINY);
        this.element.style.backgroundSize =
          iconCSSSize + 'px ' + iconCSSSize + 'px';
      }
    };

  /**
   * The app window is requesting to be opened.
   *
   * @fires AppWindow#apprequestopen
   */
  AppWindow.prototype.requestOpen = function aw_requestOpen() {
    /**
     * Fired once we'd like to be opened.
     * The one who makes decision to call open() would be AppWindowManager.
     *
     * @event AppWindow#apprequestopen
     */
    this.publish('requestopen');
  };

  /**
   * The app window is requesting to be closed.
   *
   * @fires AppWindow#apprequestclose
   */
  AppWindow.prototype.requestClose = function aw_requestClose() {
    /**
     * Fired once we'd like to be closed.
     * The one who makes decision to call close() would be AppWindowManager.
     *
     * @event AppWindow#apprequestclose
     */
    this.publish('requestclose');
  };

  /**
   * Change URL only when we're at background.
   * @param  {String} url URL.
   */
  AppWindow.prototype.modifyURLatBackground = function aw_changeURL(url) {
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

  /**
   * Do resize and/or ensure repaint before opening the app.
   * @param  {Function} callback Callback when app is ready to be opened.
   */
  AppWindow.prototype.ready = function aw_ready(callback) {
    if (!this.element) {
      return;
    }

    this.debug('requesting to open');
    if (!this.loaded) {
      this.debug('loaded yet');
      setTimeout(callback);
      return;
    } else {
      var invoked = false;
      this.waitForNextPaint(function() {
        if (invoked) {
          return;
        }
        invoked = true;
        setTimeout(callback);
      });
      if (this.isHomescreen) {
        this.setVisible(true);
        return;
      }
      this.tryWaitForFullRepaint(function() {
        if (invoked) {
          return;
        }
        invoked = true;
        setTimeout(callback);
      });
    }
  };

  /**
   * Open the window; the detail is done in appTransitionController.
   * @param  {String} animation The animation class name.
   */
  AppWindow.prototype.open = function aw_open(animation) {
    // Request "open" to our internal transition controller.
    if (this.transitionController) {
      this.debug('open with ' + animation || this.openAnimation);
      this.transitionController.requireOpen(animation);
    }
  };

  /**
   * Close the window; the detail is done in appTransitionController.
   * @param  {String} animation The animation class name.
   */
  AppWindow.prototype.close = function aw_close(animation) {
    // Request "close" to our internal transition controller.
    if (this.transitionController) {
      this.debug('close with ' + animation || this.closeAnimation);
      this.transitionController.requireClose(animation);
    }
  };

  AppWindow.prototype._handle__swipein = function aw_swipein() {
    // Request "open" to our internal transition controller.
    if (this.transitionController) {
      this.transitionController.switchTransitionState('opened');
      this.publish('opened');
    }
  };

  AppWindow.prototype._handle__swipeout = function aw_swipeout() {
    // Request "close" to our internal transition controller.
    if (this.transitionController) {
      this.transitionController.switchTransitionState('closed');
      this.publish('closed');
    }
  };

  exports.AppWindow = AppWindow;
}(window));
