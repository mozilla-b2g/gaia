'use strict';

(function(window) {
  var _id = 0;

  // XXX: Move into WrapperWindow.
  var wrapperHeader = document.querySelector('#wrapper-activity-indicator');
  var wrapperFooter = document.querySelector('#wrapper-footer');

  var ActivityWindow = function ActivityWindow(config, caller) {
    this.browser_config = config;
    for (var key in config) {
      this[key] = config[key];
    }

    if (caller) {
      caller.setActivityCallee(this);
      this.activityCaller = caller;
      if (caller.frame) {
        this.containerElement = caller.frame;
      }
    }

    this.render();
    this.publish('created');
    this.open();
  };

  ActivityWindow.prototype.__proto__ = AppWindow.prototype;

  ActivityWindow.prototype.eventPrefix = 'activity';

  ActivityWindow.prototype.CLASS_NAME = 'ActivityWindow';

  ActivityWindow.prototype._transitionState = 'closed';

  // Current policy is to copy the caller's orientation.
  // So we just overwrite resize method.

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

        var orientation = manifest.orientation ||
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

  ActivityWindow.prototype._registerEvents = function acw__registerEvents() {
    this.element.
      addEventListener('animationend', this._transitionHandler.bind(this));

    this.element.addEventListener('mozbrowseractivitydone',
      this.kill.bind(this));
    this.element.addEventListener('mozbrowserclose', this.kill.bind(this));
    this.element.addEventListener('mozbrowsererror', function onError(evt) {
      if (evt.detail.type == 'fatal') {
        this.kill(evt);
      }
    }.bind(this));

    this.element.addEventListener('mozbrowserloadend',
      function activityloaded(e) {
        e.stopPropagation();
        this._loaded = true;
        e.target.removeEventListener(e.type, activityloaded, true);
        this.publish('loadtime', {
          time: parseInt(Date.now() - this.browser.element.dataset.start),
          type: 'c', // Activity is always cold booted now.
          src: this.iframe.src
        });
      }.bind(this), true);

    this.element.addEventListener('mozbrowservisibilitychange',
      function visibilitychange(e) {
        e.stopPropagation();
        var type = e.detail.visible ? 'foreground' : 'background';
        this._visibilityState = type;
        this.publish(type);
      }.bind(this));
  };

  ActivityWindow.prototype._transitionHandler =
    function acw__transitionHandler(evt) {
      evt.stopPropagation();
      if (this.element.classList.contains('opening')) {
        this.element.classList.remove('opening');
        this.element.classList.remove('slideup');
        this.publish('open');
        this._transitionState = 'opened';
        var app = this.activityCaller;
        this.setOrientation();
        // Set page visibility of focused app to false
        // once inline activity frame's transition is ended.
        // XXX: We have trouble to make all inline activity
        // openers being sent to background now,
        // because of OOM killer may kill them accidently.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=914412,
        // and https://bugzilla.mozilla.org/show_bug.cgi?id=822325.
        // So we only set browser app(in-process)'s page visibility
        // to false now to resolve 914412.
        if (app && app instanceof AppWindow && app.iframe &&
            'contentWindow' in app.iframe &&
            app.iframe.contentWindow != null) {
          app.setVisible(false);
        }
        // XXX: Move into WrapperWindow
        if (app && app instanceof AppWindow && 'wrapper' in app.frame.dataset) {
          wrapperFooter.classList.remove('visible');
          wrapperHeader.classList.remove('visible');
        }
        if (this.openCallback)
          this.openCallback();
      } else {
        this.element.classList.remove('closing');
        this.element.classList.remove('slidedown');
        this.element.classList.remove('active');
        this.publish('close');
        this._transitionState = 'closed';
        this.setVisible(false);
        if (this.closeCallback)
          this.closeCallback();
      }
    };

  ActivityWindow.prototype.kill = function acw_kill(evt) {
    if (this._killed)
      return;
    this._killed = true;
    if (evt) {
      evt.stopPropagation();
    }
    if (this.isActive()) {
      this.close(function onClose() {
        if (this._screenshotURL) {
          URL.revokeObjectURL(this._screenshotURL);
        }
        this.publish('terminated');
        // If caller is an instance of appWindow,
        // tell WindowManager to open it.
        // XXX: Call this.activityCaller.open() if open logic is done.
        if (this.activityCallee) {
          this.activityCallee.kill();
        }
        this.debug('request caller to open again');
        if (this.activityCaller instanceof ActivityWindow) {
          if (evt) {
            this.activityCaller.open();
          }
        } else if (this.activityCaller instanceof AppWindow) {
          // If we're killed by event handler, display the caller.
          if (evt) {
            // XXX: We should just request this.activityCaller.open()
            // But we won't have this method before bug 907013 landed.
            // This is also another harm by using origin to identify an app.
            if (this.activityCaller.isHomescreen) {
              WindowManager.setDisplayedApp();
            } else {
              WindowManager.setDisplayedApp(this.activityCaller.origin);
            }
          }
        } else {
          console.warn('unknown window type of activity caller.');
        }
        var e = this.containerElement.removeChild(this.element);
        this.debug('removed ' + e);
        this.publish('removed');
      }.bind(this));
    } else {
      this.publish('terminated');
      if (this.activityCallee) {
        this.activityCallee.kill();
      }
      var e = this.containerElement.removeChild(this.element);
      this.debug('removed ' + e);
      this.publish('removed');
    }
    this.debug('killed by ', evt ? evt.type : 'direct function call.');
    this.activityCaller.unsetActivityCallee();
  };

  ActivityWindow.prototype.render = function acw_render() {
    this.publish('willrender');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.browser = new BrowserFrame({
      origin: this.origin,
      url: this.url,
      name: this.name,
      manifest: this.manifest,
      manifestURL: this.manifestURL,
      window_name: 'inline' + this.instanceID,
      oop: true
    });
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
    if (window.AppModalDialog) {
      new AppModalDialog(this);
    }
    this.publish('rendered');
  };

  /**
   * ActivityWindow's default container is '#windows'.
   * However, we could dynamically change this in layout manager
   * after it recieves the activitywillrender event.
   */
  ActivityWindow.prototype.containerElement =
    document.getElementById('windows');

  // XXX: Refactor this in TransitionStateController.
  ActivityWindow.prototype.open = function acw_open(openCallback) {
    if (this._transitionState == 'opened')
      return;

    this.openCallback = openCallback;
    this.publish('willopen');
    this._transitionState = 'opening';

    if (this._visibilityState !== 'foreground') {
      this.setVisible(true);
    }
    this.element.classList.add('active');
    this.element.classList.add('slideup');
    this.element.classList.add('opening');
  };

  // XXX: Refactor this in TransitionStateController.
  ActivityWindow.prototype.close = function acw_close(closeCallback) {
    if (this._transitionState == 'closed')
      return;
    this.closeCallback = closeCallback;
    this.publish('willclose');
    this._transitionState = 'closing';
    this.restoreCaller();
    this.element.classList.add('slidedown');
    this.element.classList.add('closing');
  };

  ActivityWindow.prototype.show = function acw_show() {
    if (!this.isActive()) {
      this.element.classList.add('active');
    }
  };

  ActivityWindow.prototype.hide = function acw_hide() {
    if (this.isActive()) {
      this.element.classList.remove('active');
    }
  };

  ActivityWindow.prototype.restoreCaller = function restoreCaller() {
    var app = this.activityCaller;
    // Do nothing if app is not active.
    if (!app || !app.isActive())
      return;

    // Do not bubble the orientation lock this time.
    app.setOrientation(true);
    if (app instanceof AppWindow) {
      app.iframe.focus();
      // XXX: Refine this in AttentionWindow
      if (!AttentionScreen.isFullyVisible()) {
        app.setVisible(true);
      }
      // XXX: use app instanceof WrapperWindow instead.
      if ('wrapper' in app.frame.dataset) {
        wrapperFooter.classList.add('visible');
      }
    } else if (app instanceof ActivityWindow) {
      app.show();
      app.iframe.focus();
      // XXX: Refine this in AttentionWindow
      if (!AttentionScreen.isFullyVisible()) {
        app.setVisible(true);
      }
    }
  };

  ActivityWindow.prototype.setFrameBackground =
    function acw_setFrameBackground(frame, callback) {
      var splash = this.element.firstChild.splash;
      this.element.style.backgroundImage = 'url("' + splash + '")';
      setTimeout(callback);
    };

  ActivityWindow.prototype._transitionTimeout = 300;

  window.ActivityWindow = ActivityWindow;

}(this));
