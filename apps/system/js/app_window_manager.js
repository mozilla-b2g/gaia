/* global SettingsListener, homescreenLauncher, KeyboardManager,
          layoutManager, System */
'use strict';

(function(exports) {
  var DEBUG = false;
  var screenElement = document.getElementById('screen');

  /**
   * AppWindowManager manages the interaction of AppWindow instances.
   *
   * * Controll the open/close request of the living appWindow
   *   instances.
   * * Deliver the resize/orientation lock/setVisible request
   *   from LayoutManager/OrientationManager/VisibilityManager to the
   *   active appWindow instance.
   *
   * @module AppWindowManager
   */
  var AppWindowManager = {
    continuousTransition: false,

    element: document.getElementById('windows'),

    /**
     * Test the app is already running.
     * @param {AppConfig} app The configuration of app.
     * @return {Boolean} The app is running or not.
     */
    isRunning: function awm_isRunning(config) {
      if (config.manifestURL && this.getApp(config.origin)) {
        return true;
      } else {
        return false;
      }
    },

    getActiveApp: function awm_getActiveApp() {
      return this._activeApp;
    },

    /**
     * Match app origin and get the first matching one.
     * @param  {String} origin The origin to be matched.
     * @return {AppWindow}        The app window object matched.
     */
    getApp: function awm_getApp(origin) {
      for (var id in this._apps) {
        if (this._apps[id].origin == origin) {
          return this._apps[id];
        }
      }
      return null;
    },

    /**
     * Match app origin and get the first matching one.
     * @return {Object} The running app window references stored
     *                  by its instanceID.
     */
    getApps: function awm_getApps(origin) {
      return this._apps;
    },

    // reference to active appWindow instance.
    _activeApp: null,

    // store all alive appWindow instances.
    // note: the id is instanceID instead of origin here.
    _apps: {},

    // store all callback functions in order to unobserve them when uninit.
    _settingsObserveHandler: null,

    /**
     * Switch to a different app
     * @param {AppWindow} newApp The new app window instance.
     * @param {String} [openAnimation] The open animation for opening app.
     * @param {String} [closeAnimation] The close animation for closing app.
     * @memberOf module:AppWindowManager
     */
    display: function awm_display(newApp, openAnimation, closeAnimation) {
      this._dumpAllWindows();
      var appCurrent = this._activeApp, appNext = newApp ||
        homescreenLauncher.getHomescreen(true);

      if (!appNext) {
        console.warn('no next app.');
        return;
      }

      // If the app has child app window, open it instead.
      while (appNext.nextWindow) {
        appNext = appNext.nextWindow;
      }

      this.debug(' current is ' + (appCurrent ? appCurrent.url : 'none') +
                  '; next is ' + (appNext ? appNext.url : 'none'));

      if (appCurrent && appCurrent.instanceID == appNext.instanceID) {
        // Do nothing.
        console.warn('the app has been displayed.');
        return;
      }

      if (document.mozFullScreen) {
        document.mozCancelFullScreen();
      }

      screenElement.classList.remove('fullscreen-app');

      var switching = appCurrent && !appCurrent.isHomescreen &&
                      !appNext.isHomescreen;

      this._updateActiveApp(appNext.instanceID);

      if (appCurrent && layoutManager.keyboardEnabled) {
        // Ask keyboard to hide before we switch the app.
        var that = this;
        window.addEventListener('keyboardhidden', function onhiddenkeyboard() {
          window.removeEventListener('keyboardhidden', onhiddenkeyboard);
          that.switchApp(appCurrent, appNext, switching);
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
        if (appNext.isDead()) {
          // The app was killed while we were opening it,
          // let's not switch to a dead app!
          this._updateActiveApp(appCurrent.isHomescreen ?
            homescreenLauncher.origin : appCurrent.origin);
          return;
        }
        this.debug('ready to open/close' + switching);
        if (switching) {
          homescreenLauncher.getHomescreen().fadeOut();
        }
        this._updateActiveApp(appNext.instanceID);

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
            !layoutManager.match(appNext.width,
              appNext.height - appNext.calibratedHeight())) {
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
     * ![bootstrap](http://i.imgur.com/8qsOh1W.png)
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
      if (System.slowTransition) {
        this.element.classList.add('slow-transition');
      } else {
        this.element.classList.remove('slow-transition');
      }
      window.addEventListener('cardviewbeforeshow', this);
      window.addEventListener('launchapp', this);
      window.addEventListener('launchactivity', this);
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
      window.addEventListener('hidewindow', this);
      window.addEventListener('showwindow', this);
      window.addEventListener('hidewindowforscreenreader', this);
      window.addEventListener('showwindowforscreenreader', this);
      window.addEventListener('overlaystart', this);
      window.addEventListener('homegesture-enabled', this);
      window.addEventListener('homegesture-disabled', this);
      window.addEventListener('system-resize', this);
      window.addEventListener('sheetstransitionstart', this);

      this._settingsObserveHandler = {
        // update app name when language setting changes
        'language.current': {
          defaultValue: null,
          callback: function(value) {
            if (!value) {
              return;
            }
            this.broadcastMessage('localized');
          }.bind(this)
        },

        // continuous transition controlling
        'continuous-transition.enabled': {
          defaultValue: null,
          callback: function(value) {
            if (!value) {
              return;
            }
            this.continuousTransition = !!value;
          }.bind(this)
        },

        'app-suspending.enabled': {
          defaultValue: false,
          callback: function(value) {
            // Kill all instances if they are suspended.
            if (!value) {
              this.broadcastMessage('kill_suspended');
            }
          }.bind(this)
        }
      };

      for (var name in this._settingsObserveHandler) {
        SettingsListener.observe(
          name,
          this._settingsObserveHandler[name].defaultValue,
          this._settingsObserveHandler[name].callback
        );
      }
    },

    /**
     * Remove all event handlers. Currently we only call this function in unit
     * tests to avoid breaking other tests.
     * @memberOf module:AppWindowManager
     */
    uninit: function awm_uninit() {
      window.removeEventListener('launchapp', this);
      window.removeEventListener('home', this);
      window.removeEventListener('appcreated', this);
      window.removeEventListener('appterminated', this);
      window.removeEventListener('ftuskip', this);
      window.removeEventListener('appopened', this);
      window.removeEventListener('apprequestopen', this);
      window.removeEventListener('apprequestclose', this);
      window.removeEventListener('homescreenopened', this);
      window.removeEventListener('reset-orientation', this);
      window.removeEventListener('homescreencreated', this);
      window.removeEventListener('homescreen-changed', this);
      window.removeEventListener('killapp', this);
      window.removeEventListener('displayapp', this);
      window.removeEventListener('applicationuninstall', this);
      window.removeEventListener('hidewindow', this);
      window.removeEventListener('showwindow', this);
      window.removeEventListener('hidewindowforscreenreader', this);
      window.removeEventListener('showwindowforscreenreader', this);
      window.removeEventListener('overlaystart', this);
      window.removeEventListener('homegesture-enabled', this);
      window.removeEventListener('homegesture-disabled', this);
      window.removeEventListener('system-resize', this);
      window.removeEventListener('sheetstransitionstart', this);

      for (var name in this._settingsObserveHandler) {
        SettingsListener.unobserve(
          name,
          this._settingsObserveHandler[name].callback
        );
      }

      this._settingsObserveHandler = null;
    },

    handleEvent: function awm_handleEvent(evt) {
      this.debug('handling ' + evt.type);
      var activeApp = this._activeApp;
      switch (evt.type) {
        case 'system-resize':
          this.debug(' Resizing...');
          if (activeApp) {
            this.debug(' Resizing ' + activeApp.name);
            if (!activeApp.isTransitioning()) {
              activeApp.resize();
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
          this._apps[evt.detail.instanceID] = app;
          break;

        case 'appterminated':
          var app = evt.detail; // jshint ignore:line
          var instanceID = evt.detail.instanceID;
          if (activeApp && app.instanceID === activeApp.instanceID) {
            activeApp = null;
          }
          delete this._apps[instanceID];
          break;

        case 'reset-orientation':
          if (activeApp) {
            activeApp.setOrientation();
          }
          break;

        case 'ftuskip':
          if (!System.locked) {
            this.display();
          } else {
            homescreenLauncher.getHomescreen().setVisible(false);
          }
          break;

        case 'appopened':
        case 'homescreenopened':
          // Someone else may open the app,
          // so we need to update active app.
          this._updateActiveApp(evt.detail.instanceID);
          break;

        case 'homescreencreated':
          this._apps[evt.detail.instanceID] = evt.detail;
          break;

        case 'homescreen-changed':
          this.display();
          break;

        case 'killapp':
          this.kill(evt.detail.origin);
          break;

        case 'displayapp':
        case 'apprequestopen':
          this.display(evt.detail);
          break;

        case 'apprequestclose':
          if (evt.detail.isActive()) {
            this.display();
          }
          break;

        // Deal with application uninstall event
        // if the application is being uninstalled,
        // we ensure it stop running here.
        case 'applicationuninstall':
          this.kill(evt.detail.application.origin);
          break;

        case 'hidewindow':
          var detail = evt.detail;

          if (activeApp &&
              activeApp.origin !== homescreenLauncher.origin) {
            // This is coming from attention screen.
            // If attention screen has the same origin as our active app,
            // we cannot turn off its page visibility
            // because they are sharing the same process and the same docShell,
            // so turn off page visibility would overwrite the page visibility
            // of the active attention screen.
            if (detail && detail.origin &&
                detail.origin === activeApp.origin) {
              return;
            }
            activeApp.setVisible(false);
          } else {
            var home = homescreenLauncher.getHomescreen(); // jshint ignore:line
            home && home.setVisible(false);
          }
          break;

        case 'hidewindowforscreenreader':
          activeApp.setVisibleForScreenReader(false);
          break;

        case 'showwindowforscreenreader':
          activeApp.setVisibleForScreenReader(true);
          break;

        case 'showwindow':
          if (activeApp && activeApp.origin !== homescreenLauncher.origin) {
            activeApp.setVisible(true);
          } else {
            var home = homescreenLauncher.getHomescreen(true); // jshint ignore:line
            if (home) {
              if (home.isActive()) {
                home.setVisible(true);
              } else {
                this.display();
              }
            }
          }
          break;

        case 'overlaystart':
          // Instantly blur the frame in order to ensure hiding the keyboard
          if (activeApp) {
            if (!activeApp.isOOP()) {
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
              activeApp.setVisible(false, true);
            } else {
              activeApp.blur();
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
          if (!homescreenLauncher.ready) {
            return;
          }

          if (activeApp && !activeApp.isHomescreen) {
            // Make sure this happens before activity frame is removed.
            // Because we will be asked by a 'activity-done' event from gecko
            // to relaunch to activity caller, and this is the only way to
            // determine if we are going to homescreen or the original app.

            this.debug('back to home.');
            this.display();
          } else {
            // dispatch event to close activity.
            this.debug('ensure home.');
            homescreenLauncher.getHomescreen().ensure(true);
          }
          break;

        case 'launchapp':
          var config = evt.detail;
          this.debug('launching' + config.origin);
          this.launch(config);
          break;

        case 'launchactivity':
          if (evt.detail.isActivity && evt.detail.inline) {
            this.launchActivity(evt);
          }
          break;

        case 'cardviewbeforeshow':
          if (this._activeApp) {
            this._activeApp.getTopMostWindow().blur();
          }
          break;
        case 'sheetstransitionstart':
          if (document.mozFullScreen) {
            document.mozCancelFullScreen();
          }
          break;
      }
    },

    launchActivity: function(evt) {
      // We don't know who is the opener,
      // delegate the request to the active window.
      if (this._activeApp) {
        this._activeApp.broadcast('launchactivity', evt.detail);
      }
    },

    _dumpAllWindows: function() {
      if (!DEBUG) {
        return;
      }
      console.log('=====DUMPING APP WINDOWS BEGINS=====');
      for (var id in this._apps) {
        var app = this._apps[id];
        if (app.previousWindow) {
          continue;
        }
        this._dumpWindow(app);
        while (app.nextWindow) {
          this._dumpWindow(app, '->child:');
          app = app.nextWindow;
        }
      }
      console.log('=====END OF DUMPING APP WINDOWS=====');
    },

    _dumpWindow: function(app, prefix) {
      console.log((prefix ? prefix : '') + '[' + app.instanceID + ']' +
          (app.name || app.title || 'ANONYMOUS') + ' (' + app.url + ')');
      if (app.calleeWindow) {
        console.log('==>activity:[' + app.instanceID + ']' +
          (app.name || app.title || 'ANONYMOUS') + ' (' + app.url + ')');
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
     * @param  {AppConfig} config The configuration of the app window.
     * @memberOf module:AppWindowManager
     */
    launch: function awm_launch(config) {
      if (config.changeURL && this.getApp(config.origin)) {
        // XXX: Potential problems here:
        // there may be more than one app window instances
        // have the same origin running,
        // and we may change the wrong one.
        this.getApp(config.origin).modifyURLatBackground(config.url);
      }
      if (config.stayBackground) {
        return;
      } else {
        // Link the window before displaying it to avoid race condition.
        if (config.isActivity && this._activeApp) {
          this.linkWindowActivity(config);
        }
        if (config.origin == homescreenLauncher.origin) {
          this.display();
        } else {
          this.display(this.getApp(config.origin));
        }
      }
    },

    linkWindowActivity: function awm_linkWindowActivity(config) {
      var caller;
      var callee = this.getApp(config.origin);
      var origin = window.location.origin;

      // if caller is system app, we would change the caller to homescreen
      // so that we won't go back to the wrong place
      if (config.parentApp && config.parentApp.match(origin)) {
        caller = homescreenLauncher.getHomescreen(true);
      } else {
        caller = this._activeApp.getTopMostWindow();
      }

      callee.callerWindow = caller;
      caller.calleeWindow = callee;
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
     * ![AppWindowManager kill process](http://i.imgur.com/VrlkUXM.png)
     *
     * @param {String} origin The origin of the running app window to be killed.
     * @memberOf module:AppWindowManager
     */
    kill: function awm_kill(origin) {
      for (var id in this._apps) {
        if (this._apps[id].origin === origin) {
          this._apps[id].kill();
        }
      }
    },

    publish: function awm_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail || this);

      this.debug('publish: ' + event);
      window.dispatchEvent(evt);
    },

    _updateActiveApp: function awm__changeActiveApp(instanceID) {
      this._activeApp = this._apps[instanceID];
      if (!this._activeApp) {
        console.warn('no active app alive: ', instanceID);
      }
      if (this._activeApp && this._activeApp.isFullScreen()) {
        screenElement.classList.add('fullscreen-app');
      } else {
        screenElement.classList.remove('fullscreen-app');
      }
      // Resize when opened.
      // Note: we will not trigger reflow if the final size
      // is the same as its current value.
      this._activeApp.resize();

      this.debug('=== Active app now is: ',
        (this._activeApp.name || this._activeApp.origin), '===');
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
     * @param  {String} message The message name.
     * @param  {Object} [detail]  The detail of the message.
     * @memberOf module:AppWindowManager
     */
    broadcastMessage: function awm_broadcastMessage(message, detail) {
      for (var id in this._apps) {
        this._apps[id].broadcast(message, detail);
      }
    }
  };

  exports.AppWindowManager = AppWindowManager;
  AppWindowManager.init();
}(window));
