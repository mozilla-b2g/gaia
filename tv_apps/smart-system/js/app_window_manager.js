/* global SettingsListener, homescreenWindowManager, KeyboardManager,
          layoutManager, Service, SettingsCache */
'use strict';

(function(exports) {
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
    DEBUG: false,
    CLASS_NAME: 'AppWindowManager',
    continuousTransition: false,
    /**
     * Enable slow transition or not for debugging.
     * Note: Turn on this would make app opening/closing durations become 3s.
     * @type {Boolean}
     * @memberOf AppWindowManager
     */
    slowTransition: false,

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

    /**
     * Get active app. If active app is null, we'll return homescreen as
     * default.
     * @return {AppWindow} The app is active.
     */
    getActiveApp: function awm_getActiveApp() {
      return this._activeApp ||
             (window.homescreenWindowManager ?
              window.homescreenWindowManager.getHomescreen() : null);
    },

    /**
     * Match app origin and get the first matching one.
     * @param  {String} origin The origin to be matched.
     * @param  {String} [manifestURL] The manifestURL to be matched.
     * @return {AppWindow}        The app window object matched.
     */
    getApp: function awm_getApp(origin, manifestURL) {
      for (var id in this._apps) {
        var app = this._apps[id];
        if (app.origin === origin &&
            (!manifestURL || app.manifestURL === manifestURL) &&
            (!app.isBrowser() || app.config.url === origin)) {
          return app;
        }
      }
      return null;
    },

    /**
     * Match app window that is currently at a specific url.
     * @param  {String} url The url to be matched.
     * @return {AppWindow} The app window object matched.
     */
    getAppByURL: function awm_getAppByURL(url) {
      for (var id in this._apps) {
        var app = this._apps[id];
        if (app.config.url === url) {
          return app;
        }
      }
      return null;
    },

    /**
     * Get all apps.
     * @return {Object} The running app window references stored
     *                  by its instanceID.
     */
    getApps: function awm_getApps() {
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
     * @param {String} [eventType] The event type of displaying app.
     * @memberOf module:AppWindowManager
     */
    display: function awm_display(newApp, openAnimation, closeAnimation,
                                  eventType) {
      this._dumpAllWindows();
      var appCurrent = this._activeApp, appNext = newApp ||
        homescreenWindowManager.getHomescreen('home' === eventType);

      if (!appNext) {
        this.debug('no next app.');
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
        this.debug('the app has been displayed.');
        return;
      }

      if (document.mozFullScreen) {
        document.mozCancelFullScreen();
      }

      screenElement.classList.remove('fullscreen-app');

      var switching = appCurrent && !appCurrent.isHomescreen &&
                      !appNext.isHomescreen;

      this._updateActiveApp(appNext.instanceID);

      var that = this;
      if (appCurrent && layoutManager.keyboardEnabled) {
        this.sendStopRecordingRequest();

        // Ask keyboard to hide before we switch the app.
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
        this.sendStopRecordingRequest(function() {
          this.switchApp(appCurrent, appNext, switching,
                         openAnimation, closeAnimation);
        }.bind(this));
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

      // XXX: Bug 1124112 - Seamlessly launch search app from home
      if (appNext.manifest && appNext.manifest.role === 'search') {
        var startSwitchApp = function() {
          if (appNext.isDead()) {
            this._updateActiveApp(appCurrent.instanceID);
          } else {
            this._updateActiveApp(appNext.instanceID);
            appCurrent.close('immediate');
            appNext.open('immediate');
          }
        }.bind(this);

        if (appNext.loaded) {
          setTimeout(startSwitchApp);
        } else {
          appNext.element.addEventListener('_loaded', function onLoaded() {
            appNext.element.removeEventListener('_loaded', onLoaded);
            setTimeout(startSwitchApp);
          });
        }

        return;
      }

      this.debug('before ready check' + appCurrent + appNext);
      appNext.ready(function() {
        if (appNext.isDead()) {
          if (!appNext.isHomescreen) {
            // The app was killed while we were opening it,
            // let's not switch to a dead app!
            this._updateActiveApp(appCurrent.instanceID);
            return;
          } else {
            // Homescreen might be dead due to OOM, we should ensure its opening
            // before updateActiveApp.
            appNext = homescreenWindowManager.getHomescreen();
            appNext.ensure(true);
          }
        }
        this.debug('ready to open/close' + switching);
        if (switching) {
          this.publish('appswitching');
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
        } else if (appNext.isHomescreen) {
          // If there's no active app and next app is homescreen,
          // open it right away.
          immediateTranstion = true;
        }

        if (appNext.resized &&
            !layoutManager.match(appNext.width, appNext.height)) {
          immediateTranstion = true;
        }

        appNext.open(immediateTranstion ? 'immediate' :
                      ((switching === true) ? 'invoked' : openAnimation));
        if (appCurrent && appCurrent.instanceID !== appNext.instanceID) {
          appCurrent.close(immediateTranstion ? 'immediate' :
            ((switching === true) ? 'fade-out' : closeAnimation));
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
     * 6. AppWindowManager open homescreen app via homescreenWindowManager.
     *
     * @memberOf module:AppWindowManager
     */
    init: function awm_init() {
      if (this.slowTransition) {
        this.element.classList.add('slow-transition');
      } else {
        this.element.classList.remove('slow-transition');
      }
      window.addEventListener('cardviewbeforeshow', this);
      window.addEventListener('launchapp', this);
      document.body.addEventListener('launchactivity', this, true);
      window.addEventListener('appcreated', this);
      window.addEventListener('appterminated', this);
      window.addEventListener('homescreenterminated', this);
      window.addEventListener('ftuskip', this);
      window.addEventListener('appopened', this);
      window.addEventListener('apprequestopen', this);
      window.addEventListener('apprequestclose', this);
      window.addEventListener('homescreenopened', this);
      window.addEventListener('reset-orientation', this);
      window.addEventListener('homescreencreated', this);
      window.addEventListener('homescreen-changed', this);
      window.addEventListener('landing-app-changed', this);
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
      window.addEventListener('attentionopened', this);
      window.addEventListener('homegesture-enabled', this);
      window.addEventListener('homegesture-disabled', this);
      window.addEventListener('system-resize', this);
      window.addEventListener('orientationchange', this);
      window.addEventListener('sheets-gesture-begin', this);
      window.addEventListener('sheets-gesture-end', this);
      window.addEventListener('appopening', this);
      window.addEventListener('localized', this);

      window.addEventListener('mozChromeEvent', this);

      this._settingsObserveHandler = {
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
        },
      };

      for (var name in this._settingsObserveHandler) {
        SettingsCache.observe(
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
      window.removeEventListener('appcreated', this);
      window.removeEventListener('appterminated', this);
      window.removeEventListener('homescreenterminated', this);
      window.removeEventListener('ftuskip', this);
      window.removeEventListener('appopened', this);
      window.removeEventListener('apprequestopen', this);
      window.removeEventListener('apprequestclose', this);
      window.removeEventListener('homescreenopened', this);
      window.removeEventListener('reset-orientation', this);
      window.removeEventListener('homescreencreated', this);
      window.removeEventListener('homescreen-changed', this);
      window.removeEventListener('landing-app-changed', this);
      window.removeEventListener('killapp', this);
      window.removeEventListener('displayapp', this);
      window.removeEventListener('applicationuninstall', this);
      window.removeEventListener('hidewindow', this);
      window.removeEventListener('showwindow', this);
      window.removeEventListener('hidewindowforscreenreader', this);
      window.removeEventListener('showwindowforscreenreader', this);
      window.removeEventListener('attentionopened', this);
      window.removeEventListener('homegesture-enabled', this);
      window.removeEventListener('homegesture-disabled', this);
      window.removeEventListener('system-resize', this);
      window.removeEventListener('orientationchange', this);
      window.removeEventListener('sheets-gesture-begin', this);
      window.removeEventListener('sheets-gesture-end', this);
      window.removeEventListener('appopening', this);
      window.removeEventListener('localized', this);
      window.removeEventListener('mozChromeEvent', this);

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
      var detail = evt.detail;
      switch (evt.type) {
        case 'orientationchange':
          this.broadcastMessage(evt.type);
          break;
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

        case 'homescreenterminated':
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
          if (!homescreenWindowManager.ready) {
            var self = this;
            window.addEventListener('homescreenwindowmanager-ready',
              function _handleReady(){
                window.removeEventListener('homescreenwindowmanager-ready',
                                           _handleReady);
                self.display();
              });
            return;
          } else {
            this.display();
          }
          break;

        case 'homescreenopened':
        case 'appopening':
        case 'appopened':
          // Someone else may open the app,
          // so we need to update active app.
          this._updateActiveApp(evt.detail.instanceID);
          break;

        case 'homescreencreated':
          this._apps[evt.detail.instanceID] = evt.detail;
          break;

        case 'homescreen-changed':
        case 'landing-app-changed':
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
          activeApp && activeApp.broadcast('hidewindow', evt.detail);
          break;

        case 'hidewindowforscreenreader':
          activeApp && activeApp.setVisibleForScreenReader(false);
          break;

        case 'showwindowforscreenreader':
          activeApp && activeApp.setVisibleForScreenReader(true);
          break;

        case 'showwindow':
          this.onShowWindow(detail);
          break;

        case 'attentionopened':
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
              // there is an attention window and delegate the
              // responsibility to blur the possible focused elements
              // itself.
              activeApp.setVisible(false, true);
            } else {
              activeApp.blur();
            }
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
          this.broadcastMessage('cardviewbeforeshow');
          break;

        case 'cardviewclosed':
          this.broadcastMessage('cardviewclosed');
          break;

        case 'sheets-gesture-begin':
          if (document.mozFullScreen) {
            document.mozCancelFullScreen();
          }
          // All app window instances need to be aware of this so they can show
          // the screenshot overlay.
          this.broadcastMessage('sheetsgesturebegin');
          break;

        case 'sheets-gesture-end':
          // All inactive app window instances need to be aware of this so they
          // can hide the screenshot overlay. The check occurs in the AppWindow.
          this.broadcastMessage('sheetsgestureend');
          break;

        case 'localized':
          this.broadcastMessage('localized');
          break;

        case 'mozChromeEvent':
          if (!activeApp || !evt.detail ||
            evt.detail.type !== 'inputmethod-contextchange') {
            return;
          }
          activeApp.getTopMostWindow().broadcast('inputmethod-contextchange',
            evt.detail);
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
      if (!this.DEBUG) {
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
        this.display(this.getApp(config.origin));
      }
    },

    linkWindowActivity: function awm_linkWindowActivity(config) {
      var caller;
      var callee = this.getApp(config.origin);
      caller = this._activeApp.getTopMostWindow();
      if (caller.getBottomMostWindow() === callee) {
        callee.frontWindow.kill();
      } else {
        callee.callerWindow = caller;
        caller.calleeWindow = callee;
      }
    },

    debug: function awm_debug() {
      if (this.DEBUG) {
        console.log('[' + this.CLASS_NAME + ']' +
          '[' + Service.currentTime() + ']' +
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
    kill: function awm_kill(origin, manifestURL) {
      for (var id in this._apps) {
        if (this._apps[id].origin === origin &&
            (!manifestURL || this._apps[id].manifestURL === manifestURL)) {
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
      var appHasChanged = (this._activeApp !== this._apps[instanceID]);

      this._activeApp = this._apps[instanceID];
      if (!this._activeApp) {
        this.debug('no active app alive: ' + instanceID);
        return;
      }
      var fullscreen = this._activeApp.isFullScreen();
      screenElement.classList.toggle('fullscreen-app', fullscreen);

      var fullScreenLayout = this._activeApp.isFullScreenLayout();
      screenElement.classList.toggle('fullscreen-layout-app', fullScreenLayout);

      // Resize when opened.
      // Note: we will not trigger reflow if the final size
      // is the same as its current value.
      this._activeApp.resize();
      if (appHasChanged) {
        this.publish('activeappchanged');
      }

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
    },

    /**
     * The event 'showwindow' may come with details, which means there is
     * some steps need to be done after we show or don't show the active app,
     * or the homescreen window.
     *
     * @param {Object} [detail] The detail of the event.
     * @memberOf module:AppWindowManager
     */
    onShowWindow: function awm_onShowWindow(detail) {
      var activeApp = this._activeApp;

      // Just move the code from the conditional branches below to
      // a re-usable function. To avoid people get confused with other
      // homescreen related methods, this should not be moved out to
      // be a method of AWM.
      var launchHomescreen = () => {
        // jshint ignore:line
        var home = homescreenWindowManager.getHomescreen();
        if (home) {
          if (home.isActive()) {
            home.setVisible(true);
          } else {
            this.display();
          }
        }
      };
      detail = detail ? detail : {};  // Give an empty object if it's null.

      // In this statement we can add more possible slots when it's required.
      // The undefined variables would keep undefined, and the existing ones
      // would hold the data from the detail, so we don't need to parse the
      // detail object with switch cases.
      var { activity, notificationId } = detail;
      if (activity || notificationId) {
        if (activeApp && !activeApp.isHomescreen) {
          activeApp.setVisible(true);
          if (activity) {
            this.fireActivity(activity);
          } else if (notificationId){
            this.fireNotificationClicked(notificationId);
          }
        } else {
          if (activity) {
            this.fireActivity(activity);
          } else if (notificationId){
            launchHomescreen();
            this.fireNotificationClicked(notificationId);
          }
        }
      } else {  // it don't have the detail we can handle.
        if (activeApp && !activeApp.isHomescreen) {
          activeApp.setVisible(true);
        } else {
          launchHomescreen();
        }
      }
    },

    /**
     * After show the window of activity or homescreen,
     * fire the following activity.
     *
     * @param {Object} [activityContent]
     * @memberOf module:AppWindowManager
     */
    fireActivity: function awm_fireActivity(activityContent) {
      // Need to invoke activity
      var a = new window.MozActivity(activityContent);
      a.onerror = function ls_activityError() {
        console.log('MozActivity: activity error.');
      };
    },

    /**
     * After show the window of activity or homescreen,
     * fire the event of notification clicked.
     *
     * @param {String} [notificationId]
     * @memberOf module:AppWindowManager
     */
    fireNotificationClicked:
    function awm_fireNotificationClicked(notificationId) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentNotificationEvent', true, true, {
        type: 'desktop-notification-click',
        id: notificationId
      });
      window.dispatchEvent(event);

      window.dispatchEvent(new CustomEvent('notification-clicked', {
        detail: {
          id: notificationId
        }
      }));
    },

    /**
     * Abuse the settings database to notify interested certified apps
     * that the current foreground window is about to close.  This is a
     * hack implemented to fix bug 1051172 so that apps can be notified
     * that they will be closing without having to wait for the
     * visibilitychange event that does not arrive until after the app
     * has been hidden.
     *
     * This function is called from display() above to handle switching
     * from an app to the homescreen or to the task switcher. It is also
     * called from stack_manager.js to handle edge gestures. I tried calling
     * it from screen_manager.js to handle screen blanking and the sleep
     * button, but the visibiltychange event arrived before the will hide
     * notification did in that case, so it was not necessary.
     *
     * We ought to be able to remove this function and the code that
     * calls it when bug 1034001 is fixed.
     *
     * See also bugs 995540 and 1006200 and the
     * private.broadcast.attention_screen_opening setting hack in
     * attention_screen.js
     */
    sendStopRecordingRequest: function sendStopRecordingRequest(callback) {
      // If we are not currently recording anything, just call
      // the callback synchronously
      if (!window.mediaRecording.isRecording) {
        if (callback) { callback(); }
        return;
      }

      // Otherwise, if we are recording something, then send a
      // "stop recording" signal via the settings db before
      // calling the callback.
      var setRequest = navigator.mozSettings.createLock().set({
        'private.broadcast.stop_recording': true
      });
      setRequest.onerror = function() {
        // If the set request failed for some reason, just call the callback
        if (callback) { callback(); }
      };
      setRequest.onsuccess = function() {
        // When the setting has been set, reset it as part of a separate
        // transaction.
        navigator.mozSettings.createLock().set({
          'private.broadcast.stop_recording': false
        });
        // And meanwhile, call the callback
        if (callback) { callback(); }
      };
    }
  };

  exports.AppWindowManager = AppWindowManager;
}(window));
