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
//    launch(origin): switch to the specified app
//    kill(origin, callback): stop specified app
//    reload(origin): reload the given app
//    getDisplayedApp(origin): return the origin of the currently displayed app
//    setOrientationForApp(origin): set the phone to orientation to a given app
//    getAppFrame(origin): returns the iframe element for the specified origin
//      which is assumed to be running.  This is only currently used
//      for tests and chrome stuff: see the end of the file
//    getNumberOfRunningApps(): returns the numbers of running apps.
//    setDisplayedApp(origin): set displayed app.
//      XXX: should be removed.
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
  // Holds the origin of the home screen, which should be the first
  // app we launch through web activity during boot
  var homescreen = null;
  var homescreenURL = '';
  var homescreenManifestURL = '';

  // Screenshot in sprite -- to use, or not to use,
  // that's the question.
  var useScreenshotInSprite = true;

  // keep the reference of inline activity frame here
  var inlineActivityFrame = null;

  // Some document elements we use
  var loadingIcon = document.getElementById('statusbar-loading');
  var windows = document.getElementById('windows');
  var screenElement = document.getElementById('screen');
  var banner = document.getElementById('system-banner');
  var bannerContainer = banner.firstElementChild;

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
    // If it is already being displayed, do nothing
    if (displayedApp === origin)
      return;

    // If the app is already running (or there is no app), just display it
    if (!origin || isRunning(origin))
      setDisplayedApp(origin);

    // launch() can be called from outside the card switcher
    // hiding it if needed
    if (CardsView.cardSwitcherIsShown())
      CardsView.hideCardSwitcher();
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

    frame.style.width = cssWidth;

    frame.style.height = cssHeight;

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
  sprite.appendChild(document.createElement('div'));

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

        // If frame is still unpainted to this point, we will have to pause
        // the transition and wait for the mozbrowserfirstpaint event.
        if ('unpainted' in openFrame.dataset) {
          openFrame.addEventListener(
            'mozbrowserfirstpaint', function continueSpriteTransition() {
              openFrame.removeEventListener(
                'mozbrowserfirstpaint', continueSpriteTransition);

              // Run getAppScreenshotFromFrame() to ensure all CSS backgrounds
              // of the apps are loaded.
              getAppScreenshotFromFrame(openFrame,
                function screenshotTaken() {
                  sprite.className = 'opened';
                });
            });

          return;
        }

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
        openFrame = null;

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
        closeFrame = null;

        break;

      case 'inline-activity-opening':
        openFrame.classList.add('active');
        screenElement.classList.add('inline-activity');

        // If frame is still unpainted to this point, we will have to pause
        // the transition and wait for the mozbrowserfirstpaint event.
        if ('unpainted' in openFrame.dataset) {
          openFrame.addEventListener(
            'mozbrowserfirstpaint', function continueSpriteTransition() {
              openFrame.removeEventListener(
                'mozbrowserfirstpaint', continueSpriteTransition);

              sprite.className = 'inline-activity-opened';
            });

          return;
        }

        sprite.className = 'inline-activity-opened';

        break;

      case 'inline-activity-opened':
        sprite.className = '';
        openFrame = null;

        break;
    }
  });

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

  function getAppScreenshotFromFrame(frame, callback, longTimeout) {
    if (!frame) {
      callback();
      return;
    }

    var req = frame.getScreenshot();

    // This serve as a workaround of
    // https://bugzilla.mozilla.org/show_bug.cgi?id=787519
    // We also use this timeout to make sure transition
    // won't stuck for too long.
    var isTimeout = false;
    var timer = setTimeout(function getScreenshotTimeout() {
      console.warn('Window Manager: getScreenshot timeout.');
      isTimeout = true;
      callback();
    }, longTimeout ? 10 * 1000 : 800);

    req.onsuccess = function(evt) {
      if (isTimeout)
        return;

      clearTimeout(timer);
      var result = evt.target.result;
      callback(result, false);
    };

    req.onerror = function(evt) {
      if (isTimeout)
        return;

      clearTimeout(timer);

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

      putAppScreenshotToDatabase(frame.src, screenshot);
    }, true);
  }

  // Meta method for getting app screenshot from database, or
  // get it from the app frame.
  function getAppScreenshot(frame, callback) {
    if (!callback || !frame)
      return;

    // If the frame is just being append and app content is just being loaded,
    // let's get the screenshot from the database instead.
    if ('unpainted' in frame.dataset) {
      getAppScreenshotFromDatabase(frame.src, callback);
      return;
    }

    getAppScreenshotFromFrame(frame, function(screenshot, isCached) {
      if (!screenshot) {
        getAppScreenshotFromDatabase(frame.src, callback);
        return;
      }

      callback(screenshot, isCached);
    });
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
      getAppScreenshot(openFrame, function(screenshot, isCached) {
        sprite.dataset.mask = isCached;

        if (!screenshot || !useScreenshotInSprite) {
          sprite.dataset.mask = false;
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
    getAppScreenshot(closeFrame, function(screenshot, isCached) {
      sprite.dataset.mask = isCached;

      if (!screenshot || !useScreenshotInSprite) {
        sprite.dataset.mask = false;
        sprite.className = 'closing';
        return;
      }

      sprite.style.background = '#fff url(' + screenshot + ')';
      // Make sure Gecko paint the sprite first
      afterPaint(function() {
        // Start the transition
        sprite.className = 'closing';
      });
    });
  }

  // Ensure the homescreen is loaded and return its frame.  Restarts
  // the homescreen app if it was killed in the background.
  function ensureHomescreen() {
    if (!isRunning(homescreen)) {
      var app = Applications.getByManifestURL(homescreenManifestURL);
      appendFrame(homescreen, homescreenURL,
                  app.manifest.name, app.manifest, app.manifestURL);
      setAppSize(homescreen);
      openWindow(homescreen, null);
    }
    return runningApps[homescreen].frame;
  }

  // Switch to a different app
  function setDisplayedApp(origin, callback) {
    var currentApp = displayedApp, newApp = origin || homescreen;

    // Returns the frame reference of the home screen app.
    // Restarts the homescreen app if it was killed in the background.
    var homescreenFrame = ensureHomescreen();

    // Discard any existing activity
    stopInlineActivity();

    // Case 1: the app is already displayed
    if (currentApp && currentApp == newApp) {
      // Just run the callback right away
      if (callback)
        callback();
    }
    // Case 2: null->homescreen || homescreen->app
    else if ((!currentApp && newApp == homescreen) ||
             (currentApp == homescreen && newApp)) {
      if (!currentApp)
        homescreenFrame.setVisible(true);
      setAppSize(newApp);

      openWindow(newApp, function windowOpened() {
        // Move the homescreen into the background only
        // after the transition completes, since it's
        // visible during the transition.
        if (currentApp)
          homescreenFrame.setVisible(false);

        if (callback)
          callback();
      });
    }
    // Case 3: app->homescreen
    else if (currentApp && currentApp != homescreen && newApp == homescreen) {
      // Animate the window close.  Ensure the homescreen is in the
      // foreground since it will be shown during the animation.
      homescreenFrame.setVisible(true);

      // For screenshot to catch current window size
      setAppSize(currentApp);

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
    displayedApp = newApp;

    // Update the loading icon since the displayedApp is changed
    updateLoadingIcon();

    // If the app has a attention screen open, displaying it
    AttentionScreen.showForOrigin(newApp);
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

  var isOutOfProcessDisabled = false;
  SettingsListener.observe('debug.oop.disabled', false, function(value) {
    isOutOfProcessDisabled = value;
  });

  function createFrame(origin, url, name, manifest, manifestURL) {
    var frame = document.createElement('iframe');
    frame.setAttribute('mozallowfullscreen', 'true');
    frame.className = 'appWindow';
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

      'Browser',
      // Requires nested content processes (bug 761935)

      'Cost Control',
      // Cross-process SMS (bug 775997)

      'E-Mail',
      // SSL/TLS support can only happen in the main process although
      // the TCP support without security will accidentally work OOP
      // (bug 770778)

      'Image Uploader',
      // Cannot upload files when OOP
      // bug 783878

      // /!\ Also remove it from outOfProcessBlackList of background_service.js
      // Once this app goes OOP. (can be done by reverting a commit)
      'Messages'
      // Crashes when launched OOP (bug 775997)
    ];

    if (!isOutOfProcessDisabled &&
        outOfProcessBlackList.indexOf(name) === -1) {
      // FIXME: content shouldn't control this directly
      frame.setAttribute('remote', 'true');
      console.info('%%%%% Launching', name, 'as remote (OOP)');
    } else {
      console.info('%%%%% Launching', name, 'as local');
    }

    return frame;
  }

  function appendFrame(origin, url, name, manifest, manifestURL) {
    // Create the <iframe mozbrowser mozapp> that hosts the app
    var frame = createFrame(origin, url, name, manifest, manifestURL);
    frame.id = 'appframe' + nextAppId++;
    frame.dataset.frameType = 'window';

    // frames are began unpainted. This dataset value will pause the
    // opening sprite transition so users will not see whitish screen.
    frame.dataset.unpainted = true;
    frame.addEventListener('mozbrowserfirstpaint', function painted() {
      frame.removeEventListener('mozbrowserfirstpaint', painted);
      delete frame.dataset.unpainted;

      // Save the screenshot when we got mozbrowserfirstpaint event,
      // regardless of the sprite transition state.
      // setTimeout() here ensures that we get the screenshot with content.
      setTimeout(function() {
        saveAppScreenshot(frame);
      });
    });

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

  function startInlineActivity(origin, url, name, manifest, manifestURL) {
    // Create the <iframe mozbrowser mozapp> that hosts the app
    var frame = createFrame(origin, url, name, manifest, manifestURL);
    frame.classList.add('inlineActivity');
    frame.dataset.frameType = 'inline-activity';

    // frames are began unpainted. This dataset value will pause the
    // opening sprite transition so users will not see whitish screen.
    frame.dataset.unpainted = true;
    frame.addEventListener('mozbrowserfirstpaint', function painted() {
      frame.removeEventListener('mozbrowserfirstpaint', painted);
      delete frame.dataset.unpainted;

      // Save the screenshot when we got mozbrowserfirstpaint event,
      // regardless of the sprite transition state.
      // setTimeout() here ensures that we get the screenshot with content.
      setTimeout(function() {
        saveAppScreenshot(inlineActivityFrame);
      });
    });

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

    // Get the screenshot of the app and put it on the sprite
    // before starting the transition
    sprite.className = 'before-inline-activity';
    getAppScreenshot(inlineActivityFrame, function(screenshot, isCached) {
      sprite.dataset.mask = isCached;

      if (!screenshot || !useScreenshotInSprite) {
        sprite.dataset.mask = false;
        sprite.className = 'inline-activity-opening';
        return;
      }

      sprite.style.background = '#fff url(' + screenshot + ')';
      // Make sure Gecko paint the sprite first
      afterPaint(function() {
        // Start the transition
        sprite.className = 'inline-activity-opening';
      });
    });
  }

  function removeFrame(origin) {
    var app = runningApps[origin];
    if (app.frame)
      windows.removeChild(app.frame);
    delete runningApps[origin];
    numRunningApps--;
  }

  function stopInlineActivity() {
    if (!inlineActivityFrame)
      return;

    var frame = inlineActivityFrame;
    inlineActivityFrame = null;

    if (openFrame == frame)
      sprite.className = '';

    if (!frame.classList.contains('active')) {
      windows.removeChild(frame);
      return;
    }

    frame.classList.remove('active');
    screenElement.classList.remove('inline-activity');

    frame.addEventListener('transitionend', function frameTransitionend() {
      frame.removeEventListener('transitionend', frameTransitionend);
      windows.removeChild(frame);
    });
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
    var manifestURL = e.detail.manifestURL;
    if (!manifestURL)
      return;

    var app = Applications.getByManifestURL(manifestURL);
    if (!app)
      return;

    var name = app.manifest.name;
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
          name = currentEp.name;
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
        if (e.detail.isActivity && e.detail.target.disposition == 'inline') {
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
          appendFrame(origin, e.detail.url,
                      name, app.manifest, app.manifestURL);
        } else {
          ensureHomescreen();
        }

        // If nothing is opened yet, consider the first application opened
        // as the homescreen.
        if (!homescreen) {
          homescreen = origin;

          // Save the entry manifest URL and launch URL so that we can restart
          // the homescreen later, if necessary.
          homescreenURL = e.detail.url;
          homescreenManifestURL = manifestURL;
          return;
        }

        // We will only bring web activity handling apps to the foreground
        if (!e.detail.isActivity)
          return;

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

  function showCrashBanner(manifestURL) {
    var app = Applications.getByManifestURL(manifestURL);
    var _ = navigator.mozL10n.get;
    banner.addEventListener('animationend', function animationend() {
      banner.removeEventListener('animationend', animationend);
      banner.classList.remove('visible');
    });
    banner.classList.add('visible');

    bannerContainer.textContent = _('foreground-app-crash-notification',
      { name: app.manifest.name });
  }

  // Deal with crashed apps
  window.addEventListener('mozbrowsererror', function(e) {
    if (!'frameType' in e.target.dataset)
      return;

    var origin = e.target.dataset.frameOrigin;
    var manifestURL = e.target.getAttribute('mozapp');

    if (e.target.dataset.frameType == 'inline-activity') {
      stopInlineActivity();
      showCrashBanner(manifestURL);
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
      showCrashBanner(manifestURL);

    // If the crashing app is the home screen app and it is the displaying app
    // we will need to relaunch it right away.
    // Alternatively, if home screen is not the displaying app,
    // we will not relaunch it until the foreground app is closed.
    // (to be dealt in setDisplayedApp(), not here)
    if (displayedApp == homescreen) {
      kill(origin, ensureHomescreen);
      return;
    }

    // Actually remove the frame, and trigger the closing transition
    // if the app is currently displaying
    kill(origin);
  });

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
  var appResizeEvents = ['resize', 'status-active', 'status-inactive',
  'keyboardchange', 'keyboardhide', 'attentionscreenshow', 'attentionscreenhide'];
  appResizeEvents.forEach(function eventIterator(event) {
    window.addEventListener(event, function on(evt) {
      if (event == 'keyboardchange') {
        if (document.mozFullScreen)
          document.mozCancelFullScreen();
        setAppHeight(evt.detail.height);
      } else if (event == 'attentionscreenshow') {
        if (document.mozFullScreen)
          document.mozCancelFullScreen();
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
    if (document.mozFullScreen) {
      document.mozCancelFullScreen();
    } else if (inlineActivityFrame) {
      stopInlineActivity();
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

  // Return the object that holds the public API
  return {
    launch: launch,
    kill: kill,
    reload: reload,
    getDisplayedApp: getDisplayedApp,
    setOrientationForApp: setOrientationForApp,
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
