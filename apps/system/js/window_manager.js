/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

//
// This file calls getElementById without waiting for an onload event, so it
// must have a defer attribute or be included at the end of the <body>.
//
// This module is responsible for launching apps and for allowing
// the user to switch among apps and kill apps.  Specifically, it handles:
//   launching apps,
//   killing apps
//   keeping track of the set of running apps (which we call tasks here)
//   keeping track of which task is displayed (the foreground task)
//   changing the foreground task
//   hiding all apps to display the homescreen
//   displaying the app switcher to allow the user to switch and kill apps
//   performing appropriate transition animations between:
//      the homescreen and an app
//      the homescreen and the switcher
//      an app and the homescreen
//      the switcher and the homescreen
//      the switcher and the current foreground task
//      the switcher and a different task
//   Handling Home key events to switch to the homescreen and the switcher
//
// The public API of the module is small. It defines an WindowManager object
// with these methods:
//
//    launch(origin): switch to the specified running app
//    kill(origin, callback): stop specified app
//    reload(origin): reload the given app
//    getDisplayedApp(): return the origin of the currently displayed app
//    setOrientationForApp(origin): set the phone to orientation to a given app
//    getAppFrame(origin): returns the iframe element for the specified origin
//      which is assumed to be running.  This is only currently used
//      for tests and chrome stuff: see the end of the file
//    getRunningApps(): get the app references of the running apps.
//
// TODO
// The "origin" does not actually refer to app's origin but rather a identifier
// of the app reference that one gets from |getDisplayedApp()| or
// iterates |getRunningApps|. The string is make up of the specified
// launching entry point, origin, or the website url launched by wrapper.
// It would be ideal if the variable get correctly named and it's rule is being
// properly documented.
// See https://bugzilla.mozilla.org/show_bug.cgi?id=796629
//

var WindowManager = (function() {
  'use strict';

  function debug(str) {
    dump('WindowManager: ' + str + '\n');
  }

  // Some document elements we use
  var windows = document.getElementById('windows');
  var screenElement = document.getElementById('screen');
  var wrapperHeader = document.querySelector('#wrapper-activity-indicator');
  var wrapperFooter = document.querySelector('#wrapper-footer');
  var kTransitionTimeout = 1000;

  // Set this to true to debugging the transitions and state change
  var slowTransition = false;
  if (slowTransition) {
    windows.classList.add('slow-transition');
  }

  // Requested orientation by the current running application
  var _currentSetOrientationOrigin;
  var _globalOrientation;

  // XXX: Refine this.
  window.addEventListener('globalorientationchanged', function(value) {
    _globalOrientation = value ? 'portrait-primary' : null;
    setOrientationForApp(_currentSetOrientationOrigin);
  });

  //
  // The set of running apps.
  // This is a map from app origin to an object like this:
  // {
  //    name: the app's name
  //    manifest: the app's manifest object
  //    frame: the iframe element that the app is displayed in
  //    launchTime: last time when app gets active
  // }
  //
  var runningApps = {};
  var numRunningApps = 0; // appendFrame() and removeFrame() maintain this count
  var nextAppId = 0;      // to give each app's iframe a unique id attribute

  // The origin of the currently displayed app, or null if there isn't one
  var displayedApp = null;

  // Public function. Return the origin of the currently displayed app
  // or null if there is none.
  function getDisplayedApp() {
    return displayedApp || null;
  }

  // Make the specified app the displayed app.
  // Public function.  Pass null to make the homescreen visible
  function launch(origin) {
    // If the origin is indeed valid we make that app as the displayed app.
    if (isRunning(origin)) {
      setDisplayedApp(origin);
      return;
    }

    // If the origin is null, make the homescreen visible.
    if (origin == null) {
      setDisplayedApp(HomescreenLauncher.origin);
      return;
    }

    // At this point, we have no choice but to show the homescreen.
    // We cannot launch/relaunch a given app based on the "origin" because
    // we would need the manifest URL and the specific entry point.
    console.warn('No running app is being identified as "' + origin + '". ' +
                 'Showing home screen instead.');
    setDisplayedApp(HomescreenLauncher.origin);
  }

  function isRunning(origin) {
    return runningApps.hasOwnProperty(origin);
  }

  function getAppFrame(origin) {
    if (isRunning(origin))
      return runningApps[origin].frame;
    else
      return null;
  }

  // TODO: Move into app window.
  window.addEventListener('launchapp', windowLauncher);

  // TODO: Remove this.
  function windowLauncher(e) {
    // TODO: Move into app window's attribute.
    var config = e.detail;
    // Don't need to launch system app.
    if (config.url === window.location.href)
      return;

    if (!config.isSystemMessage) {
      if (config.origin == HomescreenLauncher.origin) {
        // No need to append a frame if is homescreen
        setDisplayedApp();
      } else {
        if (!isRunning(config.origin)) {
          runningApps[config.origin] = new AppWindow(config);
        }
        console.log('alive: ', config.origin);
        // TODO: Move below iframe hack into app window.
        setDisplayedApp(config.origin);
      }
    } else {
      if (config.isActivity && config.inline) {
        // ActivityWindowFactory is dealing with this.
        return;
      }

      // If the message specifies we only have to show the app,
      // then we don't have to do anything here
      if (config.changeURL) {
        if (isRunning(config.origin)) {
          // If the app is in foreground, it's too risky to change it's
          // URL. We'll ignore this request.
          if (displayedApp !== config.origin) {
            var iframe = runningApps[config.origin].browser.element;

            // If the app is opened and it is loaded to the correct page,
            // then there is nothing to do.
            if (iframe.src !== config.url) {
              // Rewrite the URL of the app frame to the requested URL.
              // XXX: We could ended opening URls not for the app frame
              // in the app frame. But we don't care.
              iframe.src = config.url;
            }
          }
        } else if (config.origin !== HomescreenLauncher.origin) {
          // XXX: We could ended opening URls not for the app frame
          // in the app frame. But we don't care.
          var app = appendFrame(null, config.origin, config.url,
                                config.name, config.manifest,
                                config.manifestURL,
                                /* expectingSystemMessage */
                                true);

          // set the size of the iframe
          // so Cards View will get a correct screenshot of the frame
          if (config.stayBackground) {
            app.resize(false);
            app.setVisible(false);
          }
        } else {
          HomescreenLauncher.getHomescreen().ensure();
        }
      }

      // We will only bring apps to the foreground when the message
      // specifically requests it.
      if (!config.isActivity)
        return;

      var caller = runningApps[displayedApp];

      runningApps[config.origin].activityCaller = caller;
      caller.activityCallee = runningApps[config.origin];

      // XXX: the correct way would be for UtilityTray to close itself
      // when there is a appwillopen/appopen event.
      UtilityTray.hide();

      setDisplayedApp(config.origin);
    }
  };

  function getAppName(origin, manifest) {
    if (!manifest)
      return '';

    if (manifest.entry_points && manifest.type == 'certified') {
      var entryPoint = manifest.entry_points[origin.split('/')[3]];
      return new ManifestHelper(entryPoint).name;
    }
    return new ManifestHelper(manifest).name;
  }

  window.addEventListener('launchwrapper', function(evt) {
    var config = evt.detail;
    var app = runningApps[config.origin];
    if (!app) {
      var browser = new BrowserFrame(config);
      var iframe = browser.element;
      iframe.addEventListener('mozbrowserloadstart', function start() {
        iframe.dataset.loading = true;
        wrapperHeader.classList.add('visible');
      });

      iframe.addEventListener('mozbrowserloadend', function end() {
        delete iframe.dataset.loading;
        wrapperHeader.classList.remove('visible');
      });

      app = appendFrame(iframe, config.origin, config.url, config.title, {
        'name': config.title
      }, null, /* expectingSystemMessage */ false);

      // XXX: Move this into app window.
      // Set the window name in order to reuse this app if we try to open
      // a new window with same name
      app.windowName = config.windowName;
    } else {
      iframe = app.iframe;

      // XXX: Move this into app window.
      // Do not touch the name here directly.
      // Update app name for the card view
      app.manifest.name = config.title;
    }

    // XXX: Move into app window object.
    // Do not use dataset to communicate with others
    // to avoid conflict.
    iframe.dataset.name = config.title;
    iframe.dataset.icon = config.icon;

    if (config.originName)
      iframe.dataset.originName = config.originName;
    if (config.originURL)
      iframe.dataset.originURL = config.originURL;

    if (config.searchName)
      iframe.dataset.searchName = config.searchName;
    if (config.searchURL)
      iframe.dataset.searchURL = config.searchURL;

    setDisplayedApp(config.origin);
  });

  // Stop running the app with the specified origin
  function kill(origin) {
    if (!isRunning(origin)) {
      return;
    }

    var app = runningApps[origin];
    app.kill();
  }

  // Reload the frame of the running app
  function reload(origin) {
    if (!isRunning(origin))
      return;

    var app = runningApps[origin];
    app.reload();
  }

  // When a resize event occurs, resize the running app, if there is one
  // When the status bar is active it doubles in height so we need a resize
  var appResizeEvents = ['resize', 'status-active', 'status-inactive',
                         'keyboardchange', 'keyboardhide',
                         'attentionscreenhide', 'mozfullscreenchange',
                         'software-button-enabled', 'software-button-disabled'];
  appResizeEvents.forEach(function eventIterator(event) {
    window.addEventListener(event, function on(evt) {
      var keyboardHeight = KeyboardManager.getHeight();
      if (event == 'keyboardchange') {
        // Cancel fullscreen if keyboard pops
        if (document.mozFullScreen)
          document.mozCancelFullScreen();
      }
      if (displayedApp)
        runningApps[displayedApp].resize();
    });
  });

  // Return the object that holds the public API
  return {
    getDisplayedApp: function() {
      return AppWindowManager.displayedApp;
    },
    getRunningApps: function() {
      return AppWindowManager.runningApps;
    },
    setDisplayedApp: AppWindowManager.display.bind(AppWindowManager),
    getCurrentDisplayedApp: function() {
      return AppWindowManager.displayedApp;
    },
    getCachedScreenshotForApp: function(origin) {
      var app = runningApps[origin];
      if (!app)
        return null;
      return app.getCachedScreenshot();
    },
    saveScreenshotForApp: function(origin, screenshot) {
      var app = runningApps[origin];
      if (!app)
        return;
      app.saveScreenshot(screenshot);
    },
    getCurrentActiveAppWindow: function() {
      return AppWindowManager._activeApp;
    }
  };
}());
