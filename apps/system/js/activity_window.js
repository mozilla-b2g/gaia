'use strict';

(function(window) {
  var _id = 0;

  /**
   * ActivityWindow is the wrapper for the inline activity instances.
   * For window disposition activity, they are done in AppWindow.
   *
   * ##### Flow chart
   * ![ActivityWindow flow](http://i.imgur.com/4O1Frs3.png)
   *
   * @example
   * var app = new AppWindow({
   *   url: 'http://uitest.gaiamobile.org:8080/index.html',
   *   manifestURL: 'http://uitest.gaiamobile.org:8080/manifest.webapp'
   * });
   * var activity = new ActivityWindow({
   *   url: 'http://gallery.gaiamobile.org:8080/pick.html',
   *   manifestURL: 'http://gallery.gaiamobile.org:8080/manifest.webapp'
   * }, app);
   *
   * @class ActivityWindow
   * @param {Object} config The configuration object of this activity.
   * @param {AppWindow|ActivityWindow} caller The caller of this activity.
   */
  /**
   * Fired when the activity window is created.
   * @event ActivityWindow#activitycreated
   */
  /**
   * Fired when the activity window is removed.
   * @event ActivityWindow#activityterminated
   */
  /**
   * Fired when the activity window is opening.
   * @event ActivityWindow#activityopening
   */
  /**
   * Fired when the activity window is opened.
   * @event ActivityWindow#activityopen
   */
  /**
   * Fired when the activity window is cloing.
   * @event ActivityWindow#activityclosing
   */
  /**
   * Fired when the activity window is closed.
   * @event ActivityWindow#activityclose
   */
  /**
   * Fired before the activity window is rendered.
   * @event ActivityWindow#activitywillrender
   */
  /**
   * Fired when the activity window is rendered to the DOM tree.
   * @event ActivityWindow#activityrendered
   */
  /**
   * Fired when the page visibility of the activity window is
   * changed to foreground.
   * @event ActivityWindow#activityforeground
   */
  /**
   * Fired when the page visibility of the activity window is
   * changed to background.
   * @event ActivityWindow#activitybackground
   */
  var ActivityWindow = function ActivityWindow(config, caller) {
    this.config = config;
    for (var key in config) {
      this[key] = config[key];
    }

    if (caller) {
      caller.setActivityCallee(this);
      this.activityCaller = caller;
      // TODO: Put us inside the caller element.
    }

    this.render();
    this.publish('created');
    // We'll open ourselves automatically,
    // but maybe we should do requestOpen and let manager open us.
    this.open();
  };

  ActivityWindow.prototype.__proto__ = AppWindow.prototype;

  ActivityWindow.prototype.eventPrefix = 'activity';

  ActivityWindow.prototype.CLASS_NAME = 'ActivityWindow';

  /**
   * Turn on this flag to dump debugging messages for all activity windows.
   * @type {Boolean}
   */
  ActivityWindow.prototype._DEBUG = false;

  ActivityWindow.prototype.openAnimation = 'slideleft';
  ActivityWindow.prototype.closeAnimation = 'slideright';

  /**
   * ActivityWindow's fullscreen state is copying from the caller
   * instead of reading manifest so we just overwrite the
   * isFullScreen method of AppWindow.
   *
   * @return {Boolean} The activity window is fullscreen or not.
   */
  ActivityWindow.prototype.isFullScreen = function acw_isFullScreen() {
    if (typeof(this._fullscreen) !== 'undefined') {
      return this._fullscreen;
    }

    this._fullscreen = this.activityCaller ?
                       this.activityCaller.isFullScreen() :
                       this.manifest ?
                       !!this.manifest.fullscreen :
                       false;
    return this._fullscreen;
  };

  /**
   * Lock or unlock orientation for this activity.
   */
  ActivityWindow.prototype.setOrientation =
    function acw_setOrientation(noCapture) {
      if (this.isActive()) {
        var manifest = this.manifest || this.config.manifest ||
                       (this.activityCaller ?
                        this.activityCaller.manifest : null);

        if (!manifest) {
          if ('unlockOrientation' in screen) {
            screen.unlockOrientation();
          } else if ('mozUnlockOrientation' in screen) {
            screen.mozUnlockOrientation();
          }
          return;
        }

        var orientation = manifest ? (manifest.orientation ||
                          OrientationManager.globalOrientation) :
                          OrientationManager.globalOrientation;
        if (orientation) {
          var rv = false;
          if ('lockOrientation' in screen) {
            rv = screen.lockOrientation(orientation);
          } else if ('mozLockOrientation' in screen) {
            rv = screen.mozLockOrientation(orientation);
          }
          if (rv === false) {
            console.warn('screen.mozLockOrientation() returned false for',
                         this.origin, 'orientation', orientation);
          }
        } else {  // If no orientation was requested, then let it rotate
          if ('unlockOrientation' in screen) {
            screen.unlockOrientation();
          } else if ('mozUnlockOrientation' in screen) {
            screen.mozUnlockOrientation();
          }
        }
      }

      if (!noCapture && this.activityCallee &&
          this.activityCallee instanceof ActivityWindow) {
        this.activityCallee.setOrientation(noCapture);
      }
    };

  ActivityWindow.prototype.view = function acw_view() {
    this.instanceID = _id;
    return '<div class="appWindow activityWindow inline-activity' +
            '" id="activity-window-' + _id++ + '">' +
            '<div class="screenshot-overlay"></div>' +
            '<div class="fade-overlay"></div>' +
            '</div>';
  };

  ActivityWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog,
    'contextmenu': window.BrowserContextMenu
  };

  ActivityWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
      'mozbrowserloadend', 'mozbrowseractivitydone', 'mozbrowserloadstart',
      '_localized', '_opened', '_closing'];

  ActivityWindow.prototype._handle__closing =
    function acw__handle__closing() {
      this.restoreCaller();
    };

  ActivityWindow.prototype._handle_mozbrowseractivitydone =
    function aw__handle_mozbrowseractivitydone() {
      this.kill();
    };

  /**
   * Kill ActivityWindow. We overwrite the default behavior of
   * AppWindow.kill here.
   */
  ActivityWindow.prototype.kill = function acw_kill(evt) {
    if (this._killed)
      return;
    this._killed = true;
    if (evt && 'stopPropagation' in evt) {
      evt.stopPropagation();
    }
    if (this.isActive()) {
      var self = this;
      this.element.addEventListener('_closed', function onClose() {
        self.element.addEventListener('_closed', onClose);
        self.publish('terminated');
        // If caller is an instance of appWindow,
        // tell AppWindowManager to open it.
        // XXX: Call this.activityCaller.open() if open logic is done.
        self.debug('request caller to open again');
        if (self.activityCallee) {
          self.activityCallee.kill();
        }
        if (self.activityCaller instanceof AppWindow) {
          // If we're killed by event handler, display the caller.
          if (evt) {
            self.activityCaller.requestOpen();
          }
        } else if (self.activityCaller instanceof ActivityWindow) {
          if (evt) {
            self.activityCaller.open();
          }
        } else {
          console.warn('unknown window type of activity caller.');
        }

        var e = self.element.parentNode.removeChild(self.element);
        self.debug('removing ' + e);
        self.publish('removed');
      });
      this.close();
    } else {
      this.publish('terminated');
      if (this.activityCallee) {
        this.activityCallee.kill();
      }
      var e = this.element.parentNode.removeChild(this.element);
      this.debug('removing ' + e);
      this.publish('removed');
    }
    this.debug('killed by ', evt ? evt.type : 'direct function call.');
    this.activityCaller.unsetActivityCallee();
  };

  ActivityWindow.prototype.render = function acw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    // TODO: Use BrowserConfigHelper.
    this.browser_config = {
      origin: this.origin,
      url: this.url,
      name: this.name,
      manifest: this.manifest,
      manifestURL: this.manifestURL,
      window_name: 'inline' + this.instanceID,
      oop: true
    };
    this.browser = new BrowserFrame(this.browser_config);
    this.element =
      document.getElementById('activity-window-' + this.instanceID);
    this.element.insertBefore(this.browser.element, this.element.childNodes[0]);
    this.frame = this.element;
    this.iframe = this.browser.element;
    this.screenshotOverlay = this.element.querySelector('.screenshot-overlay');
    this.fadeOverlay = this.element.querySelector('.fade-overlay');

    // Copy fullscreen state from caller.
    if (this.isFullScreen()) {
      this.element.classList.add('fullscreen-app');
    }

    this._registerEvents();
    this.installSubComponents();
    this.publish('rendered');
  };

  /**
   * ActivityWindow's default container is '#windows'.
   * However, we could dynamically change this in layout manager
   * after it recieves the activitywillrender event.
   */
  ActivityWindow.prototype.containerElement =
    document.getElementById('windows');

  /**
   * Bringing ourselves up. To do so we simply do
   * requestOpen() the original caller app window instance.
   * Note: this overrides AppWindow.prototype.requestOpen().
   */
  ActivityWindow.prototype.requestOpen = function acw_requestOpen() {
    if (this.activityCaller)
      this.activityCaller.requestOpen();
  };

  /**
   * Restore caller's visibility when we start closing.
   * But if the caller is not active, it would return early.
   */
  ActivityWindow.prototype.restoreCaller = function restoreCaller() {
    var app = this.activityCaller;
    // Do nothing if app is not active.
    if (!app || !app.isActive() || app._killed)
      return;

    // Do not bubble the orientation lock this time.
    app.setOrientation(true);
    if (app instanceof AppWindow) {
      // XXX: Refine this in AttentionWindow
      if (!AttentionScreen.isFullyVisible()) {
        app.setVisible(true);
      }
    } else if (app instanceof ActivityWindow) {
      // XXX: Refine this in AttentionWindow
      if (!AttentionScreen.isFullyVisible()) {
        app.setVisible(true);
      }
    }
  };

  ActivityWindow.prototype._handle__opened =
    function acw__handle__opened() {
      var app = this.activityCaller;
      // Set page visibility of focused app to false
      // once inline activity frame's transition is ended.
      // XXX: We have trouble to make all inline activity
      // openers being sent to background now,
      // because of OOM killer may kill them accidently.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=914412,
      // and https://bugzilla.mozilla.org/show_bug.cgi?id=822325.
      // So we only set browser app(in-process)'s page visibility
      // to false now to resolve 914412.
      if (app && app instanceof AppWindow && !app.isOOP()) {
        app.setVisible(false, true);
      }
    };

  window.ActivityWindow = ActivityWindow;

}(this));
