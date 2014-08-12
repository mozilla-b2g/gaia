/* global System */
'use strict';

(function(exports) {
  /**
   * Manage LockScreenWindow apps. This is a subset of the AppWindow manager,
   * and will not handle most cases the later one would handle. Only those
   * meaningful cases, like secure app open, close, requesting kill all apps
   * or turn the secure mode on/off, would be handled. However, if we need
   * to handle cases in the future, we would extend this manager.
   *
   * So far the LockscreenWindowManager would only manager 1 secure app at once,
   * but there're already some designations for multiple apps.
   *
   * @constructor LockscreenWindowManager
   */
  var LockscreenWindowManager = function() {};
  LockscreenWindowManager.IMPORTS = [
    'js/clock.js',
    'js/lockscreen.js',
    'js/lockscreen_slide.js',
    'shared/js/template.js',
    'js/lockscreen_window.js'
  ];
  System.create(LockscreenWindowManager, {},
  {
    /**
     * @memberof LockscreenWindowManager#
     * @prop {DOMElement} windows - the `#windows` element, which is the same
     *                              element that the would AppWindowManager use.
     * @prop {DOMElement} screen - the `#screen` element.
     */
    elements: {
      windows: null,
      screen: null
    },

    /**
     * @memberof LockscreenWindowManager#
     */
    states: {
      FTUOccurs: false,
      enabled: true,
      instance: null,
      active: false,
      windowCreating: false
    },

    /**
     * @memberof LockscreenWindowManager#
     */
    configs: {
      listens: ['lockscreen-request-unlock',
                'lockscreen-appcreated',
                'lockscreen-appterminated',
                'lockscreen-appclose',
                'screenchange',
                'ftuopen',
                'ftudone',
                'overlaystart',
                'showlockscreenwindow',
                'home'
               ]
    },
    modules: ['LockScreenNotifications',
              'LockScreenPasscodeValidator']
  });

  /**
   * To initialize the class instance (register events, observe settings, etc.)
   */
  LockscreenWindowManager.prototype._start =
  function lwm_start() {
    this.startModules();
    this.startEventListeners();
    this.startObserveSettings();
    this.initElements();
    this.initWindow();
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
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.handleEvent =
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
        case 'fturequest-unlock':
        case 'ftuopen':
          this.states.FTUOccurs = true;
          if (!this.states.instance) {
            return;
          }
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
        case 'lockscreen-appclose':
          break;
        case 'screenchange':
          // The screenchange may be invoked by proximity sensor,
          // or the power button. If it's caused by the proximity sensor,
          // we should not open the LockScreen, because the user may stay
          // in another app, not the LockScreen.
          if ('proximity' !== evt.detail.screenOffBy &&
              !this.states.FTUOccurs) {
            // The app would be inactive while screen off.
            this.openApp();
          }
          break;
        case 'home':
          // We assume that this component is started before AppWindowManager
          // to make this blocking code works.
          if (this.states.active) {
            evt.stopImmediatePropagation();
          }
          break;
      }
    };

  /**
   * @private
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.initElements =
    function lwm_initElements() {
      var selectors = { windows: 'windows', screen: 'screen'};
      for (var name in selectors) {
        var id = selectors[name];
        this.elements[name] = document.getElementById(id);
      }
    };

  /**
   * Instantiate and start submodules.
   *
   * @private
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.startModules =
    function lwm_startObserveSettings() {
      this.modules.forEach(function(module) {
        if (window[module]) {
          var moduleName = System.lowerCapital(module);
          window[moduleName] = new window[module](this);
          window[moduleName].start && window[moduleName].start();
        }
      }, this);
    };

  /**
   * Hook observers of settings to allow or ban window opening.
   *
   * @private
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.startObserveSettings =
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
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.startEventListeners =
    function lwm_startEventListeners() {
      this.configs.listens.forEach((function _initEvent(type) {
        self.addEventListener(type, this);
      }).bind(this));
    };

  /**
   * Remove listeners of events this manager interested in.
   *
   * @private
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.stopEventListeners =
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
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.closeApp =
    function lwm_closeApp(instant) {
      if (!this.states.enabled && !this.states.active) {
        return;
      }
      this.states.active = false;
      this.states.instance.close(instant ? 'immediate': undefined);
      this.elements.screen.classList.remove('locked');
    };

  /**
   * Open the lockscreen app.
   * If it's necessary, would create a new window.
   * If it's not enabled, would do nothing.
   *
   * @private
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.openApp =
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
      this.states.active = true;
    };

  /**
   * Message passing method. Would publish to the whole System app.
   *
   * @private
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.publish =
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
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.registerApp =
    function lwm_registerApp(app) {
      this.states.instance = app;
    };

  /**
   * @private
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.unregisterApp =
    function lwm_unregisterApp(app) {
      this.states.instance = null;
    };

  /**
   * When screenchange hanneped, create LockScreen and LockScreenWindow
   * if it is needed.
   *
   * @private
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.createWindow =
    function lwm_createWindow() {
      if (this.states.windowCreating) {
        return false;
      }
      this.states.windowCreating = true;
      var app = new window.LockScreenWindow();
      app.open();
      this.states.windowCreating = false;
    };

  /**
   * First time we launch, we must check the init value of enabled,
   * to see if we need to open the window.
   *
   * @private
   * @this {LockscreenWindowManager}
   * @memberof LockscreenWindowManager
   */
  LockscreenWindowManager.prototype.initWindow =
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

  LockscreenWindowManager.prototype.responseUnlock =
    function lwm_responseUnlock(detail) {
      // Only when the background app is ready,
      // we close the window.
      var activeApp = System.topMostAppWindow;
      if (!activeApp) {
        this.closeApp();
      } else {
        activeApp.ready(this.closeApp.bind(this));
      }
    };

  /** @exports LockscreenWindowManager */
  exports.LockscreenWindowManager = LockscreenWindowManager;
})(window);
