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
    this.startEventListeners();
    this.createWindow();
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
      instance: null
    },

    /**
     * @memberof LockScreenWindowManager#
     */
    configs: {
      listens: ['will-unlock',
                'lockscreen-appcreated',
                'lockscreen-appterminated',
                'screenchange'
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
        case 'will-unlock':
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
        case 'screenchange':
          // If the screen is turning on and we don't have any app yet.
          if (!this.states.instance && evt.detail.screenEnabled) {
            this.createWindow(evt);
          } else if (evt.detail.screenEnabled) {
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
   *
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.closeApp =
    function lwm_closeApp() {
      this.states.instance.close();
    };

  /**
   * Open the lockscreen app.
   *
   * @private
   * @this {LockScreenWindowManager}
   * @memberof LockScreenWindowManager
   */
  LockScreenWindowManager.prototype.openApp =
    function lwm_openApp() {
      this.states.instance.open();
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

  /** @exports LockScreenWindowManager */
  exports.LockScreenWindowManager = LockScreenWindowManager;
})(window);
