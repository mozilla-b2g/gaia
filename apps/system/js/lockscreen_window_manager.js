/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

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
  var LockScreenWindowManager = function() {
    this.initElements();
    this.initWindow();
    this.startEventListeners();
    this.startObserveSettings();
  };
  LockScreenWindowManager.prototype = {
    /**
     * @memberof LockScreenWindowManager#
     * @prop {DOMElement} windows - the `#windows` element, which is the same
     *                              element that the would AppWindowManager use.
     * @prop {DOMElement} screen - the `#screen` element.
     */
    elements: {
      windows: null,
      screen: null
    },

    /**
     * @memberof LockScreenWindowManager#
     */
    states: {
      FTUOccurs: false,
      enabled: true,
      unlockDetail: null,
      instance: null
    },

    /**
     * @memberof LockScreenWindowManager#
     */
    configs: {
      listens: ['will-unlock',
                'lockscreen-appcreated',
                'lockscreen-appterminated',
                'lockscreen-appclose',
                'screenchange',
                'ftuopen',
                'ftudone',
                'overlaystart',
                'showlockscreenwindow'
               ]
    }
  };

  /**
   * @listens will-unlock - means to close remain apps.
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
          if (this.states.instance && this.states.instance.isActive()) {
            this.states.instance.setVisible(false);
          }
          break;
        case 'showlockscreenwindow':
          if (this.states.instance && this.states.instance.isActive()) {
            this.states.instance.setVisible(true);
          }
          break;
        case 'ftuopen':
          this.states.FTUOccurs = true;
          if (!this.states.instance) {
            return;
          }
          // Need immediatly unlocking (hide window).
          this.closeApp(true);
          window.dispatchEvent(
            new CustomEvent('unlock'));
          break;
        case 'ftudone':
          this.states.FTUOccurs = false;
          break;
        case 'will-unlock':
          this.states.unlockDetail = evt.detail;
          this.closeApp();
          break;
        case 'lockscreen-appcreated':
          app = evt.detail;
          this.registerApp(app);
          break;
        case 'lockscreen-appterminated':
          app = evt.detail;
          this.unregisterApp(app);
          break;
        case 'lockscreen-appclose':
          window.dispatchEvent(
            new CustomEvent('unlock', this.states.unlockDetail));
          this.states.unlockDetail = null;
          break;
        case 'screenchange':
          // The screenchange may be invoked by proximity sensor,
          // or the power button. If it's caused by the proximity sensor,
          // we should not open the LockScreen, because the user may stay
          // in another app, not the LockScreen.
          if (evt.detail.screenEnabled &&
              'proximity' !== evt.detail.screenOffBy &&
              !this.states.FTUOccurs) {
            // The app would be inactive while screen off.
            this.openApp();
          }
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
        if ('false' === val ||
            false   === val) {
          this.states.enabled = false;
        } else if('true' === val ||
                  true   === val) {
          this.states.enabled = true;
        }
      };

      // FIXME(ggp) this is currently used by Find My Device
      // to force locking. Should be replaced by a proper
      // IAC API in the future.
      var lockListener = (val) => {
        if (true === val) {
          this.openApp();
        }
      };

      window.SettingsListener.observe('lockscreen.enabled',
          true, enabledListener);
      window.SettingsListener.observe('lockscreen.lock-immediately',
          false, lockListener);
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
      if (!this.states.enabled) {
        return;
      }
      this.states.instance.close(instant ? 'immediate': undefined);
      this.elements.screen.classList.remove('locked');
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
        this.createWindow();
      } else {
        this.states.instance.open();
      }
      this.elements.screen.classList.add('locked');
    };

  /**
   * Message passing method. Would publish to the whole System app.
   *
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.publish =
    function lwm_publish(ne, source) {
      if ('string' === typeof ne) {
        ne = new CustomEvent(ne);
      }
      if (!source) {
        source = window;
      }
      source.dispatchEvent(ne);
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
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.createWindow =
    function lwm_createWindow() {
      var app = new window.LockScreenWindow();
      app.open();
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

  /** @exports LockScreenWindowManager */
  exports.LockScreenWindowManager = LockScreenWindowManager;
})(window);
