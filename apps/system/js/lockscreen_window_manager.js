/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';
/* global Service, LockScreenWindow, LockScreenInputWindow */
/* global secureWindowManager */

(function(exports) {
  /**
   * Manage LockScreenWindow apps. This is a subset of the AppWindow manager,
   * and will not handle most cases the later one would handle. Only those
   * meaningful cases, like secure app open, close, requesting kill all apps
   * or turn the secure mode on/off, would be handled. However, if we need
   * to handle cases in the future, we would extend this manager.
   *
   * So far the LockScreenWindowManager would only manager 1 secure app at once,
   * but there're already some designations for multiple apps.
   *
   * @constructor LockScreenWindowManager
   */
  var LockScreenWindowManager = function() {};

  LockScreenWindowManager.prototype.setup =
  function lswm_setup() {
    /**
     * @memberof LockScreenWindowManager#
     * @prop {DOMElement} windows - the `#windows` element, which is the same
     *                              element that the would AppWindowManager use.
     * @prop {DOMElement} screen - the `#screen` element.
     */
    this.elements = {
      windows: null,
      screen: null
    };

    /**
     * @memberof LockScreenWindowManager#
     */
    this.states = {
      ready: false,
      FTUOccurs: false,
      enabled: true,
      instance: null,
      windowCreating: false
    };

    /**
     * @memberof LockScreenWindowManager#
     */
    this.configs = {
      inputWindow: {
        // Before we put things inside an iframe, do not resize LW.
        resizeMode: false,
        get height() {
          return 300;
        }
      },
      listens: ['lockscreen-request-unlock',
                'lockscreen-appcreated',
                'lockscreen-appterminated',
                'lockscreen-appclose',
                'screenchange',
                'system-resize',
                'ftuopen',
                'ftudone',
                'overlaystart',
                'showlockscreenwindow',
                'secure-appclosed',
                'lockscreen-request-inputpad-open',
                'lockscreen-request-inputpad-close'
               ]
    };
  };

  LockScreenWindowManager.prototype.name = 'LockScreenWindowManager';
  LockScreenWindowManager.prototype.EVENT_PREFIX = 'lockscreenwindowmanager';
  /**
   * This function will be invoked by hierarchyManager.
   */
  LockScreenWindowManager.prototype.getActiveWindow = function() {
    return this.isActive() ? this.states.instance : null;
  };

  /**
   * To initialize the class instance (register events, observe settings, etc.)
   */
  LockScreenWindowManager.prototype.start =
  function lwm_start() {
    this.setup();
    this.startEventListeners();
    this.startObserveSettings();
    this.initElements();
    this.initWindow();
    Service.register('unlock', this);
    Service.register('lock', this);
    Service.request('registerHierarchy', this);
  };

  LockScreenWindowManager.prototype._handle_home = function() {
    if (this.isActive()) {
      // XXX: I don't want to change the order of event registration
      // at this early-refactoring stage, so do this to minimize the
      // risk and complete the work.
      window.dispatchEvent(
        new CustomEvent('lockscreen-notify-homepressed'));
      return false;
    }
    return true;
  };

  LockScreenWindowManager.prototype._handle_holdhome = function() {
    if (this.isActive()) {
      return false;
    }
    return true;
  };

  LockScreenWindowManager.prototype.respondToHierarchyEvent = function(evt) {
    if (this['_handle_' + evt.type]) {
      return this['_handle_' + evt.type](evt);
    } else {
      return true;
    }
  };

  /**
   * @listens lockscreen-appcreated - when a lockscreen app got created, it
   *                                  would fire this event.
   * @listens lockscreen-appterminated - when a lockscreen app got really
   *                                     closed, it would fire this event.
   * @listens lockscreen-apprequestclose - when a lockscreen app has been
   *                                       called to close itself, the event
   *                                       would be fired
   * @listens screenchange - means to initialize the lockscreen and its window
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.handleEvent =
    function lwm_handleEvent(evt) {
      var app = null;
      switch (evt.type) {
        case 'overlaystart':
          if (this.isActive()) {
            this.states.instance.setVisible(false);
          }
          break;
        case 'showlockscreenwindow':
          if (this.isActive()) {
            this.states.instance.setVisible(true);
          }
          break;
        case 'ftuopen':
          this.states.FTUOccurs = true;
          // Need immediatly unlocking (hide window).
          this.closeApp(true);
          break;
        case 'ftudone':
          this.states.FTUOccurs = false;
          break;
        case 'lockscreen-request-unlock':
          this.responseUnlock(evt.detail);
          break;
        case 'lockscreen-appcreated':
          app = evt.detail;
          this.registerApp(app);
          break;
        case 'lockscreen-appterminated':
          app = evt.detail;
          this.unregisterApp(app);
          break;
        case 'secure-appclosed':
          this.states.instance.lockOrientation();
          break;
        case 'system-resize':
          if (this.states.instance && this.states.instance.isActive()) {
            var p = this.states.instance.resize();
            if (typeof evt.detail.waitUntil === 'function') {
              evt.detail.waitUntil(p);
            }
          }
          break;
        case 'screenchange':
          // The screenchange may be invoked by proximity sensor,
          // or the power button. If it's caused by the proximity sensor,
          // we should not open the LockScreen, because the user may stay
          // in another app, not the LockScreen.
          if ('proximity' !== evt.detail.screenOffBy &&
              !this.states.FTUOccurs &&
              this.states.ready) {
            // The app would be inactive while screen off.
            this.openApp();
            if (evt.detail.screenEnabled && this.states.instance &&
                this.isActive() && !secureWindowManager.isActive()) {
              // In theory listen to 'visibilitychange' event can solve this
              // issue, since it would be fired at the correct moment that
              // we can lock the orientation successfully, but this event
              // would not be received when user press the button twice
              // quickly, so we need to keep this workaround.
              this.states.instance.lockOrientation();
            }
          }
          break;
        case 'lockscreen-request-inputpad-open':
          this.onInputpadOpen();
          break;
        case 'lockscreen-request-inputpad-close':
          this.onInputpadClose();
          break;
      }
    };

  /**
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.initElements =
    function lwm_initElements() {
      var selectors = { windows: 'windows', screen: 'screen'};
      for (var name in selectors) {
        var id = selectors[name];
        this.elements[name] = document.getElementById(id);
      }
    };

  /**
   * Hook observers of settings to allow or ban window opening.
   *
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.startObserveSettings =
    function lwm_startObserveSettings() {
      var enabledListener = (val) => {
        this.states.ready = true;
        if ('false' === val ||
            false   === val) {
          this.states.enabled = false;
        } else if('true' === val ||
                  true   === val) {
          this.states.enabled = true;
          // For performance reason, we need to create window at the moment
          // the settings get enabled.
          if (!this.states.instance) {
            this.createWindow();
          }
        }
      };

      // FIXME(ggp) this is currently used by Find My Device to force locking.
      // Should be replaced by a proper IAC API in bug 992277.
      var lockListener = (event) => {
        if (true === event.settingValue) {
          this.openApp();
        }
      };

      window.SettingsListener.observe('lockscreen.enabled',
        true, enabledListener);

      // We are only interested in changes to the setting, rather
      // than its value, so just observe it instead of using SettingsListener
      navigator.mozSettings.addObserver('lockscreen.lock-immediately',
          lockListener);
    };

  /**
   * Hook listeners of events this manager interested in.
   *
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.startEventListeners =
    function lwm_startEventListeners() {
      this.configs.listens.forEach((function _initEvent(type) {
        self.addEventListener(type, this);
      }).bind(this));
    };

  /**
   * Remove listeners of events this manager interested in.
   *
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.stopEventListeners =
    function lwm_stopEventListeners() {
      this.configs.listens.forEach((function _unbind(ename) {
        self.removeEventListener(ename, this);
      }).bind(this));
    };

  /**
   * Close the lockscreen app.
   * If it's not enabled, would do nothing.
   *
   * @param {boolean} instant - true if instantly close.
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.closeApp =
    function lwm_closeApp(instant) {
      if (!this.states.enabled || !this.isActive()) {
        return;
      }
      this.states.instance.close(instant ? 'immediate': undefined);
      this.elements.screen.classList.remove('locked');
      this.toggleLockedSetting(false);
      this.publish(this.EVENT_PREFIX + '-deactivated', this);
    };

  /**
   * Open the lockscreen app.
   * If it's necessary, would create a new window.
   * If it's not enabled, would do nothing.
   *
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.openApp =
    function lwm_openApp() {
      if (!this.states.enabled) {
        return;
      }
      if (!this.states.instance) {
        var app = this.createWindow();
        app.open();
      } else {
        this.states.instance.open();
      }
      this.elements.screen.classList.add('locked');
      this.toggleLockedSetting(true);
      this.publish(this.EVENT_PREFIX + '-activated', this);
    };

  /**
   * Message passing method. Would publish to the whole System app.
   *
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.publish =
    function lwm_publish(ne, detail) {
      var event = new CustomEvent(ne, { detail: detail });
      window.dispatchEvent(event);
    };

  /**
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.registerApp =
    function lwm_registerApp(app) {
      this.states.instance = app;
    };

  /**
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.unregisterApp =
    function lwm_unregisterApp(app) {
      this.states.instance = null;
    };

  /**
   * When screenchange hanneped, create LockScreen and LockScreenWindow
   * if it is needed.
   *
   * @private
   * @return {LockScreenWindow}
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.createWindow =
    function lwm_createWindow() {
      if (this.states.windowCreating) {
        return false;
      }
      this.states.windowCreating = true;
      var app = new LockScreenWindow();
      // XXX: Before we can use real InputWindow and InputWindowManager,
      // we need this to
      app.inputWindow = new LockScreenInputWindow();
      this.states.windowCreating = false;
      return app;
    };

  /**
   * First time we launch, we must check the init value of enabled,
   * to see if we need to open the window.
   *
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.initWindow =
    function lwm_initWindow() {
      var req = window.SettingsListener.getSettingsLock()
        .get('lockscreen.enabled');
      req.onsuccess = () => {
        this.states.ready = true;
        if (true === req.result['lockscreen.enabled'] ||
           'true' === req.result['lockscreen.enabled']) {
          this.states.enabled = true;
        } else if (false === req.result['lockscreen.enabled'] ||
                   'false' === req.result['lockscreen.enabled']) {
          this.states.enabled = false;
        }
        this.openApp();
      };
    };

  LockScreenWindowManager.prototype.unlock =
    function lwm_unlock(detail) {
      // XXX:
      // There is a self-routing here:
      // Service.request('unlock') ->
      // LockscreenWindowManager#unlock ->
      // ['lockscreen-request-unlock'] ->
      // LockscreenWindowManager#responseUnlock |
      // VisibilityManager#firing showwindow
      //
      // We should just call responseUnlock here,
      // but VisibilityManager needs this event to notify
      // AppWindowManager to showwindow correctly;
      // The reason not using lockscreen-appclosing/lockscreen-appclosed
      // is the race of mozActivity launch coming from lockscreen
      // and homescreen will race to be opened and cause performance issue.
      //
      // We should adjust LockScreenWindow to use lockscreen-appclosing/closed
      // to have the activitiy/notification info hence we could change
      // VisibilityManager later to avoid this workaround.
      this.publish('lockscreen-request-unlock', detail);
    };

  LockScreenWindowManager.prototype.responseUnlock =
    function lwm_responseUnlock(detail) {
      var forcibly = (detail && detail.forcibly) ? true : false;
      this.closeApp(forcibly);
    };

  LockScreenWindowManager.prototype.lock =
    function lwm_lock(detail) {
      this.openApp();
    };

  LockScreenWindowManager.prototype.getInstance =
    function lwm_getInstance() {
      return this.states.instance;
    };

  LockScreenWindowManager.prototype.isActive =
    function lwm_isActive() {
      if (null === this.states.instance) {
        return false;
      } else {
        return this.states.instance.isActive();
      }
    };

  LockScreenWindowManager.prototype.onInputpadOpen =
    function lwm_onInputpadOpen() {
      this.states.instance.inputWindow.open();
      this.states.instance.resize();
    };

  LockScreenWindowManager.prototype.onInputpadClose =
    function lwm_onInputpadClose() {
      this.states.instance.inputWindow.close();
      this.states.instance.resize();
    };

  LockScreenWindowManager.prototype.toggleLockedSetting =
    function lswm_toggleLockedSetting(value) {
      if (!window.navigator.mozSettings) {
        return;
      }
      window.SettingsListener.getSettingsLock().set({
        'lockscreen.locked': value
      });
    };

  /** @exports LockScreenWindowManager */
  exports.LockScreenWindowManager = LockScreenWindowManager;
})(window);
