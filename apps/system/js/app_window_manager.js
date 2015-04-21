/* global ShrinkingUI, BaseModule, LazyLoader, WrapperFactory */
'use strict';

(function(exports) {
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
  var AppWindowManager = function() {};
  AppWindowManager.SERVICES = [
    'stopRecording',
    'kill'
  ];
  AppWindowManager.STATES = [
    'getApp',
    'getAppByURL',
    'getApps',
    'slowTransition',
    'getActiveApp',
    'getActiveWindow',
    'isBusyLoading'
  ];
  AppWindowManager.EVENTS = [
    'cardviewbeforeshow',
    'cardviewclosed',
    'launchapp',
    'appcreated',
    'appterminated',
    'appopened',
    'apprequestopen',
    'apprequestclose',
    'shrinking-start',
    'shrinking-stop',
    'homescreenopened',
    'reset-orientation',
    'homescreencreated',
    'homescreen-changed',
      // Watch chrome event that order to close an app
    'killapp',
      // Watch for event to bring a currently-open app to the foreground.
    'displayapp',
      // Deal with application uninstall event
      // if the application is being uninstalled,
      // we ensure it stop running here.
    'applicationuninstall',
    'hidewindow',
    'showwindow',
    'hidewindowforscreenreader',
    'showwindowforscreenreader',
    'attentionopened',
    'homegesture-enabled',
    'homegesture-disabled',
    'orientationchange',
    'sheets-gesture-begin',
    'sheets-gesture-end',
      // XXX: PermissionDialog is shared so we need AppWindowManager
      // to focus the active app after it's closed.
    'permissiondialoghide',
    'appopening',
    'localized',
    'launchtrusted',
    'taskmanager-activated',
    'hierarchytopmostwindowchanged',
    'cardviewclosed',
    'cardviewshown'
  ];
  AppWindowManager.IMPORTS = [
    'shared/js/tagged.js' // Used by taskCard, maybe everything needs it later
  ];
  AppWindowManager.SUB_MODULES = [
    'FtuLauncher',
    'AppWindowFactory',
    'LockScreenLauncher',
    // HWM is here because AWM needs to manage homescreenWindow
    // as well. If someday we have a animation manager maybe we
    // don't need to put it here.
    'HomescreenWindowManager',
    'AppInstallManager', // Integration test will test the installation
                         // right away.
    'WrapperFactory' // To resolve global reference - remove it
                     // once it's instantiable.
  ];
  AppWindowManager.SETTINGS = [
    'continuous-transition.enabled',
    'nfc.enabled',
    'app-suspending.enabled'
  ];
  BaseModule.create(AppWindowManager, {
    DEBUG: false,
    name: 'AppWindowManager',
    EVENT_PREFIX: 'appwindowmanager',
    continuousTransition: false,

    /**
     * Indicates the system is busy doing something.
     * Now it stands for the foreground app is not loaded yet.
     *
     * XXX: AppWindowManager should register a service
     * for isBusyLoading query by
     * Service.register('isBusyLoading', appWindowManager).
     */
    isBusyLoading: function() {
      var app = this._activeApp;
      return app && !app.loaded;
    },

    /**
     * Enable slow transition or not for debugging.
     * Note: Turn on this would make app opening/closing durations become 3s.
     * @type {Boolean}
     * @memberOf AppWindowManager
     */
    slowTransition: false,

    isActive: function() {
      return (!!this._activeApp &&
             (!this.taskManager || !this.taskManager.isActive()));
    },

    setHierarchy: function(active) {
      if (!this._activeApp) {
        this.debug('No active app.');
        return false;
      }
      if (active) {
        // XXX: Use this.appWindowFactory later
        if (!this.appWindowFactory.isLaunchingWindow() &&
            !WrapperFactory.isLaunchingWindow()) {
          this.focus();
        }
      } else {
        this._activeApp.blur();
        this._activeApp.setNFCFocus(false);
      }
      this._activeApp.setVisibleForScreenReader(active);
      return true;
    },

    focus: function() {
      if (!this._activeApp) {
        return;
      }
      this.debug('focusing ' + this._activeApp.name);
      this._activeApp.focus();
      this._activeApp.setNFCFocus(true);
    },

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
     * HierarchyManager will use this function to
     * get the active window instance.
     * @return {AppWindow|null} The active app window instance
     */
    getActiveWindow: function() {
      return this.getActiveApp();
    },

    /**
     * Get active app. If active app is null, we'll return homescreen as
     * default.
     * @return {AppWindow} The app is active.
     */
    getActiveApp: function awm_getActiveApp() {
      return this._activeApp || this.service.query('getHomescreen');
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
     * Handles system browser URL sharing via NFC. Starts listening for
     * peerready events once NFC is enabled in settings
     * @type {Object}
     * @memberOf module:AppWindowManager
     */
    _nfcHandler: null,

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
        this.service.query('getHomescreen', 'home' === eventType);

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

      this.screen.classList.remove('fullscreen-app');

      var switching = appCurrent && !appCurrent.isHomescreen &&
                      !appNext.isHomescreen;

      this._updateActiveApp(appNext.instanceID);

      var that = this;
      if (appCurrent && this.service.query('keyboardEnabled')) {
        this.stopRecording();

        // Ask keyboard to hide before we switch the app.
      window.addEventListener('keyboardhidden', function onhiddenkeyboard() {
          window.removeEventListener('keyboardhidden', onhiddenkeyboard);
          that.switchApp(appCurrent, appNext, switching);
        });

        if (this.continuousTransition) {
          // Do keyboard transition.
          this.service.request('hideInputWindow');
        } else {
          // Hide keyboard immediately.
          this.service.request('hideInputWindowImmediately');
        }
      } else if (this.rocketbar && this.rocketbar.active) {
        // Wait for the rocketbar to close
        window.addEventListener('rocketbar-overlayclosed', function onClose() {
          window.removeEventListener('rocketbar-overlayclosed', onClose);
          that.switchApp(appCurrent, appNext, switching);
        });
      } else {
        this.stopRecording(function() {
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
            appNext = this.service.query('getHomescreen');
            appNext.ensure(true);
          }
        }
        appNext.reviveBrowser();
        this.debug('ready to open/close' + switching);
        if (switching) {
          this.publish('appswitching', this, true);
        }
        this._updateActiveApp(appNext.instanceID);

        var immediateTranstion = false;
        if (appNext.rotatingDegree === 90 || appNext.rotatingDegree === 270) {
          immediateTranstion = true;
          this.debug('immediate due to perpendicular 1');
        } else if (appCurrent) {
          var degree = appCurrent.determineClosingRotationDegree();
          if (degree === 90 || degree === 270) {
            immediateTranstion = true;
            this.debug('immediate due to perpendicular 2');
          }
        } else if (appNext.isHomescreen) {
          // If there's no active app and next app is homescreen,
          // open it right away.
          this.debug('immediate due to home');
          immediateTranstion = true;
        }

        if (appNext.resized &&
            !this.service.query('match', appNext.width, appNext.height)) {
          this.debug('immediate due to resized');
          immediateTranstion = true;
        }

        appNext.open(immediateTranstion ? 'immediate' :
                      ((switching === true) ? 'invoked' : openAnimation));
        if (appCurrent && appCurrent.instanceID !== appNext.instanceID) {
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
     * 6. AppWindowManager open homescreen app via homescreenWindowManager.
     *
     * @memberOf module:AppWindowManager
     */
    _start: function awm_start() {
      this.element = document.getElementById('windows');
      this.screen = document.getElementById('screen');
      this.activated = false;
      if (this.slowTransition) {
        this.element.classList.add('slow-transition');
      } else {
        this.element.classList.remove('slow-transition');
      }

      this.service.request('registerHierarchy', this);
      return this.loadWhenIdle([
        'StackManager',
        'SheetsTransition',
        'EdgeSwipeDetector',
        'TaskManager',
        'Places',
        'SuspendingAppPriorityManager',
        'Updatable',
        'UpdateManager',
        'AppMigrator'
      ]);
    },

    _stop: function awm_stop() {
      this.service.request('unregisterHierarchy', this);
    },

    '_handle_system-resize': function() {
      if (this._activeApp) {
        this.debug(' Resizing ' + this._activeApp.name);
        if (!this._activeApp.isTransitioning()) {
          this._activeApp.resize();
          return false;
        }
      }
      return true;
    },

    _handle_home: function(evt) {
      // When shrinkingUI is enabled, home should be locked.
      if (this.shrinkingUI && this.shrinkingUI.respondToHierarchyEvent(evt)) {
        return false;
      } else if (this.ftuLauncher && !this.ftuLauncher.respondToHierarchyEvent(evt)) {
        return false;
      } else if (this.taskManager && this.taskManager.isActive()) {
        return true;
      } else {
        this.display(null, null, null, 'home');
        return false;
      }
    },

    _handle_holdhome: function(evt) {
      // When shrinkingUI is enabled, hold home should be locked.
      if (this.shrinkingUI && this.shrinkingUI.respondToHierarchyEvent(evt)) {
        return false;
      } else {
        return this.ftuLauncher &&
               this.ftuLauncher.respondToHierarchyEvent(evt);
      }
    },

    respondToHierarchyEvent: function(evt) {
      if (this['_handle_' + evt.type]) {
        return this['_handle_' + evt.type](evt);
      }
      return true;
    },

    _handle_hierarchytopmostwindowchanged: function() {
      if (this.service.query('getTopMostUI') !== this) {
        return;
      }
      this._activeApp && this._activeApp.getTopMostWindow()
                             .setNFCFocus(true);
    },

    '_handle_shrinking-start': function(evt) {
      if (this.shrinkingUI && this.shrinkingUI.isActive()) {
        return;
      }
      if (this.service.query('getTopMostUI') !== this) {
        return;
      }
      if (!window.ShrinkingUI) {
        LazyLoader.load(['shared/js/shrinking_ui.js']).then(
          this.launchShrinkingUI.call(this)).catch(function(err) {
            console.error(err);
          });
      } else {
        this.launchShrinkingUI();
      }
    },

    launchShrinkingUI: function() {
      var bottomMost = this._activeApp.getBottomMostWindow();
      this.shrinkingUI = new ShrinkingUI(bottomMost.element,
        bottomMost.element.parentNode);
      this.shrinkingUI.start();
      this._activeApp && this._activeApp.broadcast('shrinkingstart');
    },

    '_handle_shrinking-stop': function(evt) {
      if (this.shrinkingUI && this.shrinkingUI.isActive()) {
        this._activeApp && this._activeApp.broadcast('shrinkingstop');
        this.shrinkingUI.stop();
      }
    },

    // We do this because task manager is lower than us by design.
    '_handle_taskmanager-activated': function() {
      this.activated = false;
      this.publish('-deactivated');
    },

    '_handle_cardviewshown': function() {
      this.broadcastMessage('cardviewshown');
    },

    '_handle_cardviewclosed': function() {
      this.broadcastMessage('cardviewclosed');
    },

    // XXX: Remove this once permission dialog is moved into AppWindow.
    '_handle_permissiondialoghide': function() {
      this._activeApp && this._activeApp.broadcast('focus');
    },

    _handle_orientationchange: function() {
      this.broadcastMessage('orientationchange',
        this.service.query('getTopMostUI') === this);
    },

    // Dispatch internal events for navigation usage.
    // The active app's navigation needs to know homes gesture is
    // toggled to hide itself.
    '_handle_homegesture-disabled': function(evt) {
      this.broadcastMessage(evt.type);
    },

    '_handle_homegesture-enabled': function(evt) {
      this.broadcastMessage(evt.type);
    },

    _handle_appcreated: function(evt) {
      var app = evt.detail;
      this._apps[evt.detail.instanceID] = app;
    },

    _handle_appterminated: function(evt) {
      var app = evt.detail; // jshint ignore:line
      var instanceID = evt.detail.instanceID;
      if (this._activeApp && app.instanceID === this._activeApp.instanceID) {
        this._activeApp = null;
      }
      delete this._apps[instanceID];
    },

    '_handle_reset-orientation': function() {
      this._activeApp && this._activeApp.setOrientation();
    },

    _handle_appopening: function(evt) {
      this._updateActiveApp(evt.detail.instanceID);
    },
    _handle_appopened: function(evt) {
      this._updateActiveApp(evt.detail.instanceID);
    },
    _handle_homescreenopened: function(evt) {
      this._updateActiveApp(evt.detail.instanceID);
    },


    _handle_homescreencreated: function(evt) {
      this._apps[evt.detail.instanceID] = evt.detail;
    },

    '_handle_homescreen-changed': function() {
      this.display();
    },

    _handle_killapp: function(evt) {
      this.kill(evt.detail.origin);
    },

    _handle_displayapp: function(evt) {
      this.display(evt.detail);
    },

    _handle_apprequestopen: function(evt) {
      this.display(evt.detail);
    },

    _handle_apprequestclose: function(evt) {
      if (evt.detail.isActive()) {
        this.display();
      }
    },

    // Deal with application uninstall event
    // if the application is being uninstalled,
    // we ensure it stop running here.
    _handle_applicationuninstall: function(evt) {
      this.kill(evt.detail.application.origin);
    },

    _handle_hidewindow: function(evt) {
      this._activeApp && this._activeApp.broadcast('hidewindow', evt.detail);
    },

    _handle_hidewindowforscreenreader: function() {
      this._activeApp.setVisibleForScreenReader(false);
    },

    _handle_showwindowforscreenreader: function() {
      this._activeApp.setVisibleForScreenReader(true);
    },

    _handle_showwindow: function(evt) {
      this.onShowWindow(evt.detail);
    },

    _handle_attentionopened: function(evt) {
      // Instantly blur the frame in order to ensure hiding the keyboard
      if (this._activeApp) {
        if (!this._activeApp.isOOP()) {
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
          this._activeApp.setVisible(false, true);
        } else {
          this._activeApp.blur();
        }
      }
    },

    _handle_launchapp: function(evt) {
      var config = evt.detail;
      this.debug('launching' + config.origin);
      this.launch(config);
    },

    _handle_launchtrusted: function(evt) {
      if (evt.detail.chromeId) {
        this._launchTrustedWindow(evt);
      }
    },

    _handle_cardviewbeforeshow: function(evt) {
      this._activeApp && this._activeApp.getTopMostWindow().blur();
      this.broadcastMessage('cardviewbeforeshow');
    },

    '_handle_sheets-gesture-begin': function() {
      if (document.mozFullScreen) {
        document.mozCancelFullScreen();
      }
      this._activeApp && this._activeApp.setVisibleForScreenReader(false);
      this.broadcastMessage('sheetsgesturebegin');
    },

    '_handle_sheets-gesture-end': function() {
      // All inactive app window instances need to be aware of this so they
      // can hide the screenshot overlay. The check occurs in the AppWindow.
      this._activeApp && this._activeApp.setVisibleForScreenReader(true);
      this.broadcastMessage('sheetsgestureend');
    },

    _handle_localized: function() {
      this.broadcastMessage('localized');
    },

    _handle_launchactivity: function(evt) {
      if (evt.detail.isActivity && evt.detail.inline && this._activeApp) {
        this._activeApp.broadcast('launchactivity', evt.detail);
        return false;
      }
      return true;
    },

    '_handle_mozChromeEvent': function(evt) {
      if (!evt.detail || evt.detail.type !== 'inputmethod-contextchange') {
        return true;
      }
      if (this._activeApp) {
        this._activeApp.getTopMostWindow()
            .broadcast('inputmethod-contextchange',
          evt.detail);
        return false;
      }
      return true;
    },

    _launchTrustedWindow: function(evt) {
      if (this._activeApp) {
        this._activeApp.broadcast('launchtrusted', evt.detail);
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
        callee.frontWindow && callee.frontWindow.kill();
      } else {
        callee.callerWindow = caller;
        caller.calleeWindow = callee;
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

    _updateActiveApp: function awm__changeActiveApp(instanceID) {
      var appHasChanged = (this._activeApp !== this._apps[instanceID]);
      this.debug(appHasChanged, this.activated, this._activeApp);
      var activated = false;
      if (!this.activated && appHasChanged && !this._activeApp) {
        activated = true;
      } else if (!appHasChanged && this._activeApp && !this.activated) {
        activated = true;
      }

      this._activeApp = this._apps[instanceID];
      if (!this._activeApp) {
        this.debug('no active app alive: ' + instanceID);
        return;
      }

      var fullScreenLayout = this._activeApp.isFullScreenLayout();
      this.screen.classList.toggle('fullscreen-layout-app', fullScreenLayout);

      // Resize when opened.
      // Note: we will not trigger reflow if the final size
      // is the same as its current value.
      this._activeApp.resize();
      if (appHasChanged) {
        if (this.shrinkingUI && this.shrinkingUI.isActive()) {
          this.shrinkingUI.stop();
        }
        this.publish('activeappchanged', this, true);
      }

      this.debug('=== Active app now is: ',
        (this._activeApp.name || this._activeApp.origin), '===');
      if (activated) {
        this.publish('-activated');
      }
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
        var home = this.service.query('getHomescreen');
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
    stopRecording: function(callback) {
      // If we are not currently recording anything, just call
      // the callback synchronously
      if (!this.service.query('isRecording')) {
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
    },

    '_observe_continuous-transition.enabled': function(value) {
      if (!value) {
        return;
      }
      this.continuousTransition = !!value;
    },

    '_observe_app-suspending.enabled': function(value) {
      // Kill all instances if they are suspended.
      if (!value) {
        this.broadcastMessage('kill_suspended');
      }
    }
  });
}());
