/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

(function(exports) {

  /**
   * To delegate the ownership of apps out of other components,
   * so we can keep our components clean, and only hold minimal
   * parts they should know. The user should only need to know
   * how to create a SecureWindow app via the `create` method in
   * this factory.
   *
   * @constructor SecureWindowFactory
   */
  var SecureWindowFactory = function() {
    this.initEvents();
  };

  SecureWindowFactory.prototype = {
    /**
     * @memberof SecureWindowFactory#
     * @prop {object} apps - would hold spawned apps and release them
     *                       while they got terminated.
     */
    states: {
      apps: {}
    },

    /**
     * @memberof SecureWindowFactory#
     */
    configs: {
      listens: ['secure-launchapp',
                'secure-appterminated',
                'secure-modeon',
                'secure-modeoff']
    }
  };

  /**
   * Hook listeners of events this factory interested in.
   *
   * @private
   * @this {SecureWindowFactory}
   * @memberof SecureWindowFactory
   */
  SecureWindowFactory.prototype.initEvents =
    function swf_initEvents() {
      this.configs.listens.forEach((function _initEvent(type) {
        self.addEventListener(type, this);
      }).bind(this));
    };

  /**
   * Remove listeners of events this factory interested in.
   *
   * @private
   * @this {SecureWindowFactory}
   * @memberof SecureWindowFactory
   */
  SecureWindowFactory.prototype.suspendEvents =
    function swf_suspendEvents() {
      this.configs.listens.forEach((function _unbind(ename) {
        self.removeEventListener(ename, this);
      }).bind(this));
    };

  /**
   * Remove event listeners except the resuming (`secure-modeon`)
   * event.
   *
   * @private
   * @this {SecureWindowFactory}
   * @memberof SecureWindowFactory
   */
  SecureWindowFactory.prototype.suspend =
    function swf_suspend() {
      this.suspendEvents();
      self.addEventListener('secure-modeon', this);
      for (var origin in this.states.apps) {
        this.unregisterApp(this.states.apps[origin]);
      }
    };

  /**
   * Hook event listeners back and don't care the resuming
   * (`secure-modeon`) event anymore.
   *
   * @private
   * @this {SecureWindowFactory}
   * @memberof SecureWindowFactory
   */
  SecureWindowFactory.prototype.resume =
    function swf_resume() {
      this.initEvents();

      // To prevent duplicated init.
      self.removeEventListener('secure-modeon', this);
    };

  /**
   * @listens secure-launchapp - launch app by URL and manifest URL.
   * @listens secure-modeon - the system would be in the secure mode by locking
   *                          or other reasons.
   * @listens secure-modeoff - the system now is not in the secure mode anymore.
   * @listens secure-appterminated - when a secure app got really closed, it
   *                                 would fire this event.
   * @memberof SecureWindowFactory
   */
  SecureWindowFactory.prototype.handleEvent =
    function(evt) {
      switch (evt.type)
      {
        case 'secure-launchapp':
          var {appURL, appManifestURL} = evt.detail;
          this.create(appURL, appManifestURL);
          break;
        case 'secure-appterminated':
          var app = evt.detail;
          this.unregisterApp(app);
          break;
        case 'secure-modeoff':
          this.suspend();
          break;
        case 'secure-modeon':
          this.resume();
          break;
      }
    };

  /**
   * Create a SecureWindow app.
   *
   * @param {URL} url - the app's URL
   * @param {URL} manifestURL - the URL of the app's manifest
   * @this {SecureWindowFactory}
   * @memberof SecureWindowFactory
   */
  SecureWindowFactory.prototype.create =
    function(url, manifestURL) {
      var config = new self.BrowserConfigHelper(url, manifestURL);
      for (var instanceID in this.states.apps) {
        if (config.origin === this.states.apps[instanceID].origin) {
          return;  // Already created.
        }
      }
      var app = new self.SecureWindow(config);
      app.open();
      this.registerApp(app);
    };

  /**
   * @private
   * @this {SecureWindowFactory}
   * @memberof SecureWindowFactory
   */
  SecureWindowFactory.prototype.registerApp =
    function(app) {
      this.states.apps[app.instanceID] = app;
    };

  /**
   * @private
   * @this {SecureWindowFactory}
   * @memberof SecureWindowFactory
   */
  SecureWindowFactory.prototype.unregisterApp =
    function(app) {
      delete this.states.apps[app.instanceID];
    };

  /** @exports SecureWindowFactory */
  exports.SecureWindowFactory = SecureWindowFactory;
})(self);
