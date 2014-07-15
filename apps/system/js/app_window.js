/* global SettingsListener, OrientationManager */
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

    if (DEBUG || this._DEBUG) {
      AppWindow[this.instanceID] = this;
    }

    this.launchTime = Date.now();

    return this;
  };

  /**
   * When this option is set to true,
   * an app would not be removed while it's crashed.
   * And while it's opened next, we will re-render the mozbrowser iframe.
   * @type {Boolean}
   */
  AppWindow.SUSPENDING_ENABLED = false;
  SettingsListener.observe('app-suspending.enabled', false, function(value) {
    AppWindow.SUSPENDING_ENABLED = !!value;
  });

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
      this.instanceID = this.CLASS_NAME + '_' + _id;
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

    if (!this.manifestURL && !this.config.chrome) {
      this.config.chrome = {
        navigation: true
      };
    }

    if (!this.manifest && this.config && this.config.title) {
      this.updateName(this.config.title);
    } else {
      this.name = new self.ManifestHelper(this.manifest).name;
    }

    // Get icon splash
    this.getIconForSplash();

    this.generateID();
    /**
     * The instanceID of the root window of this window.
     * @type {String}
     */
    this.groupID = this.getRootWindow().instanceID;
    if (this.previousWindow) {
      this.previousWindow.setNextWindow(this);
    } else if (this.rearWindow) {
      this.rearWindow.setFrontWindow(this);
    }
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
      this.debug('set visibility -> ', visible);
      this.setVisibleForScreenReader(visible);
      if (visible) {
        // If this window is not the lockscreen, and the screen is locked,
        // we need to aria-hide the window.
        this._screenshotOverlayState = 'frame';
        this._showFrame();
      } else {
        if (this.identificationOverlay) {
          this.identificationOverlay.classList.add('visible');
        }

        var partOfHomescreen = this.getBottomMostWindow().isHomescreen;
        if (screenshotIfInvisible && !partOfHomescreen) {
          this._screenshotOverlayState = 'screenshot';
          this._showScreenshotOverlay();
        } else {
          this._screenshotOverlayState = 'none';
          this._hideFrame();
          this._hideScreenshotOverlay();
        }
      }

      this.debug('screenshot state -> ', this._screenshotOverlayState);
      if (this.frontWindow) {
        this.frontWindow.setVisible(visible, screenshotIfInvisible);
      }
    };

  /**
   * Set screen reader visibility.
   * @type {Boolean} A flag indicating if it should be visible to the screen
   * reader.
   */
  AppWindow.prototype.setVisibleForScreenReader =
    function aw_setVisibleForScreenReader(visible) {
      this.element.setAttribute('aria-hidden', !visible);
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
    if (!this.element) {
      return false;
    }

    if (this.element.classList.contains('will-become-active')) {
      return true;
    }

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
   * If the instance is crashed but not resumed yet,
   * it would be in suspended state.
   *
   * The state would be turned off once we render the browser again.
   * @type {Boolean}
   */
  AppWindow.prototype.suspended = false;

  /**
   * Re-render the browser element with the same config.
   */
  AppWindow.prototype.reviveBrowser = function() {
    if (this.browser) {
      return;
    }
    this.debug(' ...revived!');
    this.browser = new self.BrowserFrame(this.browser_config);
    this.element.appendChild(this.browser.element);
    this.iframe = this.browser.element;
    this.launchTime = Date.now();
    this.suspended = false;
    this.element.classList.remove('suspended');
    // Launch as background by default.
    this._setVisible(false);
    this.publish('resumed');
  };

  /**
   * Remove the browser element and clear the states of the browser.
   * @fires AppWindow#suspended
   */
  AppWindow.prototype.destroyBrowser = function() {
    if (!this.browser) {
      return;
    }
    this.loading = false;
    this.loaded = false;
    this.suspended = true;
    this.element.classList.add('suspended');
    this.element.removeChild(this.browser.element);
    this.browser = null;
    this.publish('suspended');
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
  AppWindow.prototype.kill = function aw_kill(evt) {
    if (this._killed) {
      return;
    }

    this._killed = true;

    if (DEBUG) {
      AppWindow[this.instanceID] = null;
    }

    // Remove callee <-> caller reference before we remove the window.
    if (this.callerWindow) {
      this.callerWindow.calleeWindow = null;
      this.callerWindow = null;
    }
    if (this.calleeWindow) {
      this.calleeWindow.callerWindow = null;
      this.calleeWindow = null;
    }

    // Kill any front window.
    if (this.frontWindow) {
      this.frontWindow.kill();
      this.frontWindow = null;
    }

    // Kill any next window.
    if (this.nextWindow) {
      this.nextWindow.kill();
      this.nextWindow = null;
    }

    // If the app is the currently displayed app, switch to the homescreen
    if (this.isActive() && !this.isHomescreen) {
      this.element.addEventListener('_closed', (function onClosed() {
        window.removeEventListener('_closed', onClosed);
        this.destroy();
      }).bind(this));
      if (this.previousWindow) {
        this.previousWindow.getBottomMostWindow().open('in-from-left');
        this.close('out-to-right');
      } else {
        this.requestClose();
      }
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
    // Remove previous -> next reference.
    if (this.previousWindow) {
      this.previousWindow.unsetNextWindow();
      this.previousWindow = null;
    }

    // Remove rear -> front reference.
    if (this.rearWindow) {
      this.rearWindow.unsetFrontWindow();
      this.rearWindow = null;
    }
    this.publish('willdestroy');
    this.uninstallSubComponents();
    if (this.element) {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
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
              '<div class="statusbar-overlay"></div>' +
              '<div class="identification-overlay">' +
                '<div>' +
                  '<div class="icon"></div>' +
                  '<span class="title"></span>' +
                '</div>' +
              '</div>' +
              '<div class="fade-overlay"></div>' +
              '<div class="touch-blocker"></div>' +
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
    // window.open would offer the iframe so we don't need to generate.
    if (this.iframe) {
      this.browser = {
        element: this.iframe
      };
    } else {
      this.browser = new self.BrowserFrame(this.browser_config);
    }
    this.element = document.getElementById(this.instanceID);

    // For gaiauitest usage.
    this.element.dataset.manifestName = this.manifest ? this.manifest.name : '';

    // XXX: Remove following two lines once mozbrowser element is moved
    // into appWindow.
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.iframe.dataset.frameType = 'window';
    this.iframe.dataset.frameOrigin = this.origin;
    this.iframe.dataset.url = this.config.url;

    if (this.isFullScreen()) {
      this.element.classList.add('fullscreen-app');
    }

    this.element.appendChild(this.browser.element);

    // Intentional! The app in the iframe gets two resize events when adding
    // the element to the page (see bug 1007595). The first one is incorrect,
    // thus assumptions made (media queries or rendering) can be wrong (see
    // bug 995886). A sync reflow makes it that there will only be one resize.
    // Please remove after 1007595 has been fixed.
    this.browser.element.offsetWidth;
    // End intentional

    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.statusbarOverlay = this.element.querySelector('.statusbar-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');

    var overlay = '.identification-overlay';
    this.identificationOverlay = this.element.querySelector(overlay);
    var icon = '.identification-overlay .icon';
    this.identificationIcon = this.element.querySelector(icon);
    var title = '.identification-overlay .title';
    this.identificationTitle = this.element.querySelector(title);

    // Launched as background: set visibility and overlay screenshot.
    if (this.config.stayBackground) {
      this.setVisible(false, false /* no screenshot */);
    } else if (this.isHomescreen) {
      // homescreen is launched at background under FTU/lockscreen too.
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
   * Check an appWindow is a regular browsing window, not tied to a particular
   * application.
   *
   * @return {Boolean} is the current instance a browsing window.
   */
  AppWindow.prototype.isBrowser = function aw_isbrowser() {
    return !this.manifestURL;
  };

  /**
   * Check an appWindow contains a certified application
   *
   * @return {Boolean} is the current instance a certified application.
   */
  AppWindow.prototype.isCertified = function aw_iscertified() {
    return this.config.manifest && 'certified' === this.config.manifest.type;
  };

  /**
   * Try to navigate the current frame to a given url if current instance
   * is a browsing window.
   * @param {String} url The url to navigate to
   */
  AppWindow.prototype.navigate = function aw_isbrowser(url) {
    if (this.isBrowser()) {
      // Kill any front window.
      if (this.frontWindow) {
        this.frontWindow.kill();
        this.frontWindow = null;
      }
      this.browser.element.src = url;
    }
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
     'mozbrowsermetachange', 'mozbrowsericonchange', 'mozbrowserasyncscroll',
     '_localized', '_swipein', '_swipeout', '_kill_suspended',
     '_orientationchange', '_focus'];

  AppWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'valueSelector': window.ValueSelector,
    'authDialog': window.AppAuthenticationDialog,
    'contextmenu': window.BrowserContextMenu,
    'childWindowFactory': window.ChildWindowFactory,
    'textSelectionDialog': window.TextSelectionDialog
  };

  /**
   * The event list is coming from current implemented mozbrowser events.
   * https://developer.mozilla.org/en-US/docs/WebAPI/Browser
   *
   * We need to stop them from propgating to this window's parent.
   * @type {Array}
   */
  var SELF_MANAGED_EVENTS = [
    'mozbrowserasyncscroll',
    'mozbrowserclose',
    'mozbrowsercontextmenu',
    'mozbrowsererror',
    'mozbrowsericonchange',
    'mozbrowserloadend',
    'mozbrowserloadstart',
    'mozbrowserlocationchange',
    'mozbrowseropenwindow',
    'mozbrowsersecuritychange',
    'mozbrowsershowmodalprompt',
    'mozbrowsertitlechange',
    'mozbrowserusernameandpasswordrequired',
    'mozbrowseropensearch',
    'mozbrowsermetachange'
  ];

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
      if (this.config.chrome &&
          (this.config.chrome.navigation ||
           this.config.chrome.rocketbar)) {
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

    if (this.identificationTitle) {
      this.identificationTitle.textContent = this.name;
    }

    // For uitest.
    this.element.dataset.localizedName = this.name;
    this.publish('namechanged');
  };

  AppWindow.prototype._handle__orientationchange = function() {
    if (this.isActive()) {
      // Will be resized by the AppWindowManager
      return;
    }

    // Resize only the overlays not the app
    var width = self.layoutManager.width;
    var height = self.layoutManager.height + this.calibratedHeight();

    this.iframe.style.width = this.width + 'px';
    this.iframe.style.height = this.height + 'px';

    this.element.style.width = width + 'px';
    this.element.style.height = height + 'px';

    // The homescreen doesn't have an identification overlay
    if (this.isHomescreen) {
      return;
    }

    // If the screenshot doesn't match the new orientation hide it
    if (this.width != width) {
      this.screenshotOverlay.style.visibility = 'hidden';
    } else {
      this.screenshotOverlay.style.visibility = '';
    }
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
      if (this.isActive() && this.callerWindow) {
        var caller = this.callerWindow;
        var callerBottom = caller.getBottomMostWindow();
        var calleeBottom = this.getBottomMostWindow();
        caller.calleeWindow = null;
        this.callerWindow = null;
        // No transition when the callee is caller
        if (callerBottom !== calleeBottom) {
          callerBottom.open('in-from-left');
          calleeBottom.close('out-to-right');
        }
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

      if (this.constructor.SUSPENDING_ENABLED && !this.isActive()) {
        this.debug(' ..sleep! I will come back.');
        this.destroyBrowser();
      } else {
        this.kill(evt);
      }
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

      if (this.identificationTitle && !this.manifest) {
        this.identificationTitle.textContent = this.title;
      }
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
      // Force removing background image.
      this.element.style.backgroundImage = 'none';
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
      // Integration test needs to locate the frame by this attribute.
      this.browser.element.dataset.url = evt.detail;
      this.publish('locationchange');
    };

  AppWindow.prototype._handle_mozbrowsericonchange =
    function aw__handle_mozbrowsericonchange(evt) {
      this.config.favicon = evt.detail;
      if (this.identificationIcon) {
        this.identificationIcon.style.backgroundImage =
          'url("' + evt.detail.href + '")';
      }
      this.publish('iconchange');
    };

  AppWindow.prototype._handle_mozbrowserasyncscroll =
    function aw__handle_mozbrowserasyncscroll(evt) {
      if (this.manifest) {
        return;
      }
      this.scrollPosition = evt.detail.top;
      this.publish('scroll');
    };

  AppWindow.prototype._handle_mozbrowsermetachange =
    function aw__handle_mozbrowsermetachange(evt) {
      if (evt.detail.name === 'brand-color') {
        this.brandColor = evt.detail.content;
        this.statusbarOverlay.style.backgroundColor = this.brandColor;
        this.publish('brandcolorchange');
      }
    };

  AppWindow.prototype._registerEvents = function aw__registerEvents() {
    if (this.element === null) {
      this._dump();
      return;
    }
    this.constructor.REGISTERED_EVENTS.forEach(function iterator(evt) {
      this.element.addEventListener(evt, this);
    }, this);
    SELF_MANAGED_EVENTS.forEach(function iterator(evt) {
      if (this.constructor.REGISTERED_EVENTS.indexOf(evt) < 0) {
        this.element.addEventListener(evt, this);
      }
    }, this);
  };

  /**
   * General event handler interface.
   * Child classes shouldn't change this.
   * @param  {DOMEvent} evt The event.
   */
  AppWindow.prototype.handleEvent = function aw_handleEvent(evt) {
    // We are rendering inline activities + popup inside this element too,
    // so we need to prevent ourselves to be affected
    // by the mozbrowser events of the callee.

    // WebAPI testing is using mozbrowserloadend event to know
    // the first app is loaded so we cannot stop the propagation here.
    // but we don't want subsequent mozbrowser events to bubble to the
    // used-to-be-rear-window
    if (this.rearWindow && evt.type.startsWith('mozbrowser')) {
      evt.stopPropagation();
    }
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
        '[' + this.instanceID + ']' +
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

  AppWindow.prototype.queueShow = function aw_queueShow() {
    this.element.classList.add('will-become-active');
  };

  AppWindow.prototype.cancelQueuedShow = function aw_cancelQueuedShow() {
    this.element.classList.remove('will-become-active');
  };

  AppWindow.prototype.queueHide = function aw_queueHide() {
    this.element.classList.add('will-become-inactive');
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

    this.debug('trying wait for full repaint by screenshot enforcing..');

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
      if (this.frontWindow) {
        return this.frontWindow.requestScreenshotURL();
      }
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

        this.screenshotOverlay.classList.add('visible');

        if (!screenshotBlob) {
          // If no screenshot,
          // still hide the frame.
          this._hideFrame();
          return;
        }

        var screenshotURL = this.requestScreenshotURL();

        this.screenshotOverlay.style.backgroundImage =
          'url(' + screenshotURL + ')';

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
      if (!this.screenshotOverlay ||
          this._screenshotOverlayState == 'screenshot' ||
          !this.screenshotOverlay.classList.contains('visible')) {
        return;
      }

      this.screenshotOverlay.classList.remove('visible');
      this.screenshotOverlay.style.backgroundImage = '';

      if (this.identificationOverlay) {
        var overlay = this.identificationOverlay;
        // A white flash can occur when removing the screenshot
        // so we trigger this transition after a tick to hide it.
        setTimeout(function nextTick() {
          overlay.classList.remove('visible');
        });
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

    this.debug(' publishing external event: ' + event +
      JSON.stringify(detail));

    // Publish external event.
    if (this.rearWindow && this.element) {
      this.element.dispatchEvent(evt);
    } else {
      window.dispatchEvent(evt);
    }
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
              270, 90, OrientationManager.isDefaultPortrait() ? 0 : 90],
    'landscape-primary': [270, 90, 270, 0,
              180, 0, OrientationManager.isDefaultPortrait() ? 270 : 0],
    'portrait-secondary': [180, 0, 180, 270,
              90, 270, OrientationManager.isDefaultPortrait() ? 180 : 270],
    'landscape-secondary': [90, 270, 90, 180,
              0, 180, OrientationManager.isDefaultPortrait() ? 180 : 90]
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
          OrientationManager.defaultOrientation];
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
      var homeOrientation = OrientationManager.defaultOrientation;
      var currentOrientation = OrientationManager
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
    if (self.layoutManager.keyboardEnabled) {
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
    height = self.layoutManager.height + this.calibratedHeight();

    // If we have sidebar in the future, change layoutManager then.
    width = self.layoutManager.width;

    this.width = width;
    this.height = height;
    this.element.style.width = this.width + 'px';
    this.element.style.height = this.height + 'px';

    this.iframe.style.width = '';
    this.iframe.style.height = '';

    this.resized = true;
    if (this.screenshotOverlay) {
      this.screenshotOverlay.style.visibility = '';
    }

    /**
     * Fired when the app is resized.
     *
     * @event AppWindow#appresize
     */
    this.publish('resize');
    this.debug('W:', this.width, 'H:', this.height);
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
    var bottom = this.getBottomMostWindow();
    if (!bottom.isActive() || this.isTransitioning()) {
      return;
    }
    var top = this.getTopMostWindow();
    if (top.instanceID != this.instanceID) {
      bottom._resize();
      top.resize();
    } else {
      // resize myself if no child.
      this.debug(' will resize... ');
      this._resize();
    }
  };

  AppWindow.prototype.getTopMostWindow = function() {
    var win = this;
    while (win.frontWindow) {
      win = win.frontWindow;
    }

    return win;
  };

  AppWindow.prototype.getBottomMostWindow = function() {
    var win = this;

    while (win.rearWindow) {
      win = win.rearWindow;
    }

    return win;
  };

  /**
   * Lock the orientation for this app anyway.
   */
  AppWindow.prototype.lockOrientation = function() {
    var manifest = this.manifest || this.config.manifest;
    var orientation = manifest ? (manifest.orientation ||
                      OrientationManager.globalOrientation) :
                      OrientationManager.globalOrientation;
    if (orientation) {
      var rv = screen.mozLockOrientation(orientation);
      if (rv === false) {
        console.warn('screen.mozLockOrientation() returned false for',
                     this.origin, 'orientation', orientation);
      } else {
        this.debug(' locking screen orientation to ' + orientation);
      }
    } else {  // If no orientation was requested, then let it rotate
      screen.mozUnlockOrientation();
      this.debug(' Unlocking screen orientation..');
    }
  };

  /**
   * Lock or unlock orientation for this app.
   * Note: if we have front window, the request would be delivered
   * to the front active window.
   */
  AppWindow.prototype.setOrientation =
    function aw_setOrientation() {
      if (!this.getBottomMostWindow().isActive()) {
        return;
      }
      if (this.frontWindow && this.frontWindow.isActive()) {
        this.frontWindow.setOrientation();
      } else {
        this.lockOrientation();
      }
    };

  /**
   * fade out to window to black.
   */
  AppWindow.prototype.fadeOut = function aw__fadeout() {
    if (!this.isActive() && this.element) {
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

  AppWindow.prototype.setCalleeWindow =
    function aw_setCalleeWindow(callee) {
      this.calleeWindow = callee;
      callee.callerWindow = this;
    };

  AppWindow.prototype.unsetCalleeWindow =
    function aw_unsetCalleeWindow() {
      if (this.calleeWindow.callerWindow) {
        this.calleeWindow.callerWindow = null;
      }
      this.calleeWindow = null;
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
      if (this.config.icon) {
        this._splash = this.config.icon;
      } else {
        // origin might contain a pathname too, so need to parse it to find the
        // "real origin"
        var url = this.config.origin.split('/');
        var origin = url[0] + '//' + url[2];
        this._splash = origin + this._splash;
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
          !this.loaded && !this.splashed && this.element) {

        if (this._splash) {
          this.splashed = true;
          this.element.style.backgroundImage = 'url("' + this._splash + '")';

          var iconCSSSize = 2 * (self.ScreenLayout.getCurrentLayout('tiny') ?
          this.SPLASH_ICON_SIZE_TINY : this.SPLASH_ICON_SIZE_NOT_TINY);
          this.element.style.backgroundSize =
            iconCSSSize + 'px ' + iconCSSSize + 'px';

          this.identificationIcon.style.backgroundImage =
            'url("' + this._splash + '")';
        }

        if (this.identificationTitle) {
          this.identificationTitle.textContent = this.name;
        }
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
    if (!this.loaded || this._screenshotOverlayState == 'screenshot') {
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
      this.transitionController.requireClose(animation);
    }
  };

  AppWindow.prototype._handle__swipein = function aw_swipein() {
    // Revive the browser element if it's got killed in background.
    this.reviveBrowser();
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

  AppWindow.prototype._handle__kill_suspended = function aw() {
    if (this.suspended) {
      this.kill();
    }
  };

  /**
   * Link child window to this app window instance.
   * If there's already one, kill it at first.
   * @param {ChildWindow} childWindow The child window instance.
   */
  AppWindow.prototype.setNextWindow = function aw_setNextWindow(nextWindow) {
    if (this.nextWindow) {
      console.warn('There is already alive child window, killing...',
                    this.nextWindow.instanceID);
      this.nextWindow.kill();
    }
    this.nextWindow = nextWindow;
  };

  AppWindow.prototype.unsetNextWindow = function aw_unsetNextWindow() {
    if (this.nextWindow) {
      this.nextWindow = null;
    }
  };

  /**
   * Build bottom/top window relationship.
   * If there's already one, kill it at first.
   * @param {AppWindow} fronWindow The front window instance.
   */
  AppWindow.prototype.setFrontWindow = function aw_setFrontWindow(frontWindow) {
    if (this.frontWindow) {
      console.warn('There is already alive child window, killing...',
                    this.frontWindow.instanceID);
      this.frontWindow.kill();
    }
    this.frontWindow = frontWindow;
  };

  AppWindow.prototype.unsetFrontWindow = function aw_unsetFrontWindow() {
    if (this.frontWindow) {
      this.frontWindow = null;
    }
  };

  /**
   * Get the previous window reference of current active one.
   * @return {AppWindow} The previous one in the app sheet chain.
   */
  AppWindow.prototype.getPrev = function() {
    var current = this.getActiveWindow();
    if (current) {
      return current.previousWindow;
    } else {
      return null;
    }
  };

  /**
   * Get the next window reference of current active one.
   * @return {AppWindow} The next one in the app sheet chain.
   */
  AppWindow.prototype.getNext = function() {
    var current = this.getActiveWindow();
    if (current) {
      return current.nextWindow;
    } else {
      return null;
    }
  };

  /**
   * Get the active window reference in the app sheet chain.
   * If there's no active window, return null.
   * @return {AppWindow} The active window in the app sheet chain.
   */
  AppWindow.prototype.getActiveWindow = function() {
    var app = this;
    while (app) {
      if (app.isActive()) {
        return app;
      }
      app = app.nextWindow;
    }
    return null;
  };

  /**
   * Get the root window reference.
   * If there's no parent, return ourself.
   * @return {AppWindow} The first one in the app sheet chain.
   */
  AppWindow.prototype.getRootWindow = function() {
    var app = this;
    while (app.previousWindow) {
      app = app.previousWindow;
    }
    return app;
  };

  /**
   * Get the leaf window reference.
   * If there's no child, return ourself.
   * @return {AppWindow} The last one in the app sheet chain.
   */
  AppWindow.prototype.getLeafWindow = function() {
    var app = this;
    while (app.nextWindow) {
      app = app.nextWindow;
    }
    return app;
  };

  AppWindow.prototype.getFrameForScreenshot = function() {
    var top = this.getTopMostWindow();
    return top.browser ? top.browser.element : null;
  };

  /**
   * Indicate we are in viewport or not.
   * @return {Boolean} We are in viewport or outside viewport.
   */
  AppWindow.prototype.isVisible = function() {
    var bottomMostWindow = this.getBottomMostWindow();
    return bottomMostWindow.isActive() && this.isActive();
  };

  /**
   * Make adjustments to display inside the task manager
   */
  AppWindow.prototype.enterTaskManager = function aw_enterTaskManager() {
    this._dirtyStyleProperties = {};
    if (this.element) {
      this.element.classList.add('in-task-manager');
    }
  };

  /**
   * Remove adjustments made to display inside the task manager
   */
  AppWindow.prototype.leaveTaskManager = function aw_leaveTaskManager() {
    if (this.element) {
      this.element.classList.remove('in-task-manager');
      this.unapplyStyle(this._dirtyStyleProperties);
      this._dirtyStyleProperties = null;
    }
  };

  /**
   * Apply a transform to the element
   * @param {Object} nameValues object with transform property names as keys
   *                            and values to apply to the element
   * @memberOf AppWindow.prototype
   */
  AppWindow.prototype.transform = function(nameValues) {
    var strFunctions = Object.keys(nameValues).map(function(key) {
      return key + '(' + nameValues[key] + ')';
    }, this).join(' ');
    this.applyStyle({ MozTransform: strFunctions });
  };

  /**
   * Batch apply style properties
   * @param {Object} nameValues object with style property names as keys
   *                            and values to apply to the element
   * @memberOf AppWindow.prototype
   */
  AppWindow.prototype.applyStyle = function(nameValues) {
    var dirty = this._dirtyStyleProperties || (this._dirtyStyleProperties = {});
    var style = this.element.style;
    for (var property in nameValues) {
      if (undefined === nameValues[property]) {
        delete style[[property]];
      } else {
        style[property] = nameValues[property];
      }
      dirty[property] = true;
    }
  };

  /**
   * Remove inline style properties
   * @param {Object} nameValues object with style property names as keys
   * @memberOf AppWindow.prototype
   */
  AppWindow.prototype.unapplyStyle = function(nameValues) {
    var style = this.element.style;
    for (var pname in nameValues) {
      style[pname] = '';
      delete style[pname];
    }
  };

  /**
   * Show the default contextmenu for an AppWindow
   * @memberOf AppWindow.prototype
   */
  AppWindow.prototype.showDefaultContextMenu = function() {
    if (this.contextmenu) {
      this.contextmenu.showDefaultMenu();
    }
  };

  /**
   * Hide the contextmenu for an AppWindow
   * @memberOf AppWindow.prototype
   */
  AppWindow.prototype.hideContextMenu = function() {
    if (this.contextmenu) {
      this.contextmenu.hide();
    }
  };

  AppWindow.prototype._handle__focus = function() {
    var win = this;
    while (win.frontWindow && win.frontWindow.isActive()) {
      win = win.frontWindow;
    }
    win.focus();
  };

  exports.AppWindow = AppWindow;
}(window));
