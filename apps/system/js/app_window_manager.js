'use strict';

(function(window) {
  var DEBUG = true;
  var screenElement = document.getElementById('screen');
  window.AppWindowManager = {
    element: document.getElementById('windows'),

    // backward compatibility to WindowManager
    displayedApp: null,

    runningApps: {},

    // TODO: Remove this.
    getRunningApps: function awm_getRunningApps() {
      return this.runningApps;
    },

    getDisplayedApp: function awm_getDisplayedApp() {
      return this.displayedApp;
    },

    getActiveApp: function awm_getActiveApp() {
      return this._activeApp;
    },

    getApp: function awm_getApp(origin) {
      return this.runningApps[origin];
    },

    // reference to active appWindow instance.
    _activeApp: null,

    // store all alive appWindow instances.
    // note: the id is instanceID instead of origin here.
    _apps: {},

    // Switch to a different app
    display: function awm_display(origin, callback) {
      this.debug('displaying ' + origin);
      var currentApp = this.displayedApp, newApp = origin ||
        HomescreenLauncher.origin;

      if (newApp === HomescreenLauncher.origin) {
        HomescreenLauncher.getHomescreen();
      } else if (currentApp === null) {
        HomescreenLauncher.getHomescreen().setVisible(false);
      }

      this.debug(' current is ' + currentApp + '; next is ' + newApp);
      if (currentApp == newApp) {
        if (callback)
          callback();
        return;
      }

      var appNext = this.runningApps[newApp];
      this.debug(appNext);
      if (!appNext)
        return;

      if (document.mozFullScreen) {
        document.mozCancelFullScreen();
      }

      screenElement.classList.remove('fullscreen-app');

      var appCurrent = this.runningApps[currentApp];
      var switching = appCurrent && !appCurrent.isHomescreen &&
                      !appNext.isHomescreen;

      if (appCurrent && LayoutManager.keyboardEnabled) {
        // Ask keyboard to hide before we
        var self = this;
        window.addEventListener('keyboardhidden', function onhiddenkeyboard() {
          window.removeEventListener('keyboardhidden', onhiddenkeyboard);
          self.switchApp(appCurrent, appNext, switching);
        });
        KeyboardManager.hideKeyboard();
      } else {
        this.switchApp(appCurrent, appNext, switching);
      }
    },

    switchApp: function awm_switchApp(appCurrent, appNext, switching) {
      this.debug('before ready check');
      appNext.ready(function() {
        this.debug('ready to open/close');
        if (switching)
          HomescreenLauncher.getHomescreen().fadeOut();
        this._updateActiveApp(appNext.isHomescreen ?
          HomescreenLauncher.origin : appNext.origin);
        appNext.open((switching === true) ? 'invoked' : null);
        if (appCurrent) {
          appCurrent.close((switching === true) ? 'invoking' : null);
        } else {
          this.debug('No current running app!');
        }
      }.bind(this));
    },

    init: function awm_init() {
      if (LockScreen && LockScreen.locked) {
        this.element.setAttribute('aria-hidden', 'true');
      }
      if (System.slowTransition) {
        this.element.classList.add('slow-transition');
      } else {
        this.element.classList.remove('slow-transition');
      }
      window.addEventListener('launchapp', this);
      window.addEventListener('home', this);
      window.addEventListener('appcreated', this);
      window.addEventListener('appterminated', this);
      window.addEventListener('ftuskip', this);
      window.addEventListener('appopened', this);
      window.addEventListener('apprequestopen', this);
      window.addEventListener('apprequestclose', this);
      window.addEventListener('homescreenopened', this);
      window.addEventListener('reset-orientation', this);
      window.addEventListener('homescreencreated', this);
      window.addEventListener('homescreen-changed', this);
      // Watch chrome event that order to close an app
      window.addEventListener('killapp', this);
      // Watch for event to bring a currently-open app to the foreground.
      window.addEventListener('displayapp', this);
      // Deal with application uninstall event
      // if the application is being uninstalled,
      // we ensure it stop running here.
      window.addEventListener('applicationuninstall', this);
      window.addEventListener('hidewindows', this);
      window.addEventListener('showwindows', this);
      window.addEventListener('hidewindow', this);
      window.addEventListener('showwindow', this);
      window.addEventListener('overlaystart', this);
      window.addEventListener('homegesture-enabled', this);
      window.addEventListener('homegesture-disabled', this);
      window.addEventListener('system-resize', this);

      // update app name when language setting changes
      SettingsListener.observe('language.current', null,
        function(value) {
          if (!value)
              return;
          this.broadcastMessage('localized');
        }.bind(this));
    },

    handleEvent: function awm_handleEvent(evt) {
      switch (evt.type) {
        case 'system-resize':
          this.debug(' Resizing...');
          if (this._activeApp) {
            this.debug(' Resizing ' + this._activeApp.name);
            this._activeApp.resize();
          }
          break;

        // Dispatch internal events for navigation usage.
        // The active app's navigation needs to know homes gesture is
        // toggled to hide itself.
        case 'homegesture-disabled':
        case 'homegesture-enabled':
          this.broadcastMessage(evt.type);
          break;

        case 'appcreated':
          var app = evt.detail;
          this._apps[app.instanceID] = app;
          this.runningApps[evt.detail.origin] = app;
          break;

        case 'appterminated':
          var app = evt.detail;
          var instanceID = evt.detail.instanceID;
          if (this._activeApp &&
              app.instanceID === this._activeApp.instanceID) {
            this._activeApp = null;
          }
          delete this._apps[instanceID];
          delete this.runningApps[evt.detail.origin];
          break;

        case 'reset-orientation':
          if (this._activeApp) {
            this._activeApp.setOrientation();
          }
          break;

        case 'ftuskip':
          this.display();
          break;

        case 'appopened':
        case 'homescreenopened':
          // Someone else may open the app,
          // so we need to update active app.
          this._updateActiveApp(evt.detail.isHomescreen ?
            HomescreenLauncher.origin :
            evt.detail.origin);
          break;

        case 'homescreencreated':
          this.runningApps[HomescreenLauncher.origin] = evt.detail;
          break;

        case 'homescreen-changed':
          this.display();
          break;

        case 'killapp':
          this.kill(evt.detail.origin);
          break;

        case 'displayapp':
        case 'apprequestopen':
          this.debug(evt.type, '========>');
          this.display(evt.detail.origin);
          break;

        case 'apprequestclose':
          if (evt.detail.isActive())
            this.display();
          break;

        // Deal with application uninstall event
        // if the application is being uninstalled,
        // we ensure it stop running here.
        case 'applicationuninstall':
          this.kill(evt.detail.application.origin);
          break;

        case 'hidewindows':
          this.element.setAttribute('aria-hidden', 'true');
          break;

        case 'showwindows':
          this.element.setAttribute('aria-hidden', 'false');
          break;

        case 'hidewindow':
          if (this._activeApp &&
              this.displayedApp !== HomescreenLauncher.origin) {
            this._activeApp.setVisible(false);
          } else {
            var home = HomescreenLauncher.getHomescreen();
            home && home.setVisible(false);
          }
          break;

        case 'showwindow':
          if (this._activeApp &&
              this.displayedApp !== HomescreenLauncher.origin) {
            this._activeApp.setVisible(true);
          } else {
            var home = HomescreenLauncher.getHomescreen();
            home && home.setVisible(true);
          }
          break;

        case 'overlaystart':
          // Instantly blur the frame in order to ensure hiding the keyboard
          var app = this._activeApp;
          if (app) {
            if (app.inProcess) {
              // Bug 845661 - Attention screen does not appears when
              // the url bar input is focused.
              // Calling app.iframe.blur() on an in-process window
              // seems to triggers heavy tasks that froze the main
              // process for a while and seems to expose a gecko
              // repaint issue.
              // So since the only in-process frame is the browser app
              // let's switch it's visibility as soon as possible when
              // there is an attention screen and delegate the
              // responsibility to blur the possible focused elements
              // itself.
              app.setVisible(false, true);
            } else {
              app.blur();
            }
          }
          break;

        // If the lockscreen is active, it will stop propagation on this event
        // and we'll never see it here. Similarly, other overlays may use this
        // event to hide themselves and may prevent the event from getting here.
        // Note that for this to work, the lockscreen and other overlays must
        // be included in index.html before this one, so they can register their
        // event handlers before we do.
        case 'home':
          if (!HomescreenLauncher.ready)
            return;

          if (this._activeApp && !this._activeApp.isHomescreen) {
            // Make sure this happens before activity frame is removed.
            // Because we will be asked by a 'activity-done' event from gecko
            // to relaunch to activity caller, and this is the only way to
            // determine if we are going to homescreen or the original app.

            this.debug('back to home.');
            this.display(HomescreenLauncher.origin);
          } else {
            // dispatch event to close activity.
            this.debug('ensure home.');
            HomescreenLauncher.getHomescreen().ensure(true);
          }
          break;

        case 'launchapp':
          var config = evt.detail;
          this.debug('launching' + config.origin);
          this.launch(config);
          break;
      }
    },

    launch: function awm_launch(config) {
      // Don't need to relaunch system app.
      if (config.url === window.location.href)
        return;

      // ActivityWindowManager
      if (config.isActivity && config.inline)
        return;

      if (config.stayBackground) {
        this.debug('launching background service: ' + config.url);
        // If the message specifies we only have to show the app,
        // then we don't have to do anything here
        if (config.changeURL) {
          if (this.runningApps[config.origin]) {
            this.runningApps[config.origin].changeURL(config.url);
          } else if (config.origin !== HomescreenLauncher.origin) {
            // XXX: We could ended opening URls not for the app frame
            // in the app frame. But we don't care.
            new AppWindow(config);
          } else {
            HomescreenLauncher.getHomescreen().ensure();
          }
        }
      } else {
        if (config.origin == HomescreenLauncher.origin) {
          // No need to append a frame if is homescreen
          this.display();
        } else {
          // The policy is we always check the same apps are already
          // opened by checking manifestURL + pageURL.
          if (!this.runningApps[config.origin]) {
            new AppWindow(config);
          }
          this.display(config.origin);
        }

        // We will only bring apps to the foreground when the message
        // specifically requests it.
        if (!config.isActivity || !this._activeApp)
          return;

        var caller = this._activeApp;
        this.runningApps[config.origin].activityCaller = caller;
        caller.activityCallee = this.runningApps[config.origin];
      }
    },

    debug: function awm_debug() {
      if (DEBUG) {
        console.log('[AppWindowManager]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    kill: function awm_kill(origin) {
      if (this.runningApps[origin]) {
        this.runningApps[origin].kill();
      }
    },

    publish: function awm_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail || this);

      this.debug('publish: ' + event);
      window.dispatchEvent(evt);
    },

    _updateActiveApp: function awm__changeActiveApp(origin) {
      this.displayedApp = origin;
      this._activeApp = this.runningApps[this.displayedApp];
      this.debug(origin + this._activeApp.isFullScreen());
      if (this._activeApp.isFullScreen()) {
        screenElement.classList.add('fullscreen-app');
      } else {
        screenElement.classList.remove('fullscreen-app');
      }
      this.debug('=== Active app now is: ',
        this._activeApp.name || this._activeApp.origin, '===');
    },

    broadcastMessage: function awm_broadcastMessage(message, detail) {
      for (var id in this.runningApps) {
        this.runningApps[id].broadcast(message, detail);
      }
    }
  };

  AppWindowManager.init();
}(this));
