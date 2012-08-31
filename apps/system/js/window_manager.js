/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
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
//    launch(origin): start, or switch to the specified app
//    kill(origin): stop specified app
//    getDisplayedApp: return the origin of the currently displayed app
//    getAppFrame(origin): returns the iframe element for the specified origin
//      which is assumed to be running.  This is only currently used
//      for tests and chrome stuff: see the end of the file
//
//
// This module does not (at least not currently) have anything to do
// with the homescreen.  It simply assumes that if it hides all running
// apps the homescreen will show
//
// TODO
// It would be nice eventually to centralize much of the homescreen
// event handling code in a single place. When or if we do that, then
// this module will just expose methods for managing the list of apps
// and app visibility but will leave all the event handling to another module.
//

'use strict';

var WindowManager = (function() {
  var homescreen = null;

  // Hold Home key for 1 second to bring up the app switcher.
  // Should this be a setting?
  var kLongPressInterval = 1000;

  // Some document elements we use
  var loadingIcon = document.getElementById('statusbar-loading');
  var windows = document.getElementById('windows');
  var dialogOverlay = document.getElementById('dialog-overlay');
  var screenElement = document.getElementById('screen');

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
  var numRunningApps = 0; // start() and kill() maintain this count
  var nextAppId = 0;      // to give each app's iframe a unique id attribute

  // The origin of the currently displayed app, or null if there isn't one
  var displayedApp = null;

  // The localization of the "Loading..." message that appears while
  // an app is loading
  var localizedLoading = 'Loading...';
  window.addEventListener('localized', function() {
    localizedLoading = navigator.mozL10n.get('loading');
  });

  // Public function. Return the origin of the currently displayed app
  // or null if there is none.
  function getDisplayedApp() {
    return displayedApp || null;
  }

  // Start the specified app if it is not already running and make it
  // the displayed app.
  // Public function.  Pass null to make the homescreen visible
  function launch(origin) {
    // If it is already being displayed, do nothing
    if (displayedApp === origin)
      return;

    // If the app is already running (or there is no app), just display it
    // Otherwise, start the app
    if (!origin || isRunning(origin))
      setDisplayedApp(origin);
    else
      start(origin);

    // launch() can be called from outside the card switcher
    // hiding it if needed
    if (CardsView.cardSwitcherIsShown())
      CardsView.cardTaskSwitcher();
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

  // Set the size of the app's iframe to match the size of the screen.
  // We have to call this on resize events (which happen when the
  // phone orientation is changed). And also when an app is launched
  // and each time an app is brought to the front, since the
  // orientation could have changed since it was last displayed
  function setAppSize(origin) {
    var app = runningApps[origin];
    if (!app)
      return;

    var frame = app.frame;
    var manifest = app.manifest;

    var cssWidth = window.innerWidth + 'px';
    var cssHeight = window.innerHeight - StatusBar.height + 'px';

    if (app.manifest.fullscreen)
      cssHeight = window.innerHeight + 'px';

    frame.style.width =
      dialogOverlay.style.width = cssWidth;

    frame.style.height =
      dialogOverlay.style.height = cssHeight;
  }

  var openFrame = null;
  var closeFrame = null;
  var openCallback = null;
  var closeCallback = null;

  // Create a window sprite element to perform windows open/close
  // animations.
  var sprite = document.createElement('div');
  sprite.id = 'windowSprite';
  sprite.dataset.zIndexLevel = 'window-sprite';
  screenElement.appendChild(sprite);

  // This event handler is triggered when the transition ends.
  // We're going to do two transitions, so it gets called twice.
  sprite.addEventListener('transitionend', function spriteTransition(e) {
    var prop = e.propertyName;
    switch (sprite.className) {
      case 'opening':
        // transitionend will be called twice since we touched two properties.
        // Only responsive to the property that takes the longest to transit
        if (prop !== 'transform')
          return;

        openFrame.classList.add('active');
        windows.classList.add('active');

        sprite.className = 'opened';
        break;

      case 'opened':
        openFrame.setVisible(true);
        openFrame.focus();

        // Dispatch an 'appopen' event.
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('appopen', true, false, { origin: displayedApp });
        openFrame.dispatchEvent(evt);

        setTimeout(openCallback);

        sprite.style.background = '';
        sprite.className = '';

        break;

      case 'closing':
        closeFrame.classList.remove('active');
        windows.classList.remove('active');

        screenElement.classList.remove('fullscreen-app');

        sprite.className = 'closed';
        break;

      case 'closed':
        // transitionend will be called twice since we touched two properties.
        // Only responsive to the property that takes the longest to transit
        if (prop !== 'transform')
          return;

        setTimeout(closeCallback);

        sprite.style.background = '';
        sprite.className = '';

        break;
    }
  });

  // On-disk database for window manager.
  // It's only for app screenshots right now.
  var database = null;

  (function openDatabase() {
    var DB_VERSION = 1;
    var DB_NAME = 'window_manager';

    var req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = function() {
      console.error('Window Manager: opening database failed.');
    };
    req.onupgradeneeded = function databaseUpgradeneeded() {
      database = req.result;

      if (database.objectStoreNames.contains('screenshots'))
        database.deleteObjectStore('screenshots');

      var store =
        database.createObjectStore('screenshots', { keyPath: 'origin' });
    };

    req.onsuccess = function databaseSuccess() {
      database = req.result;
    };
  })();

  function getAppScreenshot(origin, callback) {
    if (!callback)
      return;

    var app = runningApps[origin];

    if (!app.launchTime) {
      // The frame is just being append and app content is just being loaded,
      // let's get the screenshot from the database instead.
      if (!database) {
        console.warn(
          'Window Manager: Neither database nor app frame is ' +
          'ready for getting screenshot.');

        callback();
        return;
      }

      var req = database.transaction('screenshots')
                .objectStore('screenshots').get(origin);
      req.onsuccess = function() {
        if (!req.result) {
          console.log('Window Manager: No screenshot in database. ' +
             'This is expected from a fresh installed app.');
          callback();

          return;
        }

        callback(req.result.screenshot);
      }
      req.onerror = function(evt) {
        console.warn('Window Manager: get screenshot from database failed.');
        callback();
      };

      return;
    }

    var req = app.frame.getScreenshot();

    req.onsuccess = function(evt) {
      var result = evt.target.result;
      callback(result);

      // Save the screenshot to database
      if (!database)
        return;

      var txn = database.transaction('screenshots', 'readwrite');
      txn.onerror = function() {
        console.warn(
          'Window Manager: transaction error while trying to save screenshot.');
      };
      var store = txn.objectStore('screenshots');
      var req = store.put({
        origin: origin,
        screenshot: result
      });
      req.onerror = function(evt) {
        console.warn(
          'Window Manager: put error while trying to save screenshot.');
      };

    };

    req.onerror = function(evt) {
      console.warn('Window Manager: getScreenshot failed.');
      callback();
    };
  }

  function deleteAppScreenshot(origin) {
    var txn = database.transaction('screenshots');
    var store = txn.objectStore('screenshots');

    store.delete(origin);
  }

  function afterPaint(callback) {
    window.addEventListener('MozAfterPaint', function afterPainted() {
      window.removeEventListener('MozAfterPaint', afterPainted);
      setTimeout(callback);
    });
  }

  // Perform an "open" animation for the app's iframe
  function openWindow(origin, callback) {
    var app = runningApps[origin];
    openFrame = app.frame;

    openCallback = callback || function() {};

    if (origin === homescreen) {
      openCallback();
      windows.classList.add('active');
      openFrame.classList.add('homescreen');
      openFrame.setVisible(true);
      openFrame.focus();
    } else {
      if (app.manifest.fullscreen)
        screenElement.classList.add('fullscreen-app');

      // Get the screenshot of the app and put it on the sprite
      // before starting the transition
      sprite.className = 'before-open';
      getAppScreenshot(origin, function(screenshot) {
        if (!screenshot) {
          sprite.className = 'opening';
          return;
        }

        sprite.style.background = '#fff url(' + screenshot + ')';
        // Make sure Gecko paint the sprite first
        afterPaint(function() {

          // Start the transition
          sprite.className = 'opening';
        });
      });
    }
  }

  function closeWindow(origin, callback) {
    var app = runningApps[origin];
    closeFrame = app.frame;
    closeCallback = callback || function() {};

    // Send a synthentic 'appwillclose' event.
    // The keyboard uses this and the appclose event to know when to close
    // See https://github.com/andreasgal/gaia/issues/832
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appwillclose', true, false, { origin: origin });
    closeFrame.dispatchEvent(evt);

    // Take keyboard focus away from the closing window
    closeFrame.blur();
    closeFrame.setVisible(false);

    // Get the screenshot of the app and put it on the sprite
    // before starting the transition
    sprite.className = 'before-close';
    getAppScreenshot(origin, function(screenshot) {
      sprite.style.background = '#fff url(' + screenshot + ')';
      // Make sure Gecko paint the sprite first
      afterPaint(function() {
        // Start the transition
        sprite.className = 'closing';
      });
    });
  }

  // Switch to a different app
  function setDisplayedApp(origin, callback, disposition) {
    var currentApp = displayedApp, newApp = origin;
    disposition = disposition || 'window';

    // Case 1: the app is already displayed
    if (currentApp && currentApp == newApp) {
      // Just run the callback right away
      if (callback)
        callback();
    }
    // Case 2: null->homescreen || homescreen->app
    else if ((!currentApp && newApp == homescreen) ||
             (currentApp == homescreen && newApp)) {
      setAppSize(newApp);
      openWindow(newApp, callback);
    }
    // Case 3: app->homescreen
    else if (currentApp && currentApp != homescreen && newApp == homescreen) {
      // Animate the window close
      setAppSize(newApp);
      closeWindow(currentApp, callback);
    }
    // Case 4: app-to-app transition
    else {
      setAppSize(newApp);
      closeWindow(currentApp, function closeWindow() {
        openWindow(newApp, callback);
      });
    }

    // Set homescreen as active,
    // to control the z-index between homescreen & keyboard iframe
    var homescreenFrame = runningApps[homescreen].frame;
    if ((newApp == homescreen) && homescreenFrame) {
      homescreenFrame.classList.add('active');
    } else {
      homescreenFrame.classList.remove('active');
    }

    // Lock orientation as needed
    if (newApp == null) {  // going to the homescreen, so force portrait
      screen.mozLockOrientation('portrait-primary');
    } else {
      setOrientationForApp(newApp);
    }

    // Record the time when app was launched,
    // need this to display apps in proper order on CardsView.
    // We would also need this to determined the freshness of the frame
    // for making screenshots.
    if (newApp)
      runningApps[newApp].launchTime = Date.now();

    // Set displayedApp to the new value
    displayedApp = origin;

    // Update the loading icon since the displayedApp is changed
    updateLoadingIcon();

    // If the app has a attention screen open, displaying it
    AttentionScreen.showForOrigin(origin);
  }

  function setOrientationForApp(origin) {
    if (origin == null) { // homescreen
      screen.mozLockOrientation('portrait-primary');
      return;
    }

    var app = runningApps[origin];
    if (!app)
      return;
    var manifest = app.manifest;
    if (manifest.orientation) {
      var rv = screen.mozLockOrientation(manifest.orientation);
      if (rv === false) {
        console.warn('screen.mozLockOrientation() returned false for',
                     origin, 'orientation', manifest.orientation);
      }
    }
    else {  // If no orientation was requested, then let it rotate
      screen.mozUnlockOrientation();
    }
  }

  function appendFrame(origin, url, name, manifest, manifestURL) {
    var frame = document.createElement('iframe');
    frame.id = 'appframe' + nextAppId++;
    frame.className = 'appWindow';
    frame.setAttribute('mozallowfullscreen', 'true');
    frame.dataset.frameType = 'window';
    frame.dataset.frameOrigin = origin;
    frame.src = url;

    // Note that we don't set the frame size here.  That will happen
    // when we display the app in setDisplayedApp()

    // Most apps currently need to be hosted in a special 'mozbrowser' iframe.
    // They also need to be marked as 'mozapp' to be recognized as apps by the
    // platform.
    frame.setAttribute('mozbrowser', 'true');
    frame.setAttribute('mozapp', manifestURL);

    // These apps currently have bugs preventing them from being
    // run out of process. All other apps will be run OOP.
    //
    var outOfProcessBlackList = [
      // Bugs that are shared among multiple apps are listed here.
      // Bugs that affect only specific apps should be listed under
      // the apps themselves.
      //
      // Keyboard always shows up alpha when app using keyboard is run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=776118
      // Keyboard doesn't show up correctly when app run OOP
      //   https://github.com/mozilla-b2g/gaia/issues/2656
      // Layers masking across processes doesn't work
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=783106

      'Browser',
      // Requires nested content processes (bug 761935)

      'Cost Control',
      // ?????

      'E-Mail',
      // SSL/TLS support can only happen in the main process although
      // the TCP support without security will accidentally work OOP
      // (bug 770778)

      'Homescreen',
      // - Repaints are being starved during panning (bug 761933)
      // - Homescreen needs to draw the system wallpaper itself (#3639)

      'Image Uploader',
      // Cannot upload files when OOP
      // bug 783878

      // /!\ Also remove it from outOfProcessBlackList of background_service.js
      // Once this app goes OOP. (can be done by reverting a commit)
      'Messages',
      // Crashes when launched OOP (bug 775997)

      'Settings'
      // Bluetooth is not remoted yet (bug 755943)
    ];

    if (outOfProcessBlackList.indexOf(name) === -1) {
      // FIXME: content shouldn't control this directly
      frame.setAttribute('remote', 'true');
      console.info('%%%%% Launching', name, 'as remote (OOP)');
    } else {
      console.info('%%%%% Launching', name, 'as local');
    }

    // Add the iframe to the document
    windows.appendChild(frame);

    // And map the app origin to the info we need for the app
    runningApps[origin] = {
      name: name,
      manifest: manifest,
      frame: frame,
      launchTime: 0
    };

    numRunningApps++;
  }


  // Start running the specified app.
  // In order to have a nice smooth open animation,
  // we don't actually set the iframe src property until
  // the animation has completed.
  function start(origin) {
    if (isRunning(origin))
      return;

    var app = Applications.getByOrigin(origin);

    // TODO: is the startPoint argument implemented?
    // and is it passed back to us in the webapps-launch method?
    // If so, we could use that to pass a query string or fragmentid
    // to append to the apps' URL.
    app.launch();
  }

  // There are two types of mozChromeEvent we need to handle
  // in order to launch the app for Gecko
  window.addEventListener('mozChromeEvent', function(e) {
    var origin = e.detail.origin;
    if (!origin)
      return;

    var app = Applications.getByOrigin(origin);
    if (!app)
      return;

    var name = app.manifest.name;

    // Check if it's a virtual app from a entry point.
    // If so, change the app name and origin to the
    // entry point.
    var entryPoints = app.manifest.entry_points;
    if (entryPoints) {
      for (var ep in entryPoints) {
        //Remove the origin and / to find if if the url is the entry point
        var path = e.detail.url.substr(e.detail.origin.length + 1);
        if (path.indexOf(ep) == 0 &&
            (ep + entryPoints[ep].launch_path) == path) {
          origin = origin + '/' + ep;
          name = entryPoints[ep].name;
        }
      }
    }

    switch (e.detail.type) {
      // mozApps API is asking us to launch the app
      // We will launch it in foreground
      case 'webapps-launch':
        if (!isRunning(origin)) {
          appendFrame(origin, e.detail.url,
                      name, app.manifest, app.manifestURL);
        }

        setDisplayedApp(origin, null, 'window');
        break;

      // System Message Handler API is asking us to open the specific URL
      // that handles the pending system message.
      // We will launch it in background if it's not handling an activity.
      case 'open-app':
        if (isRunning(origin)) {
          // If the app is in foreground, it's too risky to change it's
          // URL. We'll ignore this request.
          if (displayedApp !== origin) {
            var frame = getAppFrame(origin);

            // If the app is opened and it is loaded to the correct page,
            // then there is nothing to do.
            if (frame.src !== e.detail.url) {
              // Rewrite the URL of the app frame to the requested URL.
              // XXX: We could ended opening URls not for the app frame
              // in the app frame. But we don't care.
              frame.src = e.detail.url;
            }
          }
        } else {
          // XXX: We could ended opening URls not for the app frame
          // in the app frame. But we don't care.
          appendFrame(origin, e.detail.url,
                      name, app.manifest, app.manifestURL);
        }

        // If nothing is opened yet, consider the first application opened
        // as the homescreen.
        if (!homescreen) {
          homescreen = origin;
          var frame = runningApps[homescreen].frame;
          return;
        }

        // We will only bring web activity handling apps to the foreground
        // (either disposition: inline or disposition: window)
        if (!e.detail.isActivity)
          return;

        var disposition = e.detail.target.disposition || 'window';
        if (disposition == 'window')
          UtilityTray.hide();

        setDisplayedApp(origin, null, disposition);

        break;
    }
  });

  // If the application tried to close themselves by calling window.close()
  // we will handle that here
  window.addEventListener('mozbrowserclose', function(e) {
    if (!'frameType' in e.target.dataset ||
        e.target.dataset.frameType !== 'window')
      return;

    kill(e.target.dataset.frameOrigin);
  });

  // Deal with application uninstall event
  // if the application is being uninstalled, we ensure it stop running here.
  window.addEventListener('applicationuninstall', function(e) {
    kill(e.detail.application.origin);

    deleteAppScreenshot(e.detail.application.origin);
  });

  // Stop running the app with the specified origin
  function kill(origin) {
    if (!isRunning(origin))
      return;

    // If the app is the currently displayed app, switch to the homescreen
    if (origin === displayedApp)
      setDisplayedApp(homescreen);

    var app = runningApps[origin];
    windows.removeChild(app.frame);
    delete runningApps[origin];
    numRunningApps--;

  }

  // Update the loading icon on the status bar
  function updateLoadingIcon() {
    var origin = displayedApp;
    // If there aren't any origin, that means we are moving to
    // the homescreen. Let's hide the icon.
    if (!origin) {
      loadingIcon.classList.remove('app-loading');
      return;
    }

    // Actually update the icon.
    // Hide it if the loading property is not true.
    var app = runningApps[origin];

    if (app.frame.dataset.loading) {
      loadingIcon.classList.add('app-loading');
    } else {
      loadingIcon.classList.remove('app-loading');
    }
  };

  // Listen for mozbrowserloadstart to update the loading status
  // of the frames
  window.addEventListener('mozbrowserloadstart', function(e) {
    var dataset = e.target.dataset;
    // Only update frames open by ourselves
    if (!('frameType' in dataset) || dataset.frameType !== 'window')
      return;

    dataset.loading = true;

    // Update the loading icon only if this is the displayed app
    if (displayedApp == dataset.frameOrigin) {
      updateLoadingIcon();
    }
  });

  // Listen for mozbrowserloadend to update the loading status
  // of the frames
  window.addEventListener('mozbrowserloadend', function(e) {
    var dataset = e.target.dataset;
    // Only update frames open by ourselves
    if (!('frameType' in dataset) || dataset.frameType !== 'window')
      return;

    delete dataset.loading;

    // Update the loading icon only if this is the displayed app
    if (displayedApp == dataset.frameOrigin) {
      updateLoadingIcon();
    }
  });

  // When a resize event occurs, resize the running app, if there is one
  // When the status bar is active it doubles in height so we need a resize
  var appResizeEvents = ['resize', 'status-active', 'status-inactive'];
  appResizeEvents.forEach(function eventIterator(event) {
    window.addEventListener(event, function() {
      if (displayedApp)
        setAppSize(displayedApp);
    });
  });

  window.addEventListener('home', function(e) {
    // If the lockscreen is active, it will stop propagation on this event
    // and we'll never see it here. Similarly, other overlays may use this
    // event to hide themselves and may prevent the event from getting here.
    // Note that for this to work, the lockscreen and other overlays must
    // be included in index.html before this one, so they can register their
    // event handlers before we do.
    if (CardsView.cardSwitcherIsShown()) {
      CardsView.hideCardSwitcher();
    } else if (document.mozFullScreen) {
      document.mozCancelFullScreen();
    } else if (displayedApp !== homescreen) {
      setDisplayedApp(homescreen);
    } else {
      new MozActivity({
        name: 'view',
        data: {
          type: 'application/x-application-list'
        }
      });
    }
  });

  window.addEventListener('holdhome', function(e) {
    if (!LockScreen.locked &&
        !CardsView.cardSwitcherIsShown()) {
      SleepMenu.hide();
      CardsView.showCardSwitcher();
    }
  });

  // Return the object that holds the public API
  return {
    launch: launch,
    kill: kill,
    getDisplayedApp: getDisplayedApp,
    setOrientationForApp: setOrientationForApp,
    setAppSize: setAppSize,
    getAppFrame: getAppFrame,
    getNumberOfRunningApps: function() {
      return numRunningApps;
    },
    getRunningApps: function() {
       return runningApps;
    },
    setDisplayedApp: setDisplayedApp
  };
}());
