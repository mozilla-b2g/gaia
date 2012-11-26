/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

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
  // Holds the origin of the home screen, which should be the first
  // app we launch through web activity during boot
  var homescreen = null;
  var homescreenURL = '';
  var homescreenManifestURL = '';
  var ftu = null;
  var ftuManifestURL = '';
  var ftuURL = '';
  var runningFTU = false;
  // keep the reference of inline activity frame here
  var inlineActivityFrame = null;

  // Some document elements we use
  var windows = document.getElementById('windows');
  var screenElement = document.getElementById('screen');
  var wrapperHeader = document.querySelector('#wrapper-activity-indicator');
  var wrapperFooter = document.querySelector('#wrapper-footer');

  // XXX: Unless https://bugzilla.mozilla.org/show_bug.cgi?id=808231
  // is fixed, wait for 100ms before starting the transition so
  // we will not see opening apps/homescreen flash in.
  var kTransitionWait = 100;

  // Set this to true to debugging the transitions and state change
  var slowTransition = false;
  if (slowTransition) {
    kTransitionWait = 1000;
    windows.classList.add('slow-transition');
  }

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

  // Function to hide init starting logo
  function handleInitlogo(callback) {
    var initlogo = document.getElementById('initlogo');
    initlogo.classList.add('hide');
    initlogo.addEventListener('transitionend', function delInitlogo() {
      initlogo.removeEventListener('transitionend', delInitlogo);
      initlogo.parentNode.removeChild(initlogo);
      if (callback) {
        callback();
      }
    });
  };

  // Public function. Return the origin of the currently displayed app
  // or null if there is none.
  function getDisplayedApp() {
    return displayedApp || null;
  }

  function requireFullscreen(origin) {
    var app = runningApps[origin];
    if (!app)
      return false;

    if (app.manifest.entry_points) {
      var entryPoint = app.manifest.entry_points[origin.split('/')[3]];
      if (entryPoint)
          return entryPoint.fullscreen;
      return false;
    } else {
      return app.manifest.fullscreen;
    }
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
      setDisplayedApp(homescreen);
      return;
    }

    // At this point, we have no choice but to show the homescreen.
    // We cannot launch/relaunch a given app based on the "origin" because
    // we would need the manifest URL and the specific entry point.
    console.warn('No running app is being identified as "' + origin + '". ' +
                 'Showing home screen instead.');
    setDisplayedApp(homescreen);
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
  function setAppSize(origin, changeActivityFrame) {
    var app = runningApps[origin];
    if (!app)
      return;

    var frame = app.frame;
    var manifest = app.manifest;

    var cssWidth = window.innerWidth + 'px';
    var cssHeight = window.innerHeight - StatusBar.height;
    if ('wrapper' in frame.dataset) {
      cssHeight -= 10;
    }
    cssHeight += 'px';

    if (!screenElement.classList.contains('attention') &&
        requireFullscreen(origin)) {
      cssHeight = window.innerHeight + 'px';
    }

    frame.style.width = cssWidth;
    frame.style.height = cssHeight;

    // We will call setInlineActivityFrameSize()
    // if changeActivityFrame is not explicitly set to false.
    if (changeActivityFrame !== false)
      setInlineActivityFrameSize();
  }

  // App's height is relevant to keyboard height
  function setAppHeight(keyboardHeight) {
    var app = runningApps[displayedApp];
    if (!app)
      return;

    var frame = app.frame;
    var manifest = app.manifest;

    var cssHeight =
      window.innerHeight - StatusBar.height - keyboardHeight + 'px';

    if (!screenElement.classList.contains('attention') &&
        requireFullscreen(displayedApp)) {
      cssHeight = window.innerHeight - keyboardHeight + 'px';
    }

    frame.style.height = cssHeight;

    setInlineActivityFrameSize();
  }

  // Copy the dimension of the currently displayed app
  function setInlineActivityFrameSize() {
    if (!inlineActivityFrame)
      return;

    var app = runningApps[displayedApp];
    var appFrame = app.frame;
    var frame = inlineActivityFrame;

    frame.style.width = appFrame.style.width;
    frame.style.height = appFrame.style.height;
  }

  function setFrameBackgroundBlob(frame, blob, transparent) {
    URL.revokeObjectURL(frame.dataset.bgObjectURL);
    delete frame.dataset.bgObjectURL;

    var objectURL = URL.createObjectURL(blob);
    frame.dataset.bgObjectURL = objectURL;
    var backgroundCSS =
      '-moz-linear-gradient(top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.5) 100%),' +
      'url(' + objectURL + '),' +
      ((transparent) ? 'transparent' : '#fff');

    frame.style.background = backgroundCSS;
  }

  function clearFrameBackground(frame) {
    if (!('bgObjectURL' in frame.dataset))
      return;

    URL.revokeObjectURL(frame.dataset.bgObjectURL);
    delete frame.dataset.bgObjectURL;
    frame.style.background = '';
  }

  var openFrame = null;
  var closeFrame = null;
  var openCallback = null;
  var closeCallback = null;
  var openTimer;
  var closeTimer;

  // Use setOpenFrame() to reset the CSS classes set
  // to the current openFrame (before overwriting the reference)
  function setOpenFrame(frame) {
    if (openFrame) {
      removeFrameClasses(openFrame);
    }

    openFrame = frame;
  }

  // Use setCloseFrame() to reset the CSS classes set
  // to the current closeFrame (before overwriting the reference)
  function setCloseFrame(frame) {
    if (closeFrame) {
      removeFrameClasses(closeFrame);
      // closeFrame should not be set to active
      closeFrame.classList.remove('active');
    }

    closeFrame = frame;
  }

  // Remove these visible className from frame so we will not ended
  // up having a frozen frame in the middle of the transition
  function removeFrameClasses(frame) {
    var classNames = ['opening', 'closing', 'opening-switching',
      'opening-card', 'closing-card'];

    var classList = frame.classList;

    classNames.forEach(function removeClass(className) {
      classList.remove(className);
    });
  }

  windows.addEventListener('transitionend', function frameTransitionend(evt) {
    var prop = evt.propertyName;
    var frame = evt.target;
    if (prop !== 'transform')
      return;

    var classList = frame.classList;

    if (classList.contains('inlineActivity')) {
      if (classList.contains('active')) {
        openFrame.focus();

        setOpenFrame(null);
      } else {
        windows.removeChild(frame);
      }

      return;
    }

    if (screenElement.classList.contains('switch-app')) {
      if (classList.contains('closing')) {
        classList.remove('closing');
        classList.add('closing-card');

        openFrame.classList.remove('opening-card');
        openFrame.classList.add('opening-switching');
      } else if (classList.contains('closing-card')) {
        windowClosed(frame);
        setTimeout(closeCallback);

      } else if (classList.contains('opening-switching')) {
        // If the opening app need to be full screen, switch to full screen
        if (classList.contains('fullscreen-app')) {
          screenElement.classList.add('fullscreen-app');
        }

        classList.remove('opening-switching');

        // XXX: without this setTimeout() there will be no opening transition.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=780692#c111
        setTimeout(function continueTransition() {
          classList.add('opening');
        });
      } else if (classList.contains('opening')) {
        windowOpened(frame);
        setTimeout(openCallback);

        setCloseFrame(null);
        setOpenFrame(null);
        screenElement.classList.remove('switch-app');
      }

      return;
    }

    if (classList.contains('opening')) {
      windowOpened(frame);
      setTimeout(openCallback);

      setOpenFrame(null);
    } else if (classList.contains('closing')) {
      windowClosed(frame);
      setTimeout(closeCallback);

      setCloseFrame(null);
    }
  });

  // Executes when the opening transition scale the app
  // to full size.
  function windowOpened(frame) {
    frame.classList.add('active');
    windows.classList.add('active');

    if ('wrapper' in frame.dataset) {
      wrapperFooter.classList.add('visible');
    }

    // Take the focus away from the currently displayed app
    var app = runningApps[displayedApp];
    if (app && app.frame)
      app.frame.blur();

    // Give the focus to the frame
    frame.focus();

    if (!TrustedUIManager.isVisible()) {
      // Set homescreen visibility to false
      toggleHomescreen(false);
    }

    // Set displayedApp to the new value
    displayedApp = frame.dataset.frameOrigin;

    // Set orientation for the new app
    setOrientationForApp(displayedApp);

    // Dispatch an 'appopen' event.
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appopen', true, false, { origin: displayedApp });
    frame.dispatchEvent(evt);
  }

  // Executes when app closing transition finishes.
  function windowClosed(frame) {
    // If the FTU is closing, make sure we save this state
    if (frame.src == ftuURL) {
      runningFTU = false;
      document.getElementById('screen').classList.remove('ftu');
      window.asyncStorage.setItem('ftu.enabled', false);
      // Done with FTU, letting everyone know
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('ftudone',
        /* canBubble */ true, /* cancelable */ false, {});
      window.dispatchEvent(evt);
    }

    frame.classList.remove('active');
    windows.classList.remove('active');

    // set the closed frame visibility to false
    if ('setVisible' in frame)
      frame.setVisible(false);

    screenElement.classList.remove('fullscreen-app');
  }

  // The following things needs to happen when firstpaint happens.
  // We centralize all that here but not all of them applies.
  windows.addEventListener('mozbrowserfirstpaint', function firstpaint(evt) {
    var frame = evt.target;

    // remove the unpainted flag
    delete frame.dataset.unpainted;

    setTimeout(function firstpainted() {
      // Save the screenshot
      // Remove the background only until we actually got the screenshot,
      // because the getScreenshot() call will be pushed back by
      // painting/loading in the child process; when we got the screenshot,
      // that means the app is mostly loaded.
      // (as opposed to plain white firstpaint)
      saveAppScreenshot(frame, function screenshotTaken() {
        // Remove the default background
        frame.classList.remove('default-background');

        // Remove the screenshot from frame
        clearFrameBackground(frame);
      });
    });
  });

  // setFrameBackground() will attach the screenshot background to
  // the given frame.
  // The callback could be sync or async (depend on whether we need
  // the screenshot from database or not)
  function setFrameBackground(frame, callback, transparent) {
    // If the frame is painted, or there is already background image present
    // start the transition right away.
    if (!('unpainted' in frame.dataset) ||
        ('bgObjectURL' in frame.dataset)) {
      callback();
      return;
    }

    // Get the screenshot from the database
    getAppScreenshotFromDatabase(frame.src, function(screenshot) {
      // If firstpaint is faster than database, we will not transition
      // with screenshot.
      if (!('unpainted' in frame.dataset)) {
        callback();
        return;
      }

      if (!screenshot) {
        // put a default background
        frame.classList.add('default-background');
        callback();
        return;
      }

      // set the screenshot as the background of the frame itself.
      // we are safe to do so since there is nothing on it yet.
      setFrameBackgroundBlob(frame, screenshot, transparent);

      // start the transition
      callback();
    });
  }

  // On-disk database for window manager.
  // It's only for app screenshots right now.
  var database = null;
  var DB_SCREENSHOT_OBJSTORE = 'screenshots';

  (function openDatabase() {
    var DB_VERSION = 2;
    var DB_NAME = 'window_manager';

    var req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = function() {
      console.error('Window Manager: opening database failed.');
    };
    req.onupgradeneeded = function databaseUpgradeneeded() {
      database = req.result;

      if (database.objectStoreNames.contains(DB_SCREENSHOT_OBJSTORE))
        database.deleteObjectStore(DB_SCREENSHOT_OBJSTORE);

      var store = database.createObjectStore(
          DB_SCREENSHOT_OBJSTORE, { keyPath: 'url' });
    };

    req.onsuccess = function databaseSuccess() {
      database = req.result;
    };
  })();

  function putAppScreenshotToDatabase(url, data) {
    if (!database)
      return;

    var txn = database.transaction(DB_SCREENSHOT_OBJSTORE, 'readwrite');
    txn.onerror = function() {
      console.warn(
        'Window Manager: transaction error while trying to save screenshot.');
    };
    var store = txn.objectStore(DB_SCREENSHOT_OBJSTORE);
    var req = store.put({
      url: url,
      screenshot: data
    });
    req.onerror = function(evt) {
      console.warn(
        'Window Manager: put error while trying to save screenshot.');
    };
  }

  function getAppScreenshotFromDatabase(url, callback) {
    if (!database) {
      console.warn(
        'Window Manager: Neither database nor app frame is ' +
        'ready for getting screenshot.');

      callback();
      return;
    }

    var req = database.transaction(DB_SCREENSHOT_OBJSTORE)
              .objectStore(DB_SCREENSHOT_OBJSTORE).get(url);
    req.onsuccess = function() {
      if (!req.result) {
        console.log('Window Manager: No screenshot in database. ' +
           'This is expected from a fresh installed app.');
        callback();

        return;
      }

      callback(req.result.screenshot, true);
    }
    req.onerror = function(evt) {
      console.warn('Window Manager: get screenshot from database failed.');
      callback();
    };
  }

  function deleteAppScreenshotFromDatabase(url) {
    var txn = database.transaction(DB_SCREENSHOT_OBJSTORE);
    var store = txn.objectStore(DB_SCREENSHOT_OBJSTORE);

    store.delete(url);
  }

  function getAppScreenshotFromFrame(frame, callback) {
    if (!frame) {
      callback();
      return;
    }

    var req = frame.getScreenshot(frame.offsetWidth, frame.offsetHeight);

    req.onsuccess = function gotScreenshotFromFrame(evt) {
      var result = evt.target.result;
      callback(result, false);
    };

    req.onerror = function gotScreenshotFromFrameError(evt) {
      console.warn('Window Manager: getScreenshot failed.');
      callback();
    };
  }

  // Meta method for get the screenshot from the app frame,
  // and save it to database.
  function saveAppScreenshot(frame, callback) {
    getAppScreenshotFromFrame(frame, function gotScreenshot(screenshot) {
      if (callback)
        callback(screenshot);

      if (!screenshot)
        return;

      putAppScreenshotToDatabase(frame.src || frame.dataset.frameOrigin,
                                 screenshot);
    });
  }

  // Perform an "open" animation for the app's iframe
  function openWindow(origin, callback) {
    var app = runningApps[origin];
    setOpenFrame(app.frame);

    openCallback = callback || function() {};

    // Dispatch a appwillopen event
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appwillopen', true, false, { origin: origin });
    app.frame.dispatchEvent(evt);

    // Set the frame to be visible.
    if ('setVisible' in openFrame)
      openFrame.setVisible(true);

    // set the size of the opening app
    setAppSize(origin);

    if (origin === homescreen) {
      // We cannot apply background screenshot to home screen app since
      // the screenshot is encoded in JPEG and the alpha channel is
      // not perserved. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=801676#c33
      // If that resolves,
      //   setFrameBackground(openFrame, gotBackground, true);
      // will simply work here.

      openCallback();
      windows.classList.add('active');
      openFrame.classList.add('homescreen');
      openFrame.focus();
      setOpenFrame(null);
      displayedApp = origin;

      return;
    } else if (origin === ftuURL) {
      // Add a way to identify ftu app
      // (Used by SimLock)
      openFrame.classList.add('ftu');
    }

    if (requireFullscreen(origin))
      screenElement.classList.add('fullscreen-app');

    setFrameBackground(openFrame, function gotBackground() {
      // Start the transition when this async/sync callback is called.
      openTimer = setTimeout(function startOpeningTransition() {
        if (!screenElement.classList.contains('switch-app')) {
          openFrame.classList.add('opening');
        } else {
          openFrame.classList.add('opening-card');
        }
      }, kTransitionWait);
    });
  }

  // Perform a "close" animation for the app's iframe
  function closeWindow(origin, callback) {
    var app = runningApps[origin];
    setCloseFrame(app.frame);
    closeCallback = callback || function() {};

    // Animate the window close.  Ensure the homescreen is in the
    // foreground since it will be shown during the animation.
    var homescreenFrame = ensureHomescreen();

    // invoke openWindow to show homescreen here
    openWindow(homescreen, null);

    // Take keyboard focus away from the closing window
    closeFrame.blur();

    // set orientation for homescreen app
    setOrientationForApp(homescreen);

    // Set the size of both homescreen app and the closing app
    // since the orientation had changed.
    setAppSize(homescreen);
    setAppSize(origin);

    // Send a synthentic 'appwillclose' event.
    // The keyboard uses this and the appclose event to know when to close
    // See https://github.com/andreasgal/gaia/issues/832
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appwillclose', true, false, { origin: origin });
    closeFrame.dispatchEvent(evt);

    closeTimer = setTimeout(function startClosingTransition() {
      // Start the transition
      closeFrame.classList.add('closing');
      closeFrame.classList.remove('active');
      if ('wrapper' in closeFrame.dataset) {
        wrapperHeader.classList.remove('visible');
        wrapperFooter.classList.remove('visible');
      }
    }, kTransitionWait);
  }

  // Perform a "switching" animation for the closing frame and the opening frame
  function switchWindow(origin, callback) {
    // This will trigger different transition to both openWindow()
    // and closeWindow() transition.
    screenElement.classList.add('switch-app');

    // Ask closeWindow() to start closing the displayedApp
    closeWindow(displayedApp, callback);

    // Ask openWindow() to show a card on the right waiting to be opened
    openWindow(origin);
  }

  // Ensure the homescreen is loaded and return its frame.  Restarts
  // the homescreen app if it was killed in the background.
  // Note: this function would not invoke openWindow(homescreen),
  // which should be handled in setDisplayedApp and in closeWindow()
  function ensureHomescreen(reset) {
    // If the url of the homescreen is not known at this point do nothing.
    if (!homescreen || !homescreenManifestURL) {
      return null;
    }

    if (!isRunning(homescreen)) {
      var app = Applications.getByManifestURL(homescreenManifestURL);
      appendFrame(null, homescreen, homescreenURL,
                  app.manifest.name, app.manifest, app.manifestURL);

      addWrapperListener();

    } else if (reset) {
      runningApps[homescreen].frame.src = homescreenURL;
    }

    // need to setAppSize or for the first time, or from FTU to homescreen
    // the dock position would be incorrect.
    setAppSize(homescreen);

    return runningApps[homescreen].frame;
  }

  function retrieveHomescreen(callback) {
    var lock = navigator.mozSettings.createLock();
    var setting = lock.get('homescreen.manifestURL');
    setting.onsuccess = function() {
      var app =
        Applications.getByManifestURL(this.result['homescreen.manifestURL']);

      // XXX This is a one-day workaround to not break everybody and make sure
      // work can continue.
      if (!app) {
        var tmpURL = document.location.toString()
                                      .replace('system', 'homescreen')
                                      .replace('index.html', 'manifest.webapp');
        app = Applications.getByManifestURL(tmpURL);
      }

      if (app) {
        homescreenManifestURL = app.manifestURL;
        homescreen = app.origin;
        homescreenURL = app.origin + '/index.html#root';

        callback(app);
      }
    }
  }

  // Check if the FTU was executed or not, if not, get a
  // reference to the app and launch it.
  function retrieveFTU() {
    window.asyncStorage.getItem('ftu.enabled', function getItem(launchFTU) {
      if (launchFTU === false) {
        // Eventually ask for SIM code, but only when we do not show FTU,
        // which already asks for it!
        handleInitlogo();
        SimLock.showIfLocked();
        setDisplayedApp(homescreen);
        return;
      }
      document.getElementById('screen').classList.add('ftuStarting');
      var lock = navigator.mozSettings.createLock();
      var req = lock.get('ftu.manifestURL');
      req.onsuccess = function() {
        ftuManifestURL = this.result['ftu.manifestURL'];
        if (!ftuManifestURL) {
          dump('FTU manifest cannot be found skipping.\n');
          setDisplayedApp(homescreen);
          return;
        }
        ftu = Applications.getByManifestURL(ftuManifestURL);
        if (!ftu) {
          dump('Opps, bogus FTU manifest.\n');
          setDisplayedApp(homescreen);
          return;
        }
        ftuURL = ftu.origin + ftu.manifest.entry_points['ftu'].launch_path;
        ftu.launch('ftu');
      };
    });
  }

  // Hide current app
  function hideCurrentApp(callback) {
    if (displayedApp == null || displayedApp == homescreen)
      return;

    toggleHomescreen(true);
    var frame = getAppFrame(displayedApp);
    frame.classList.add('back');
    frame.classList.remove('restored');
    if (callback) {
      frame.addEventListener('transitionend', function execCallback() {
        frame.style.visibility = 'hidden';
        frame.removeEventListener('transitionend', execCallback);
        callback();
      });
    }
  }

  function restoreCurrentApp() {
    toggleHomescreen(false);
    var frame = getAppFrame(displayedApp);
    frame.style.visibility = 'visible';
    frame.classList.remove('back');
    frame.classList.add('restored');
    frame.addEventListener('transitionend', function removeRestored() {
      frame.removeEventListener('transitionend', removeRestored);
      frame.classList.remove('restored');
    });
  }

  function toggleHomescreen(visible) {
    var homescreenFrame = ensureHomescreen();
    if (homescreenFrame)
      homescreenFrame.setVisible(visible);
  }

  // Switch to a different app
  function setDisplayedApp(origin, callback) {
    var currentApp = displayedApp, newApp = origin || homescreen;
    // Returns the frame reference of the home screen app.
    // Restarts the homescreen app if it was killed in the background.
    var homescreenFrame = ensureHomescreen();
    // Discard any existing activity
    stopInlineActivity();

    // Before starting a new transition, let's make sure current transitions
    // are stopped and the state classes are cleaned up.
    // visibility status should also be reset.
    if (openFrame && 'setVisible' in openFrame)
      openFrame.setVisible(false);
    if (closeFrame && 'setVisible' in closeFrame)
      closeFrame.setVisible(false);

    toggleHomescreen(true);
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    setOpenFrame(null);
    setCloseFrame(null);
    screenElement.classList.remove('switch-app');
    screenElement.classList.remove('fullscreen-app');

    // Case 1: the app is already displayed
    if (currentApp && currentApp == newApp) {
      if (newApp == homescreen) {
        // relaunch homescreen
        openWindow(homescreen, callback);
      } else if (callback) {
        // Just run the callback right away if it is not homescreen
        callback();
      }
    }
    // Case 2: null --> app
    else if (!currentApp && newApp != homescreen) {
      runningFTU = true;
      openWindow(newApp, function windowOpened() {
        handleInitlogo(function() {
          var mainScreen = document.getElementById('screen');
          mainScreen.classList.add('ftu');
          mainScreen.classList.remove('ftuStarting');
        });
      });
    }
    // Case 3: null->homescreen || homescreen->app
    else if ((!currentApp && newApp == homescreen) ||
             (currentApp == homescreen && newApp)) {
      openWindow(newApp, callback);
    }
    // Case 4: app->homescreen
    else if (currentApp && currentApp != homescreen && newApp == homescreen) {
      // For screenshot to catch current window size
      closeWindow(currentApp, callback);
    }
    // Case 5: app-to-app transition
    else {
      switchWindow(newApp, callback);
    }
    // Set homescreen as active,
    // to control the z-index between homescreen & keyboard iframe
    if ((newApp == homescreen) && homescreenFrame) {
      homescreenFrame.classList.add('active');
    } else {
      homescreenFrame.classList.remove('active');
    }

    // Record the time when app was launched,
    // need this to display apps in proper order on CardsView.
    // We would also need this to determined the freshness of the frame
    // for making screenshots.
    if (newApp)
      runningApps[newApp].launchTime = Date.now();

    // If the app has a attention screen open, displaying it
    AttentionScreen.showForOrigin(newApp);
  }

  function setOrientationForApp(origin) {
    if (origin == null) { // No app is currently running.
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

  var isOutOfProcessDisabled = false;
  SettingsListener.observe('debug.oop.disabled', false, function(value) {
    isOutOfProcessDisabled = value;
  });

  function createFrame(origFrame, origin, url, name, manifest, manifestURL) {
    var frame = origFrame || document.createElement('iframe');
    frame.setAttribute('mozallowfullscreen', 'true');
    frame.className = 'appWindow';
    frame.dataset.frameOrigin = origin;

    // Note that we don't set the frame size here.  That will happen
    // when we display the app in setDisplayedApp()

    if (!manifestURL) {
      frame.setAttribute('data-wrapper', 'true');
      return frame;
    }

    // Most apps currently need to be hosted in a special 'mozbrowser' iframe.
    // They also need to be marked as 'mozapp' to be recognized as apps by the
    // platform.
    frame.setAttribute('mozbrowser', 'true');

    // frames are began unpainted.
    frame.dataset.unpainted = true;

    // These apps currently have bugs preventing them from being
    // run out of process. All other apps will be run OOP.
    //
    var outOfProcessBlackList = [
      'Browser'
      // Requires nested content processes (bug 761935).  This is not
      // on the schedule for v1.
    ];

    if (!isOutOfProcessDisabled &&
        outOfProcessBlackList.indexOf(name) === -1) {
      // FIXME: content shouldn't control this directly
      frame.setAttribute('remote', 'true');
      console.info('%%%%% Launching', name, 'as remote (OOP)');
    } else {
      console.info('%%%%% Launching', name, 'as local');
    }

    frame.setAttribute('mozapp', manifestURL);
    frame.src = url;
    return frame;
  }

  function appendFrame(origFrame, origin, url, name, manifest, manifestURL) {
    // Create the <iframe mozbrowser mozapp> that hosts the app
    var frame =
        createFrame(origFrame, origin, url, name, manifest, manifestURL);
    frame.id = 'appframe' + nextAppId++;
    frame.dataset.frameType = 'window';

    // Add the iframe to the document
    windows.appendChild(frame);

    // And map the app origin to the info we need for the app
    runningApps[origin] = {
      get name() {
        var name = getAppName(origin, this.manifest);
        if (!name) {
          return this._name;
        } else {
          return name;
        }
      },
      _name: name,
      manifest: manifest,
      frame: frame,
      launchTime: 0
    };

    if (requireFullscreen(origin)) {
      frame.classList.add('fullscreen-app');
    }

    // A frame should start with visible false
    if ('setVisible' in frame)
      frame.setVisible(false);

    numRunningApps++;
  }

  function startInlineActivity(origin, url, name, manifest, manifestURL) {
    // Create the <iframe mozbrowser mozapp> that hosts the app
    var frame = createFrame(null, origin, url, name, manifest, manifestURL);
    frame.classList.add('inlineActivity');
    frame.dataset.frameType = 'inline-activity';

    // Discard any existing activity
    stopInlineActivity();

    // Save the reference
    inlineActivityFrame = frame;

    // Set the size
    setInlineActivityFrameSize();

    // Add the iframe to the document
    windows.appendChild(frame);

    // Open the frame, first, store the reference
    openFrame = frame;

    // set the frame to visible state
    openFrame.setVisible(true);

    setFrameBackground(openFrame, function gotBackground() {
      // Start the transition when this async/sync callback is called.
      openFrame.classList.add('active');
    });
  }

  function removeFrame(origin) {
    var app = runningApps[origin];
    var frame = app.frame;

    if (frame) {
      windows.removeChild(frame);
      clearFrameBackground(frame);
    }

    if (openFrame == frame) {
      setOpenFrame(null);
      setTimeout(openCallback);
    }
    if (closeFrame == frame) {
      setCloseFrame(null);
      setTimeout(closeCallback);
    }

    delete runningApps[origin];
    numRunningApps--;
  }

  function stopInlineActivity() {
    if (!inlineActivityFrame)
      return;

    // Remore the inlineActivityFrame reference
    var frame = inlineActivityFrame;
    inlineActivityFrame = null;

    // If frame is transitioning we should remove the reference
    if (openFrame == frame)
      setOpenFrame(null);

    // If frame is never set visible, we can remove the frame directly
    // without closing transition
    if (!frame.classList.contains('active')) {
      windows.removeChild(frame);

      return;
    }

    // Take keyboard focus away from the closing window
    frame.blur();

    // Give back focus to the displayed app
    var app = runningApps[displayedApp];
    if (app && app.frame)
      app.frame.focus();

    // Remove the active class and start the closing transition
    frame.classList.remove('active');
    screenElement.classList.remove('inline-activity');
  }

  // There are two types of mozChromeEvent we need to handle
  // in order to launch the app for Gecko
  window.addEventListener('mozChromeEvent', function(e) {
    var manifestURL = e.detail.manifestURL;
    if (!manifestURL)
      return;

    var app = Applications.getByManifestURL(manifestURL);
    if (!app)
      return;

    var name = app.manifest.name;
    if (app.manifest.locales &&
        app.manifest.locales[document.documentElement.lang] &&
        app.manifest.locales[document.documentElement.lang].name) {
      name = app.manifest.locales[document.documentElement.lang].name;
    }
    var origin = app.origin;

    // Check if it's a virtual app from a entry point.
    // If so, change the app name and origin to the
    // entry point.
    var entryPoints = app.manifest.entry_points;
    if (entryPoints) {
      var givenPath = e.detail.url.substr(origin.length);

      // Workaround here until the bug (to be filed) is fixed
      // Basicly, gecko is sending the URL without launch_path sometimes
      for (var ep in entryPoints) {
        var currentEp = entryPoints[ep];
        var path = givenPath;
        if (path.indexOf('?') != -1) {
          path = path.substr(0, path.indexOf('?'));
        }

        //Remove the origin and / to find if if the url is the entry point
        if (path.indexOf('/' + ep) == 0 &&
            (currentEp.launch_path == path)) {
          origin = origin + currentEp.launch_path;
          var lang = document.documentElement.lang;
          if (currentEp.locales && currentEp.locales[lang] &&
              currentEp.locales[lang].name) {
            name = currentEp.locales[lang].name;
          } else {
            name = currentEp.name;
          }
        }
      }
    }
    switch (e.detail.type) {
      // mozApps API is asking us to launch the app
      // We will launch it in foreground
      case 'webapps-launch':
        if (origin == homescreen) {
          // No need to append a frame if is homescreen
          setDisplayedApp();
        } else {
          if (!isRunning(origin)) {
            appendFrame(null, origin, e.detail.url,
                        name, app.manifest, app.manifestURL);
          }
          setDisplayedApp(origin, null, 'window');
        }
        break;
      // System Message Handler API is asking us to open the specific URL
      // that handles the pending system message.
      // We will launch it in background if it's not handling an activity.
      case 'open-app':
        // If the system message goes to System app,
        // we should not be launching that in a frame.
        if (e.detail.url === window.location.href)
          return;

        if (e.detail.isActivity && e.detail.target.disposition &&
            e.detail.target.disposition == 'inline') {
          // Inline activities behaves more like a dialog,
          // let's deal them here.

          startInlineActivity(origin, e.detail.url,
                              name, app.manifest, app.manifestURL);

          return;
        }

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
        } else if (origin !== homescreen) {
          // XXX: We could ended opening URls not for the app frame
          // in the app frame. But we don't care.
          appendFrame(null, origin, e.detail.url,
                      name, app.manifest, app.manifestURL);
        } else {
          ensureHomescreen();
        }

        // We will only bring web activity handling apps to the foreground
        if (!e.detail.isActivity) {
          // set the size of the iframe
          // so Cards View will get a correct screenshot of the frame
          setAppSize(origin, false);
          return;
        }

        // XXX: the correct way would be for UtilityTray to close itself
        // when there is a appwillopen/appopen event.
        UtilityTray.hide();

        setDisplayedApp(origin);

        break;
    }
  });

  // If the application tried to close themselves by calling window.close()
  // we will handle that here.
  // XXX: currently broken, see
  // https://bugzilla.mozilla.org/show_bug.cgi?id=789392
  window.addEventListener('mozbrowserclose', function(e) {
    if (!'frameType' in e.target.dataset)
      return;

    switch (e.target.dataset.frameType) {
      case 'window':
        kill(e.target.dataset.frameOrigin);
        break;

      case 'inline-activity':
        stopInlineActivity();
        break;
    }
  });

  // If there is a new application coming in, we should switch to
  // home screen so the user would see the icon pops up.
  window.addEventListener('applicationinstall', function(e) {
    setDisplayedApp(homescreen);
  });

  // Deal with application uninstall event
  // if the application is being uninstalled, we ensure it stop running here.
  window.addEventListener('applicationuninstall', function(e) {
    kill(e.detail.application.origin);

    deleteAppScreenshotFromDatabase(e.detail.application.origin);
  });

  function handleAppCrash(origin, manifestURL) {
    if (origin && manifestURL) {
      // When inline activity frame crashes,
      // query the localized name from manifest
      var app = Applications.getByManifestURL(manifestURL);
      CrashReporter.setAppName(getAppName(origin, app.manifest));
    } else {
      var app = runningApps[displayedApp];
      CrashReporter.setAppName(app.name);
    }
  }

  function getAppName(origin, manifest) {
    if (!manifest)
      return '';

    var lang = document.documentElement.lang;
    if (manifest.entry_points) {
      var entryPoint = manifest.entry_points[origin.split('/')[3]];
      if (entryPoint.locales && entryPoint.locales[lang] &&
          entryPoint.locales[lang].name) {
        return entryPoint.locales[lang].name;
      } else {
        return entryPoint.name;
      }
    } else if (manifest.locales && manifest.locales[lang] &&
               manifest.locales[lang].name) {
      return manifest.locales[lang].name;
    } else {
      return manifest.name;
    }
  }

  // Deal with crashed apps
  window.addEventListener('mozbrowsererror', function(e) {
    if (!'frameType' in e.target.dataset)
      return;

    var origin = e.target.dataset.frameOrigin;
    var manifestURL = e.target.getAttribute('mozapp');

    if (e.target.dataset.frameType == 'inline-activity') {
      stopInlineActivity();
      handleAppCrash(origin, manifestURL);
      return;
    }

    if (e.target.dataset.frameType !== 'window')
      return;

    /*
      detail.type = error (Server Not Found case)
      is handled in Modal Dialog
    */
    if (e.detail.type !== 'fatal')
      return;

    // If the crashing app is currently displayed, we will present
    // the user with a banner notification.
    if (displayedApp == origin)
      handleAppCrash();

    // If the crashing app is the home screen app and it is the displaying app
    // we will need to relaunch it right away.
    // Alternatively, if home screen is not the displaying app,
    // we will not relaunch it until the foreground app is closed.
    // (to be dealt in setDisplayedApp(), not here)
    if (displayedApp == homescreen) {
      kill(origin, function relaunchHomescreen() {
        setDisplayedApp(homescreen);
      });
      return;
    }

    // Actually remove the frame, and trigger the closing transition
    // if the app is currently displaying
    kill(origin);
  });

  // Add handler that deals with wrappers
  function addWrapperListener() {
    var frame = runningApps[homescreen].frame;
    frame.addEventListener('mozbrowseropenwindow', function handleWrapper(evt) {
      var detail = evt.detail;
      if (detail.name !== '_blank')
        return;
      evt.stopImmediatePropagation();

      var url = detail.url;
      if (displayedApp === url) {
        return;
      }

      if (isRunning(url)) {
        if ('loading' in runningApps[url].frame.dataset) {
          wrapperHeader.classList.add('visible');
        }
        setDisplayedApp(url);
        return;
      }

      var frameElement = detail.frameElement;
      try {
        var features = JSON.parse(detail.features);
        var regExp = new RegExp('&nbsp;', 'g');

        frameElement.dataset.name = features.name.replace(regExp, ' ') || url;
        frameElement.dataset.icon = features.icon || '';

        if (features.origin) {
          frameElement.dataset.originName =
                                  features.origin.name.replace(regExp, ' ');
          frameElement.dataset.originURL =
                                  decodeURIComponent(features.origin.url);
        }

        if (features.search) {
          frameElement.dataset.searchName =
                                  features.search.name.replace(regExp, ' ');
          frameElement.dataset.searchURL =
                                  decodeURIComponent(features.search.url);
        }
      } catch (ex) { }

      frameElement.addEventListener('mozbrowserloadstart', function start() {
        frameElement.dataset.loading = true;
        wrapperHeader.classList.add('visible');
      });

      frameElement.addEventListener('mozbrowserloadend', function end() {
        delete frameElement.dataset.loading;
        wrapperHeader.classList.remove('visible');
      });

      appendFrame(frameElement, url, url, frameElement.dataset.name, {
        'name': frameElement.dataset.name
      }, null);

      setDisplayedApp(url);
    });
  }

  // Stop running the app with the specified origin
  function kill(origin, callback) {
    if (!isRunning(origin))
      return;

    // If the app is the currently displayed app, switch to the homescreen
    if (origin === displayedApp) {
      setDisplayedApp(homescreen, function() {
        removeFrame(origin);
        if (callback)
          setTimeout(callback);
      });
    } else {
      removeFrame(origin);
    }

    // Send a synthentic 'appterminated' event.
    // Let other system app module know an app is
    // being killed, removed or crashed.
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appterminated', true, false, { origin: origin });
    window.dispatchEvent(evt);
  }

  // Reload the frame of the running app
  function reload(origin) {
    if (!isRunning(origin))
      return;

    var app = runningApps[origin];
    app.frame.reload(true);
  }

  // When a resize event occurs, resize the running app, if there is one
  // When the status bar is active it doubles in height so we need a resize
  var appResizeEvents = ['resize', 'status-active', 'status-inactive',
                         'keyboardchange', 'keyboardhide',
                         'attentionscreenhide'];
  appResizeEvents.forEach(function eventIterator(event) {
    window.addEventListener(event, function on(evt) {
      if (event == 'keyboardchange') {
        // Cancel fullscreen if keyboard pops
        if (document.mozFullScreen)
          document.mozCancelFullScreen();

        setAppHeight(evt.detail.height);
      } else if (displayedApp) {
        setAppSize(displayedApp);
      }
    });
  });

  window.addEventListener('home', function(e) {
    // If the lockscreen is active, it will stop propagation on this event
    // and we'll never see it here. Similarly, other overlays may use this
    // event to hide themselves and may prevent the event from getting here.
    // Note that for this to work, the lockscreen and other overlays must
    // be included in index.html before this one, so they can register their
    // event handlers before we do.

    // If we are currently transitioning, the user would like to cancel
    // it instead of toggling homescreen panels.
    var inTransition = !!(openFrame || closeFrame);

    if (document.mozFullScreen) {
      document.mozCancelFullScreen();
    }
    if (displayedApp !== homescreen || inTransition) {
      if (displayedApp != ftuURL) {
        setDisplayedApp(homescreen);
      } else {
        e.preventDefault();
      }
    } else {
      ensureHomescreen(true);
    }
  });

  // Cancel dragstart event to workaround
  // https://bugzilla.mozilla.org/show_bug.cgi?id=783076
  // which stops OOP home screen pannable with left mouse button on
  // B2G/Desktop.
  windows.addEventListener('dragstart', function(evt) {
    evt.preventDefault();
  }, true);

  // With all important event handlers in place, we can now notify
  // Gecko that we're ready for certain system services to send us
  // messages (e.g. the radio).
  // Note that shell.js starts listen for the mozContentEvent event at
  // mozbrowserloadstart, which sometimes does not happen till window.onload.
  window.addEventListener('load', function wm_loaded() {
    window.removeEventListener('load', wm_loaded);

    var evt = new CustomEvent('mozContentEvent',
      { bubbles: true, cancelable: false,
        detail: { type: 'system-message-listener-ready' } });
    window.dispatchEvent(evt);
  });

  // This is code copied from
  // http://dl.dropbox.com/u/8727858/physical-events/index.html
  // It appears to workaround the Nexus S bug where we're not
  // getting orientation data.  See:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=753245
  // It seems it needs to be in both window_manager.js and bootstrap.js.
  function dumbListener2(event) {}
  window.addEventListener('devicemotion', dumbListener2);

  window.setTimeout(function() {
    window.removeEventListener('devicemotion', dumbListener2);
  }, 2000);

  // Return the object that holds the public API
  return {
    isFtuRunning: function() {
      return runningFTU;
    },
    launch: launch,
    kill: kill,
    reload: reload,
    getDisplayedApp: getDisplayedApp,
    setOrientationForApp: setOrientationForApp,
    getAppFrame: getAppFrame,
    getRunningApps: function() {
      return runningApps;
    },
    setDisplayedApp: setDisplayedApp,
    getCurrentDisplayedApp: function() {
      return runningApps[displayedApp];
    },
    hideCurrentApp: hideCurrentApp,
    restoreCurrentApp: restoreCurrentApp,
    retrieveHomescreen: retrieveHomescreen,
    retrieveFTU: retrieveFTU
  };
}());
