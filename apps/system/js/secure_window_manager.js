/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

(function(exports) {

  /**
   * Manage SecureWindow apps. This is a subset of the AppWindow manager,
   * and will not handle most cases the later one would handle. Only those
   * meaningful cases, like secure app open, close, requesting kill all apps
   * or turn the secure mode on/off, would be handled. However, if we need
   * to handle cases in the future, we would extend this manager.
   *
   * So far the SecureWindowManager would only manager 1 secure app at once,
   * but there're already some designations for multiple apps.
   *
   * @constructor SecureWindowManager
   */
  var SecureWindowManager = function() {
    this.initElements();
    this.initEvents();
  };
  SecureWindowManager.prototype = {

    /**
     * @memberof SecureWindowManager#
     * @prop {DOMElement} windows - the `#windows` element, which is the same
     *                              element that the would AppWindowManager use.
     * @prop {DOMElement} screen - the `#screen` element.
     */
    elements: {
      windows: null,
      screen: null
    },

    /**
     * @memberof SecureWindowManager#
     * @prop {boolean} killMode - If this mode is on, all closing app would be
     *                            closed immediately, and with no animation.
     */
    states: {
      activeApp: null,
      runningApps: {},
      killMode: false   // If this closing mode is instantly kill.
    },

    /**
     * @memberof SecureWindowManager#
     */
    configs: {
      killAnimation: 'immediate',
      listens: ['secure-killapps',
                'secure-closeapps',
                'secure-modeon',
                'secure-modeoff',
                'secure-appcreated',
                'secure-appterminated',
                'secure-apprequestclose'
               ]
    }
  };

  /**
   * @listens secure-killapps - means to kill remain apps, and make it ready to
   *                            turn the secure mode off.
   * @listens secure-closeapps - means to close remain apps. It's similar to
   *                             the event above, but would show the closing
   *                             animation.
   * @listens secure-modeon - the system would be in the secure mode by locking
   *                          or other reasons.
   * @listens secure-modeoff - the system now is not in the secure mode anymore.
   * @listens secure-appcreated - when a secure app got created, it would fire
   *                              this event.
   * @listens secure-appterminated - when a secure app got really closed, it
   *                                 would fire this event.
   * @listens secure-apprequestclose - when a secure app has been called to
   *                                   close itself, the event would be fired
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.handleEvent =
    function swm_handleEvent(evt) {
      var app = null;
      switch (evt.type) {
        case 'secure-killapps':
          if (0 !== Object.keys(this.states.runningApps).length) {
            this.states.killMode = true;
            this.killApps();
          }
          break;
        case 'secure-closeapps':
          if (0 !== Object.keys(this.states.runningApps).length) {
            this.killApps();
          }
          break;
        case 'secure-modeon':
          this.resume();
          break;
        case 'secure-modeoff':
          this.suspend();
          break;
        case 'secure-appcreated':
          app = evt.detail;
          if (this.allowed(app.config)) {
            this.registerApp(app);
            this.activateApp(app);
          } else {
            console.error('Disallowed app: ', app.instanceID);
          }
          break;
        case 'secure-appterminated':
          app = evt.detail;
          this.unregisterApp(app);
          this.deactivateApp();

          // If this is the last app in the list.
          if (0 === Object.keys(this.states.runningApps).length) {
            this.states.killMode = false;
          }
          break;
        case 'secure-apprequestclose':
          // Mimic the AppWindowManager,
          // because the SecureWindow app would send it, too.
          app = evt.detail;

          // Default animation or kill animation.
          app.close(this.states.killMode ?
              this.configs.killAnimation : null);
          break;
      }
    };

  /**
   * Remove event listeners except the resuming (`secure-modeon`)
   * event.
   *
   * @private
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.suspend =
    function swm_suspend() {
      this.suspendEvents();

      // Will suspend all events.
      // But we also want to leave a single entry to resume.
      self.addEventListener('secure-modeon', this);
    };

  /**
   * Hook event listeners back and don't care the resuming
   * (`secure-modeon`) event anymore.
   *
   * @private
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.resume =
    function swm_resume() {
      this.initEvents();

      // To prevent duplicated init.
      self.removeEventListener('secure-modeon', this);
    };

  /**
   * @private
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.initElements =
    function swm_initElements() {
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
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.initEvents =
    function swm_initEvents() {
      this.configs.listens.forEach((function _initEvent(type) {
        self.addEventListener(type, this);
      }).bind(this));
    };

  /**
   * Remove listeners of events this manager interested in.
   *
   * @private
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.suspendEvents =
    function swm_suspendEvents() {
      this.configs.listens.forEach((function _unbind(ename) {
        self.removeEventListener(ename, this);
      }).bind(this));
    };

  /**
   * Close/Kill all manager secure apps, which has been registered
   * while they're created and opened.
   *
   * If the `configs.killMode` is on (by event `secure-killapps`),
   * the closing would be instantly. Otherwise, app will close with
   * default animation.
   *
   * @private
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.killApps =
    function swm_killApps() {
      for (var origin in this.states.runningApps) {
        this.states.runningApps[origin].kill();
      }
    };

  /**
   * Message passing method. Would publish to the whole System app.
   *
   * @private
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.publish =
    function swm_publish(ne, source) {
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
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.registerApp =
    function swm_registerApp(app) {
      this.states.runningApps[app.instanceID] = app;
    };

  /**
   * @private
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.unregisterApp =
    function swm_unregisterApp(app) {
      delete this.states.runningApps[app.instanceID];
    };

  /**
   * Set an app as the active app.
   *
   * @private
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.activateApp =
    function swm_activateApp(app) {
      this.states.activeApp = app;
      if (app.isFullScreen()) {
        this.elements.screen.classList.add('fullscreen-app');
      } else {
        this.elements.screen.classList.remove('fullscreen-app');
      }
    };

  /**
   * Deactivate the current active app.
   *
   * @private
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.deactivateApp =
    function swm_deactivateApp() {
      if (this.states.activeApp.isFullScreen()) {
        this.elements.screen.classList.remove('fullscreen-app');
      }
      this.states.activeApp = null;
    };

  /**
   * See if the app is a secure app and can be managed by the manager.
   *
   * @param {AppConfig} - the configuration of the app.
   * @return {boolean} - if this app's config represent it's a secure app
   *                     and can be managed by the manager.
   * @this {SecureWindowManager}
   * @memberof SecureWindowManager
   */
  SecureWindowManager.prototype.allowed =
    function swm_allowed(config) {
      if ('certified' !== config.manifest.type) {
        return false;
      }
      return true;
    };

  /** @exports SecureWindowManager */
  exports.SecureWindowManager = SecureWindowManager;
})(window);
