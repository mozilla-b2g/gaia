'use strict';
(function(window) {
  var DEBUG = false;
  var screenElement = document.getElementById('screen');

  /**
   * AppWindowManager manages the life cycle of AppWindow instances.
   *
   * It on demand creates a new AppWindow instance,
   * resize an existing AppWindow instance,
   * destroy a closing AppWindow instance.
   *
   * @module AppWindowManager
   */
  window.AppWindowManager = {
    continuousTransition: false,

    element: document.getElementById('windows'),

    // backward compatibility to WindowManager
    displayedApp: null,

    runningApps: {},

    // TODO: Remove this.
    getRunningApps: function awm_getRunningApps() {
      return this.runningApps;
    },

    getDisplayedApp: function awm_getDisplayedApp() {
      return this.displayedApp;
    },

    getActiveApp: function awm_getActiveApp() {
      return this._activeApp;
    },

    getApp: function awm_getApp(origin) {
      return this.runningApps[origin];
    },

    // reference to active appWindow instance.
    _activeApp: null,

    // store all alive appWindow instances.
    // note: the id is instanceID instead of origin here.
    _apps: {},

    /**
     * Switch to a different app
     * @param {String} origin The origin of the new app.
     * @param {String} [openAnimation] The open animation for opening app.
     * @param {String} [closeAnimation] The close animation for closing app.
     * @memberOf module:AppWindowManager
     */
    display: function awm_display(origin, openAnimation, closeAnimation) {
      this.debug('displaying ' + origin);
      var currentApp = this.displayedApp, newApp = origin ||
        HomescreenLauncher.origin;

      if (newApp === HomescreenLauncher.origin) {
        HomescreenLauncher.getHomescreen();
      } else if (currentApp === null) {
        HomescreenLauncher.getHomescreen().setVisible(false);
      }

      this.debug(' current is ' + currentApp + '; next is ' + newApp);
      if (currentApp == newApp) {
        // Do nothing.
        console.warn('the app has been displayed.');
        return;
      }

      var appNext = this.runningApps[newApp];
      this.debug(appNext);
      if (!appNext) {
        console.warn('no next app.');
        return;
      }

      if (document.mozFullScreen) {
        document.mozCancelFullScreen();
      }

      screenElement.classList.remove('fullscreen-app');

      var appCurrent = this.runningApps[currentApp];
      var switching = appCurrent && !appCurrent.isHomescreen &&
                      !appNext.isHomescreen;

      if (appCurrent && LayoutManager.keyboardEnabled) {
        // Ask keyboard to hide before we switch the app.
        var self = this;
        window.addEventListener('keyboardhidden', function onhiddenkeyboard() {
          window.removeEventListener('keyboardhidden', onhiddenkeyboard);
          self.switchApp(appCurrent, appNext, switching);
        });

        if (this.continuousTransition) {
          // Do keyboard transition.
          KeyboardManager.hideKeyboard();
        } else {
          // Hide keyboard immediately.
          KeyboardManager.hideKeyboardImmediately();
        }
      } else {
        this.switchApp(appCurrent, appNext, switching,
          openAnimation, closeAnimation);
      }
    },

    /**
     * Switch from the current app to the next app.
     * @param  {AppWindow} appCurrent Displayed appWindow instance.
     * @param  {AppWindow} appNext appWindow instance to be shown.
     * @param  {Boolean} [switching] Homescreen doesn't involve in the two apps.
     * @param  {String} [openAnimation] The open animation for opening app.
     * @param  {String} [closeAnimation] The close animation for closing app.
     * @memberOf module:AppWindowManager
     */
    switchApp: function awm_switchApp(appCurrent, appNext, switching,
                                      openAnimation, closeAnimation) {
      this.debug('before ready check' + appCurrent + appNext);
      appNext.ready(function() {
        this.debug('ready to open/close' + switching);
        if (switching)
          HomescreenLauncher.getHomescreen().fadeOut();
        this._updateActiveApp(appNext.isHomescreen ?
          HomescreenLauncher.origin : appNext.origin);

        var immediateTranstion = false;
        if (appNext.rotatingDegree === 90 || appNext.rotatingDegree === 270) {
          immediateTranstion = true;
        } else if (appCurrent) {
          var degree = appCurrent.determineClosingRotationDegree();
          if (degree === 90 || degree === 270) {
            immediateTranstion = true;
          }
        }

        if (appNext.resized &&
            !LayoutManager.match(appNext.width,
              appNext.height - appNext.calibratedHeight(),
              appNext.isFullScreen())) {
          immediateTranstion = true;
        }

        appNext.open(immediateTranstion ? 'immediate' :
                      ((switching === true) ? 'invoked' : openAnimation));
        if (appCurrent) {
          appCurrent.close(immediateTranstion ? 'immediate' :
            ((switching === true) ? 'invoking' : closeAnimation));
        } else {
          this.debug('No current running app!');
        }
      }.bind(this));
    },

    /**
     * The init process from bootstrap to homescreen is opened:
     * <a href="http://i.imgur.com/44LBhKM.png" target="_blank">
     *   <img src="http://i.imgur.com/44LBhKM.png"></img>
     * </a>
     *
     * 1. Applications is ready. (mozApps are parsed.)
     * 2. Bootstrap tells HomescreenLauncher to init.
     * 3. Homescreen is ready.
     * 4. Bootstrap tells FTULauncher to fetch FTU(First Time Use app) info.
     * 5. FTU app is skipped or done.
     * 6. AppWindowManager open homescreen app via HomescreenLauncher.
     *
     * @memberOf module:AppWindowManager
     */
    init: function awm_init() {
      if (LockScreen && LockScreen.locked) {
        this.element.setAttribute('aria-hidden', 'true');
      }
      if (System.slowTransition) {
        this.element.classList.add('slow-transition');
      } else {
        this.element.classList.remove('slow-transition');
      }
      window.addEventListener('launchapp', this);
      window.addEventListener('home', this);
      window.addEventListener('appcreated', this);
      window.addEventListener('appterminated', this);
      window.addEventListener('ftuskip', this);
      window.addEventListener('appopened', this);
      window.addEventListener('apprequestopen', this);
      window.addEventListener('apprequestclose', this);
      window.addEventListener('homescreenopened', this);
      window.addEventListener('reset-orientation', this);
      window.addEventListener('homescreencreated', this);
      window.addEventListener('homescreen-changed', this);
      // Watch chrome event that order to close an app
      window.addEventListener('killapp', this);
      // Watch for event to bring a currently-open app to the foreground.
      window.addEventListener('displayapp', this);
      // Deal with application uninstall event
      // if the application is being uninstalled,
      // we ensure it stop running here.
      window.addEventListener('applicationuninstall', this);
      window.addEventListener('hidewindows', this);
      window.addEventListener('showwindows', this);
      window.addEventListener('hidewindow', this);
      window.addEventListener('showwindow', this);
      window.addEventListener('overlaystart', this);
      window.addEventListener('homegesture-enabled', this);
      window.addEventListener('homegesture-disabled', this);
      window.addEventListener('system-resize', this);

      // update app name when language setting changes
      SettingsListener.observe('language.current', null,
        function(value) {
          if (!value)
            return;
          this.broadcastMessage('localized');
        }.bind(this));

      // continuous transition controlling
      SettingsListener.observe('continuous-transition.enabled', null,
        function(value) {
          if (!value)
            return;
          this.continuousTransition = !!value;
        }.bind(this));
    },

    handleEvent: function awm_handleEvent(evt) {
      switch (evt.type) {
        case 'system-resize':
          this.debug(' Resizing...');
          if (this._activeApp) {
            this.debug(' Resizing ' + this._activeApp.name);
            if (!this._activeApp.isTransitioning()) {
              this._activeApp.resize();
            }
          }
          break;

        // Dispatch internal events for navigation usage.
        // The active app's navigation needs to know homes gesture is
        // toggled to hide itself.
        case 'homegesture-disabled':
        case 'homegesture-enabled':
          this.broadcastMessage(evt.type);
          break;

        case 'appcreated':
          var app = evt.detail;
          this.runningApps[evt.detail.origin] = app;
          break;

        case 'appterminated':
          var app = evt.detail;
          var instanceID = evt.detail.instanceID;
          if (this._activeApp &&
              app.instanceID === this._activeApp.instanceID) {
            this._activeApp = null;
          }
          delete this.runningApps[evt.detail.origin];
          break;

        case 'reset-orientation':
          if (this._activeApp) {
            this._activeApp.setOrientation();
          }
          break;

        case 'ftuskip':
          this.display();
          break;

        case 'appopened':
        case 'homescreenopened':
          // Someone else may open the app,
          // so we need to update active app.
          this._updateActiveApp(evt.detail.isHomescreen ?
            HomescreenLauncher.origin :
            evt.detail.origin);
          break;

        case 'homescreencreated':
          this.runningApps[HomescreenLauncher.origin] = evt.detail;
          break;

        case 'homescreen-changed':
          this.display();
          break;

        case 'killapp':
          this.kill(evt.detail.origin);
          break;

        case 'displayapp':
        case 'apprequestopen':
          this.display(evt.detail.origin);
          break;

        case 'apprequestclose':
          if (evt.detail.isActive())
            this.display();
          break;

        // Deal with application uninstall event
        // if the application is being uninstalled,
        // we ensure it stop running here.
        case 'applicationuninstall':
          this.kill(evt.detail.application.origin);
          break;

        case 'hidewindows':
          this.element.setAttribute('aria-hidden', 'true');
          break;

        case 'showwindows':
          this.element.setAttribute('aria-hidden', 'false');
          break;

        case 'hidewindow':
          var detail = evt.detail;

          if (this._activeApp &&
              this.displayedApp !== HomescreenLauncher.origin) {
            // This is coming from attention screen.
            // If attention screen has the same origin as our active app,
            // we cannot turn off its page visibility
            // because they are sharing the same process and the same docShell,
            // so turn off page visibility would overwrite the page visibility
            // of the active attention screen.
            if (detail && detail.origin &&
                detail.origin === this.displayedApp) {
              return;
            }
            this._activeApp.setVisible(false);
          } else {
            var home = HomescreenLauncher.getHomescreen();
            home && home.setVisible(false);
          }
          break;

        case 'showwindow':
          if (this._activeApp &&
              this.displayedApp !== HomescreenLauncher.origin) {
            this._activeApp.setVisible(true);
          } else {
            var home = HomescreenLauncher.getHomescreen();
            home && home.setVisible(true);
          }
          break;

        case 'overlaystart':
          // Instantly blur the frame in order to ensure hiding the keyboard
          var app = this._activeApp;
          if (app) {
            if (!app.isOOP()) {
              // Bug 845661 - Attention screen does not appears when
              // the url bar input is focused.
              // Calling app.iframe.blur() on an in-process window
              // seems to triggers heavy tasks that froze the main
              // process for a while and seems to expose a gecko
              // repaint issue.
              // So since the only in-process frame is the browser app
              // let's switch it's visibility as soon as possible when
              // there is an attention screen and delegate the
              // responsibility to blur the possible focused elements
              // itself.
              app.setVisible(false, true);
            } else {
              app.blur();
            }
          }
          break;

        // If the lockscreen is active, it will stop propagation on this event
        // and we'll never see it here. Similarly, other overlays may use this
        // event to hide themselves and may prevent the event from getting here.
        // Note that for this to work, the lockscreen and other overlays must
        // be included in index.html before this one, so they can register their
        // event handlers before we do.
        case 'home':
          if (!HomescreenLauncher.ready)
            return;

          if (this._activeApp && !this._activeApp.isHomescreen) {
            // Make sure this happens before activity frame is removed.
            // Because we will be asked by a 'activity-done' event from gecko
            // to relaunch to activity caller, and this is the only way to
            // determine if we are going to homescreen or the original app.

            this.debug('back to home.');
            this.display(HomescreenLauncher.origin);
          } else {
            // dispatch event to close activity.
            this.debug('ensure home.');
            HomescreenLauncher.getHomescreen().ensure(true);
          }
          break;

        case 'launchapp':
          var config = evt.detail;
          this.debug('launching' + config.origin);
          this.launch(config);
          break;
      }
    },

    /**
     * App Config
     * @typedef {Object} AppConfig
     * @property {String} [manifestURL] The manifestURL of the app
     * @property {String} url The URL of the activity handling page
     * @property {String} origin The origin of the app
     * @property {Boolean} [stayBackground=false] This app is launched
     *                                            at background or not.
     *                                            Usually this means it's a
     *                                            request from system message.
     * @property {Boolean} [changeURL=false] Need to change the URL
     *                                       of the running app or not. If it's
     *                                       true, we only change the URL when
     *                                       the app is not running at
     *                                       foreground.
     */

    /**
     * Instanciate app window by configuration
     * @param  {AppConfig} config The configuration of the app window
     * @memberOf module:AppWindowManager
     */
    launch: function awm_launch(config) {
      // Don't need to relaunch system app.
      if (config.url === window.location.href)
        return;

      // ActivityWindowManager
      if (config.isActivity && config.inline)
        return;

      if (config.stayBackground) {
        this.debug('launching background service: ' + config.url);
        // If the message specifies we only have to show the app,
        // then we don't have to do anything here
        if (config.changeURL) {
          if (this.runningApps[config.origin]) {
            this.runningApps[config.origin].modifyURLatBackground(config.url);
          } else if (config.origin !== HomescreenLauncher.origin) {
            // XXX: We could ended opening URls not for the app frame
            // in the app frame. But we don't care.
            new AppWindow(config);
          } else {
            HomescreenLauncher.getHomescreen().ensure();
          }
        }
        return;
      } else {
        if (config.origin == HomescreenLauncher.origin) {
          // No need to append a frame if is homescreen
          this.display();
        } else {
          // The policy is we always check the same apps are already
          // opened by checking manifestURL + pageURL.
          if (!this.runningApps[config.origin]) {
            new AppWindow(config);
          }
          this.display(config.origin);
        }

        // We will only bring apps to the foreground when the message
        // specifically requests it.
        if (!config.isActivity || !this._activeApp)
          return;

        var caller = this._activeApp;
        this.runningApps[config.origin].activityCaller = caller;
        caller.activityCallee = this.runningApps[config.origin];
      }
    },

    debug: function awm_debug() {
      if (DEBUG) {
        console.log('[AppWindowManager]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    /**
     * Kill the running app window by origin
     *
     * AppWindow instances are responsible to kill theirselves whenever
     * there's something wrong when the app/page is running.
     * For example: OOM, crashed, window.close().
     *
     * When we need to kill a running instance,
     * we call kill on the instance and let the instance to request 'close'
     * to AppWindowManager or just destroy itself if it's at background.
     *
     * <a href="http://i.imgur.com/VrlkUXM.png" target="_blank">
     *   <img src="http://i.imgur.com/VrlkUXM.png"></img>
     * </a>
     *
     * @param  {String} origin The origin of the running app window to be killed
     * @memberOf module:AppWindowManager
     */
    kill: function awm_kill(origin) {
      if (this.runningApps[origin]) {
        this.runningApps[origin].kill();
      }
    },

    publish: function awm_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail || this);

      this.debug('publish: ' + event);
      window.dispatchEvent(evt);
    },

    _updateActiveApp: function awm__changeActiveApp(origin) {
      this.displayedApp = origin;
      this._activeApp = this.runningApps[this.displayedApp];
      this.debug(origin + this._activeApp.isFullScreen());
      if (this._activeApp.isFullScreen()) {
        screenElement.classList.add('fullscreen-app');
      } else {
        screenElement.classList.remove('fullscreen-app');
      }
      this.debug('=== Active app now is: ',
        this._activeApp.name || this._activeApp.origin, '===');
    },

    /**
     * Broadcast message to all running app window instances
     *
     * Used while an event needs to be manipulated by
     * all running instances. You should register the event handler
     * in the appWindow as well.
     *
     * @example
     * AppWindowManager.broadcastMessage('earthquake');
     *
     * AppWindow.prototype._handle__earthquake = function() {
     *   // Run on my own!
     * };
     *
     * AppWindow.REGISTERED_EVENTS.push('_earthquake');
     *
     * @param  {String} message The message name
     * @param  {Object} [detail]  The detail of the message
     * @memberOf module:AppWindowManager
     */
    broadcastMessage: function awm_broadcastMessage(message, detail) {
      for (var id in this.runningApps) {
        this.runningApps[id].broadcast(message, detail);
      }
    }
  };

  AppWindowManager.init();
}(this));
