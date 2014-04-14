/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

(function(exports) {

  const DEBUG = false;

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
    // Setup some config values before we use it.
    this.setup();
    this.startEventListeners();
    this.startObserveSettings();
    this.initElements();
    this.initWindow();
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
      instance: null,
      active: false,
      lockScreenReady: false, // the inner content is ready ('lock' message)
      messageQueue: [],
      delayLockedEvent: false // @see handleIACMessages
    },

    /**
     * @memberof LockScreenWindowManager#
     */
    configs: {
      commname: 'lockscreencomms',
      lockscreenapp: {
        url: '',
        manifestURL: ''
      },
      listens: ['mozChromeNotificationEvent',
                'request-lock',
                'request-unlock',
                'will-unlock',
                'lockscreen-appcreated',
                'lockscreen-appterminated',
                'lockscreen-appclose',
                'lockscreen-appopened',
                'screenchange',
                'ftuopen',
                'overlaystart',
                'showlockscreenwindow',
                'ftudone',
                'home',
                'iac-lockscreencomms'
               ]
    },
    // From |navigator.mozApps.getSelf()|
    app: null
  };

  /**
   * Setup some config values before we use it.
   *
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.setup =
    function lwm_setup() {
      this.configs.lockscreenapp.url =
        window.location.href.replace('system', 'lockscreen'),
      this.configs.lockscreenapp.manifestURL =
        this.configs.lockscreenapp.url.
        replace(/(\/)*(index.html)*$/, '/manifest.webapp');

      // Cache the app to prevent missing message.
      navigator.mozApps.getSelf().onsuccess = (evt) => {
        this.app = evt.target.result;
        this.postQueuedMessages();
      };
    };

  /**
   * @listens will-unlock - means to close remain apps.
   * @listens lockscreen-appcreated - when a lockscreen app got created, it
   *                                  would fire this event.
   * @listens lockscreen-appterminated - when a lockscreen app got really
   *                                     closed, it would fire this event.
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
        case 'request-lock':
          this.openApp();
          this.postMessage('request-lock');
          break;
        case 'request-unlock':
          this.closeApp();
          this.postMessage('request-unlock');
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
        case 'lockscreen-appopened':
          app = evt.detail;
          // When the window restart itself after crashed,
          // it would fire open event without created,
          // so we need to register it again in this handler.
          if (!this.states.instance) {
            this.registerApp(app);
          }
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
        case 'home':
          if (this.states.active) {
            this.publish('secure-closeapps');
            evt.stopImmediatePropagation();
          }
          break;
        case 'mozChromeNotificationEvent':
          var eevt = evt.detail,
              messagename = '';
          switch(eevt.type) {
            case 'desktop-notification':
              messagename = 'request-add-notification';
              this.postMessage(messagename, {'detail': eevt});
              break;
            case 'desktop-notification-close':
              messagename = 'request-close-notification';
              this.postMessage(messagename, {'detail': eevt});
              break;
          }
          break;
        case 'iac-' + this.configs.commname:
          this.handleIACMessages(evt);
          break;
      }
    };

  /**
   * Handle IAC messages.
   *
   * @param {event}
   */
  LockScreenWindowManager.prototype.handleIACMessages =
    function lwm_handleIACMessages(evt) {
      // Because the message would be encapsulated in the |evt.detail|.
      var {type, detail} = evt.detail;
      this.debug('(II) received IAC in LWM: ', type);
      switch (type) {
        case 'lock':
          // Two types of lock:
          // 1. The LockScreen locks it while the window is closed.
          // 2. The LockScreen locks it while the window is open.
          //
          // We only propagate the event #2 to prevent confusing.
          // But we still record the inner LockScreen is now locked,
          // and will dispatch the lock event while the window got open.
          this.states.delayLockedEvent = true;
          if (!this.states.active) {
            return;
          }
          this.states.lockScreenReady = true;
          /* falls through */
        case 'unlocking-start':
        case 'unlocking-stop':
        case 'will-unlock':
        case 'secure-killapps':
        case 'secure-closeapps':
        case 'secure-launchapp':
        case 'secure-modeoff':
        case 'secure-modeon':
          this.publish(
            { 'type': type,
              'detail': detail
            });
          break;
        case 'unlock':
          this.publish(
            { 'type': type,
              'detail': detail
            });
          this.closeApp();
          this.states.lockScreenReady = false;
          break;
        case 'activity-unlock':
          var activity = new window.MozActivity(detail);
          activity.onerror = () => {
            this.debug('(EE) MozActivity: launch error', detail);
          };
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
      if (!this.states.enabled && !this.states.active) {
        return;
      }
      this.states.instance.close(instant ? 'immediate': undefined);
      this.elements.screen.classList.remove('locked');
      this.states.active = false;
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
      this.states.active = true;
      if (this.states.delayLockedEvent) {
        this.publish('lock');
        this.states.delayLockedEvent = false;
      }
    };

  /**
   * Message passing method. Would publish to the whole System app.
   *
   * @param {string|object} - the type of the event or {type, detail}
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.publish =
    function lwm_publish(ne, source) {
      if ('string' === typeof ne) {
        ne = new CustomEvent(ne);
      } else {
        ne = new CustomEvent(ne.type, {'detail': ne.detail});
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
      var app = new window.LockScreenWindow(
        new window.BrowserConfigHelper(
        this.configs.lockscreenapp.url,
        this.configs.lockscreenapp.manifestURL));
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

  /**
   * Queuing messages before the app was ready.
   * This can prevent some messages not post.
   *
   * @private
   * @param {object} - the message
   */
  LockScreenWindowManager.prototype.queueMessage =
    function lwm_queueMessage(message) {
      this.states.messageQueue.push(message);
    };

  /**
   * Post all queued message.
   * @private
   */
  LockScreenWindowManager.prototype.postQueuedMessages =
    function lwm_postQueuedMessages() {
      this.states.messageQueue.forEach((message) => {
        // In fact, before queuing, the message detail would become
        // the body of the IAC message, and type would become an
        // attribute of it. See 'postMessage';
        this.postMessage(message.type, message);
      });
      // Clean it.
      this.states.messageQueue.length = 0;
    };

  /**
   * Post message out to the LockScreen app.
   * If receiver need to treat it as the event format,
   * the detail need to be wrapped with {'detail': detail}.
   *
   * @param {string} type
   * @param {object} detail - (optional)
   * @return {Promise}
   */
  LockScreenWindowManager.prototype.postMessage =
    function lwm_postMessage(type, detail) {
      var message = detail || {};
      message.type = type;
      this.debug('(II) try to send IAC in LWM: ', type);

      // If app is not ready, do queuing.
      if (!this.app) {
        this.debug('(II) queued message: ', type);
        this.queueMessage(message);
        navigator.mozApps.getSelf().onsuccess = (evt) => {
          this.debug('(II) want to post queued messages');
          this.app = evt.target.result;
          this.postQueuedMessages();
        };
        return;
      }
      this.app.connect(this.configs.commname).then((ports) => {
        this.debug('(II) message "' + type + '" sent');
        ports.forEach(function(port) {
          port.postMessage(message);
        });
      }, (reason) => {
        this.debug('(EE) Communication is rejected ' + reason);
      });
    };

  /**
   * Print debug message if debug mode is on.
   *
   * @private
   * @param {any} - as the 'console.log'
   */
  LockScreenWindowManager.prototype.debug =
    function lwm_debug() {
      if (DEBUG) {
        console.log.apply(console, arguments);
      }
    };

  /** @exports LockScreenWindowManager */
  exports.LockScreenWindowManager = LockScreenWindowManager;
})(window);
