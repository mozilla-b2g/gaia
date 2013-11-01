'use strict';

(function(window) {
  var DEBUG = true;
  var windows = document.getElementById('windows');
  var screenElement = document.getElementById('screen');
  window.AppWindowManager = {
    // backward compatibility to WindowManager
    displayedApp: null,

    runningApps: {},

    // reference to active appWindow instance.
    _activeApp: null,

    // store all alive appWindow instances.
    // note: the id is instanceID instead of origin here.
    _apps: {},

    // Switch to a different app
    display: function awm_display(origin, callback) {
      var currentApp = this.displayedApp, newApp = origin ||
        HomescreenLauncher.origin;

      screenElement.classList.remove('fullscreen-app');

      if (newApp === HomescreenLauncher.origin)
        HomescreenLauncher.getHomescreen();
      // todo 1: sim lock
      // todo 2: loadtime
      // Case 1: the app is already displayed
      if (currentApp && currentApp == newApp) {
        if (newApp == HomescreenLauncher.origin) {
          // relaunch homescreen
          HomescreenLauncher.getHomescreen().open(callback);
        } else {
          // Just run the callback right away if it is not homescreen
          if (callback) {
            callback();
          }
        }
      }
      // Case 2: null --> app
      // XXX: Fix ME!!!
      else if (this.runningApps[newApp].isFTU &&
               newApp !== HomescreenLauncher.origin) {
        this.runningApps[newApp].one('opened',
          function onOpened() {
            InitLogoHandler.animate();
          });
        this.runningApps[newApp].open();
      }
      // Case 3: null->homescreen
      else if ((!currentApp && newApp == HomescreenLauncher.origin)) {
        HomescreenLauncher.getHomescreen().open();
        this._changeActiveApp(HomescreenLauncher.origin);
      }
      // Case 4: homescreen->app
      else if ((!currentApp && newApp == HomescreenLauncher.origin) ||
               (currentApp == HomescreenLauncher.origin && newApp)) {
        this.runningApps[newApp].one('transition', 'opening',
          function onopening() {
            HomescreenLauncher.getHomescreen().close();
          });
        this.runningApps[newApp].open();
      }
      // Case 5: app->homescreen
      else if (currentApp && currentApp != HomescreenLauncher.origin &&
               newApp == HomescreenLauncher.origin) {
        this.runningApps[currentApp].one('transition', 'closing',
          function onopening() {
            HomescreenLauncher.getHomescreen().open();
          });
        this.runningApps[currentApp].close();
      }
      // Case 6: app-to-app transition
      else {
        this.publish('awmswitchingstart');
        this.runningApps[newApp].one('transition', 'opened',
          function onnewappopened() {
            this.publish('awmswitchend');
          }.bind(this));
        if (this.runningApps[newApp].loaded) {
          this.runningApps[newApp].ensureFullRepaint(function onrepaint() {
            this.runningApps[currentApp].close('invoking');
            this.runningApps[newApp].open('invoked');
          }.bind(this));
        } else {
          this.runningApps[currentApp].close('invoking');
          this.runningApps[newApp].open('invoked');
        }
      }

      // TODO: If the app has a attention screen open, displaying it
    },

    init: function awm_init() {
      if (LockScreen && LockScreen.locked) {
        windows.setAttribute('aria-hidden', 'true');
      }
      if (System.slowTransition) {
        windows.classList.add('slow-transition');
      } else {
        windows.classList.remove('slow-transition');
      }
      window.addEventListener('launchapp', this);
      window.addEventListener('home', this);
      window.addEventListener('appcreated', this);
      window.addEventListener('appterminated', this);
      window.addEventListener('ftuskip', this);
      window.addEventListener('appopened', this);
      window.addEventListener('appopening', this);
      window.addEventListener('homescreenopening', this);
      window.addEventListener('apprequestclose', this);
      window.addEventListener('apprequestopen', this);
      window.addEventListener('activityrequestopen', this);
      window.addEventListener('activityrequestclose', this);
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

      // When a resize event occurs, resize the running app, if there is one
      // When the status bar is active it doubles in height so we need a resize
      var appResizeEvents = ['resize', 'status-active', 'status-inactive',
                             'keyboardchange', 'keyboardhide',
                             'attentionscreenhide', 'mozfullscreenchange',
                             'software-button-enabled',
                             'software-button-disabled'];
      appResizeEvents.forEach(function eventIterator(event) {
        window.addEventListener(event, function on(evt) {
          var keyboardHeight = KeyboardManager.getHeight();
          if (event == 'keyboardchange') {
            // Cancel fullscreen if keyboard pops
            if (document.mozFullScreen)
              document.mozCancelFullScreen();
          }
          if (this._activeApp)
            this._activeApp.resize();
        }.bind(this));
      }, this);

      // update app name when language setting changes
      SettingsListener.observe('language.current', null,
        function(value) {
          if (!value)
              return;

          for (var id in this._apps) {
            var app = this._apps[id];
            if (!app || !app.manifest)
              continue;
            var manifest = app.manifest;
            // XXX
            app.name = new ManifestHelper(manifest).name;
          }
        }.bind(this));
    },

    handleEvent: function awm_handleEvent(evt) {
      switch (evt.type) {
        case 'appcreated':
          var app = evt.detail;
          this._apps[app.instanceID] = app;
          this.runningApps[evt.detail.origin] = app;
          break;

        case 'appterminated':
          var instanceID = evt.detail.instanceID;
          if (app.instanceID === this._activeApp.instanceID) {
            this._activeApp = null;
          }
          this._apps[instanceID] = null;
          this.runningApps[evt.detail.origin] = null;
          break;

        case 'reset-orientation':
          if (this._activeApp) {
            this._activeApp.setOrientation();
          }
          break;

        case 'ftuskip':
          InitLogoHandler.animate();
          this.display(HomescreenLauncher.origin);
          break;

        case 'appopened':
          if (!TrustedUIManager.isVisible() && !FtuLauncher.isFtuRunning()) {
            // Set homescreen visibility to false
            HomescreenLauncher.getHomescreen().setVisible(false);
          }
          break;

        case 'appopening':
          if (evt.detail.rotatingDegree === 90 ||
              evt.detail.rotatingDegree === 270) {
            HomescreenLauncher.getHomescreen().fadeOut();
          }
          this._changeActiveApp(evt.detail.origin);
          break;

        case 'homescreenopening':
          this._changeActiveApp(HomescreenLauncher.origin);
          break;

        case 'apprequestclose':
          var app = evt.detail;
          HomescreenLauncher.getHomescreen().
                           ensureFullRepaint(app._close.bind(app));
          break;

        case 'apprequestopen':
          var app = evt.detail;
          if (this.displayedApp !== HomescreenLauncher.origin) {
            // Do switch window here.
          }
          if (app.loaded) {
            app.ensureFullRepaint(app._open.bind(app));
          } else {
            // TODO
            //app.setFrameBackground(e.detail._open.bind(e.detail));

            app._open();
          }
          break;

        case 'activityrequestopen':
          var activity = evt.detail;
          activity._open();
          break;

        case 'activityrequestclose':
          var activity = evt.detail;
          activity._close();
          break;

        case 'homescreencreated':
          this.runningApps[HomescreenLauncher.origin] = evt.detail;
          break;

        case 'homescreen-changed':
          this.display();
          break;

        case 'killapp':
          if (this.runningApps[evt.detail.origin]) {
            this.runningApps[evt.detail.origin].kill();
          }
          break;

        case 'displayapp':
          this.display(evt.detail.origin);
          break;

        // Deal with application uninstall event
        // if the application is being uninstalled,
        // we ensure it stop running here.
        case 'applicationuninstall':
          if (this.runningApps[evt.detail.application.origin]) {
            this.runningApps[evt.detail.application.origin].kill();
          }
          break;

        case 'hidewindows':
          windows.setAttribute('aria-hidden', 'false');
          break;

        case 'showwindows':
          windows.setAttribute('aria-hidden', 'true');
          break;

        case 'hidewindow':
          if (this.displayedApp !== HomescreenLauncher.origin) {
            this._activeApp.setVisible(false);
          } else {
            HomescreenLauncher.getHomescreen().setVisible(false);
          }
          break;

        case 'showwindow':
          // XXX: Refine this in AttentionWindow
          if (AttentionScreen.isFullyVisible())
            return;
          if (this.displayedApp !== HomescreenLauncher.origin) {
            this._activeApp.setVisible(true);
          } else {
            HomescreenLauncher.getHomescreen().setVisible(true);
          }
          break;

        case 'overlaystart':
          // Instantly blur the frame in order to ensure hiding the keyboard
          var app = this._activeApp;
          if (app) {
            if ('contentWindow' in app.iframe &&
                app.iframe.contentWindow != null) {
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
              app.setVisible(false);
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
          if (document.mozFullScreen) {
            document.mozCancelFullScreen();
          }

          if (!this._activeApp.isHomescreen) {
            // Make sure this happens before activity frame is removed.
            // Because we will be asked by a 'activity-done' event from gecko
            // to relaunch to activity caller, and this is the only way to
            // determine if we are going to homescreen or the original app.
            this.display(HomescreenLauncher.origin);
          } else {
            // dispatch event to close activity.
            HomescreenLauncher.getHomescreen().ensure(true);
          }
          break;

        case 'launchapp':
          var config = evt.detail;
          this.debug('launching' + config.origin);

          // Don't need to launch system app.
          if (config.url === window.location.href)
            return;

          if (config.isActivity && config.inline) {
            break;
          }

          if (config.origin == HomescreenLauncher.origin) {
            // No need to append a frame if is homescreen
            this.displayedApp();
          } else {
            // The policy is we always check the same apps are already
            // opened by checking manifestURL + pageURL.
            if (!this.runningApps[config.origin]) {
              new AppWindow(config);
            }
            // TODO: Move below iframe hack into app window.
            this.display(config.origin);
          }
          break;
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

    _changeActiveApp: function awm__changeActiveApp(origin) {
      this.displayedApp = origin;
      this._activeApp = this.runningApps[this.displayedApp];
      this.debug('=== Active app now is: ', this._activeApp.name, '===');
    }
  };

  AppWindowManager.init();
}(this));
