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

  // Holds the origin of the home screen, which should be the first
  // app we launch through web activity during boot
  var homescreen = null;
  var homescreenURL = '';
  var homescreenManifestURL = '';
  // keep the reference of inline activity frame here
  var inlineActivityFrames = [];
  var activityCallerOrigin = '';

  var screenshots = {};

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

  // Track the audio activity.
  var normalAudioChannelActive = false;

  // When an app stops playing audio and the device is locked, we use a timer
  // in order to restore its visibility.
  var deviceLockedTimer = 0;

  if (LockScreen.locked) {
    windows.setAttribute('aria-hidden', 'true');
  }

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

  // XXX: appWindow.resize needs to call setInlineActivityFramseSize().
  // We should maintain a link in appWindow to activity frame
  // so that appWindow can resize activity by itself.
  window.addEventListener('appresize', function appResized(evt) {
    // We will call setInlineActivityFrameSize()
    // if changeActivityFrame is not explicitly set to false.
    if (evt.detail.changeActivityFrame !== false) {
      setInlineActivityFrameSize();
    }
  });

  // Copy the dimension of the currently displayed app
  function setInlineActivityFrameSize() {
    if (!inlineActivityFrames.length)
      return;

    var app = runningApps[displayedApp];
    var appFrame = app.frame;
    var frame = inlineActivityFrames[inlineActivityFrames.length - 1];

    frame.style.width = appFrame.style.width;

    if (document.mozFullScreen) {
      frame.style.height = window.innerHeight + 'px';
      frame.style.top = '0px';
    } else {
      if ('wrapper' in appFrame.dataset) {
        frame.style.height = window.innerHeight -
          StatusBar.height - SoftwareButtonManager.height + 'px';
      } else {
        frame.style.height = appFrame.style.height;
      }
      frame.style.top = appFrame.offsetTop + 'px';
    }
  }

  var openFrame = null;
  var closeFrame = null;
  var openCallback = null;
  var closeCallback = null;
  var transitionOpenCallback = null;
  var transitionCloseCallback = null;

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
      windowClosed(closeFrame);
      removeFrameClasses(closeFrame);
    }

    closeFrame = frame;
  }

  var classNames = ['opening', 'closing'];

  // Remove these visible className from frame so we will not ended
  // up having a frozen frame in the middle of the transition
  function removeFrameClasses(frame) {
    var classList = frame.classList;

    classNames.forEach(function removeClass(className) {
      classList.remove(className);
    });
  }

  window.addEventListener('ftuskip', function skipFTU() {
    InitLogoHandler.animate();
    setDisplayedApp(homescreen);
  });

  // Open and close app animations
  windows.addEventListener('animationend', function frameAnimationend(evt) {
    var animationName = evt.animationName;
    var frame = evt.target;

    if (animationName.indexOf('openApp') !== -1) {
      windowScaled(frame);

      var onWindowReady = function() {
        windowOpened(frame);

        setTimeout(openCallback);
        openCallback = null;
        setOpenFrame(null);
      };

      // If this is a cold launch let's wait for the app to load first
      var iframe = openFrame.firstChild;
      if ('unloaded' in iframe.dataset) {
        if ('wrapper' in frame.dataset)
          wrapperFooter.classList.add('visible');

        iframe.addEventListener('mozbrowserloadend', function onloaded(e) {
          iframe.removeEventListener('mozbrowserloadend', onloaded);
          onWindowReady();
        });
      } else {
        onWindowReady();
      }
    } else if (animationName.indexOf('closeApp') !== -1) {
      windowClosed(frame);

      setTimeout(closeCallback);
      closeCallback = null;

      setCloseFrame(null);
    } else if (animationName === 'invokingApp') {
      windowClosed(frame);
      setTimeout(closeCallback);
      closeCallback = null;

      if (openFrame && openFrame.classList.contains('fullscreen-app')) {
        screenElement.classList.add('fullscreen-app');
      }
    } else if (animationName === 'invokedApp') {
      windowScaled(frame);
      windowOpened(frame);

      setTimeout(openCallback);
      openCallback = null;

      setCloseFrame(null);
      setOpenFrame(null);
      screenElement.classList.remove('switch-app');
     }
  });

  windows.addEventListener('transitionend', function frameTransitionend(evt) {
    var prop = evt.propertyName;
    var frame = evt.target;
    if (prop !== 'transform')
      return;

    var classList = frame.classList;

    if (classList.contains('inlineActivity')) {
      if (classList.contains('active')) {
        if (openFrame)
          openFrame.firstChild.focus();

        setOpenFrame(null);
      } else {
        windows.removeChild(frame);
      }
    }
  });

  // Executes when the opening transition scale the app
  // to full size.
  function windowScaled(frame) {
    var iframe = frame.firstChild;

    // Set displayedApp to the new value
    displayedApp = iframe.dataset.frameOrigin;

    var app = runningApps[displayedApp];

    app.addClearRotateTransition();
    // Set orientation for the new app
    setOrientationForApp(displayedApp);

  }

  // Execute when the application is actually loaded
  function windowOpened(frame) {
    var iframe = frame.firstChild;

    if (displayedApp == iframe.dataset.frameOrigin) {
      windows.classList.add('active');
      frame.classList.add('active');

      if ('wrapper' in frame.dataset) {
        wrapperFooter.classList.add('visible');
      }

      // Take the focus away from the currently displayed app
      var app = runningApps[displayedApp];
      if (app && app.iframe)
        app.iframe.blur();

      if (!TrustedUIManager.isVisible() && !FtuLauncher.isFtuRunning()) {
        // Set homescreen visibility to false
        toggleHomescreen(false);
      }

      // Give the focus to the frame
      iframe.focus();

      waitForNextPaint(frame, function makeWindowActive() {
        frame.classList.add('render');
      });
    }

    // Dispatch an 'appopen' event.
    var manifestURL = runningApps[displayedApp].manifestURL;
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appopen', true, false, {
      manifestURL: manifestURL,
      origin: displayedApp,
      isHomescreen: (manifestURL === homescreenManifestURL)
    });
    iframe.dispatchEvent(evt);
  }

  // Executes when app closing transition finishes.
  function windowClosed(frame) {
    var iframe = frame.firstChild;
    var origin = iframe.dataset.frameOrigin;

    frame.classList.remove('active');
    windows.classList.remove('active');

    runningApps[origin].addClearRotateTransition();

    // set the closed frame visibility to false

    // XXX: After bug 822325 is fixed in gecko,
    // we don't need to check trusted ui state here anymore.
    // We do this because we don't want the trustedUI opener
    // is killed in background due to OOM.
    if ('setVisible' in iframe && !TrustedUIManager.hasTrustedUI(origin)) {
      // When we setVisible(false) the app frame, it throws out its
      // layer tree, which results in it not being renderable by the
      // compositor.  If that happens before we repaint our tree
      // without the white app background, then we can see a flicker
      // of white due to the race condition.
      //
      // What we /really/ want to do here is install an AfterPaint
      // listener for the system app frame and then setVisible(false)
      // the app from the next notification.  But AfterPaint isn't
      // available to content, so we use a hack here.
      //
      // (The mozbrowser nextpaint event would equivalently fix this,
      // but the system app can't get a reference to its outer frame
      // element so that doesn't work either.)
      //
      // The "real" fix for this defect is tracked in bug 842102.
      var request = iframe.getScreenshot(frame.clientWidth,
                                         frame.clientHeight);
      request.onsuccess = function(e) {
        if (e.target.result) {
          screenshots[origin] = URL.createObjectURL(e.target.result);
        }

        iframe.setVisible(false);
      };

      request.onerror = function() {
        iframe.setVisible(false);
      };
    }

    // Inform keyboardmanager that we've finished the transition
    dispatchEvent(new CustomEvent('appclose'));
  }

  windows.addEventListener('mozbrowserloadend', function loadend(evt) {
    var iframe = evt.target;
    delete iframe.dataset.unloaded;
    var backgroundColor = evt.detail.backgroundColor;
    /* When rotating the screen, the child may take some time to reflow.
     * If the child takes longer than layers.orientation.sync.timeout
     * to respond, gecko will go ahead and draw anyways. This code
     * uses a simple heuristic to guess the least distracting color
     * we should draw in the blank space. */

    /* Only allow opaque colors */
    if (backgroundColor.indexOf('rgb(') != -1) {
      iframe.style.backgroundColor = backgroundColor;
    }
  });

  windows.addEventListener('mozbrowservisibilitychange',
    function visibilitychange(e) {
      var target = e.target;

      var type = e.detail.visible ? 'foreground' : 'background';
      var detail = { manifestURL: target.getAttribute('mozapp') };
      var evt = new CustomEvent(type, { detail: detail, bubbles: true });
      target.dispatchEvent(evt);
    }
  );

  // setFrameBackground() will attach the manifest icon as a background
  function setFrameBackground(frame, callback) {
    var splash = frame.firstChild.splash;
    frame.style.backgroundImage = 'url("' + splash + '")';
    setTimeout(callback);
  }

  function noop() {
    // Do nothing
  }

  // Perform an "open" animation for the app's iframe
  function openWindow(origin, callback, preCallback) {
    var app = runningApps[origin];
    setOpenFrame(app.frame);

    openCallback = callback || noop;
    preCallback = preCallback || noop;

    // set the size of the opening app
    app.resize();

    if (origin === homescreen) {
      // Call the openCallback only once. We have to use tmp var as
      // openCallback can be a method calling the callback
      // (like the `removeFrame` callback in `kill()` ).
      var tmpCallback = openCallback;
      openCallback = null;
      tmpCallback();

      windows.classList.add('active');
      openFrame.classList.add('homescreen');
      openFrame.firstChild.focus();
      setOpenFrame(null);
      displayedApp = origin;

      return;
    }

    if (app.isFullScreen())
      screenElement.classList.add('fullscreen-app');

    app.setRotateTransition(app.manifest.orientation);

    transitionOpenCallback = function startOpeningTransition() {
      // We have been canceled by another transition.
      if (!openFrame || transitionOpenCallback != startOpeningTransition)
        return;

      // Make sure we're not called twice.
      transitionOpenCallback = null;

      preCallback();
      openFrame.classList.add('opening');
    };

    if ('unloaded' in openFrame.firstChild.dataset) {
      setFrameBackground(openFrame, transitionOpenCallback);
    } else {
      waitForNextPaint(openFrame, transitionOpenCallback);
    }

    // Set the frame to be visible.
    if ('setVisible' in openFrame.firstChild) {
      if (!AttentionScreen.isFullyVisible()) {
        openFrame.firstChild.setVisible(true);
      } else {
        // If attention screen is fully visible now,
        // don't give the open frame visible.
        // This is the case that homescreen is restarted behind attention screen

        // XXX: After bug 822325 is fixed in gecko,
        // we don't need to check trusted ui state here anymore.
        // We do this because we don't want the trustedUI opener
        // is killed in background due to OOM.
        if (!TrustedUIManager.hasTrustedUI(
            openFrame.firstChild.dataset.frameOrigin))
          openFrame.firstChild.setVisible(false);
      }
    }
  }

  function waitForNextPaint(frame, callback) {
    function onNextPaint() {
      clearTimeout(timeout);
      callback();
    }

    var iframe = frame.firstChild;

    // Register a timeout in case we don't receive
    // nextpaint in an acceptable time frame.
    var timeout = setTimeout(function() {
      if ('removeNextPaintListener' in iframe)
        iframe.removeNextPaintListener(onNextPaint);
      callback();
    }, kTransitionTimeout);

    if ('addNextPaintListener' in iframe)
      iframe.addNextPaintListener(onNextPaint);
  }

  function closeAnimation() {
    closeFrame.classList.remove('active');
    closeFrame.classList.add('closing');
  }

  // Perform a "close" animation for the app's iframe
  function closeWindow(origin, callback, ready) {
    var app = runningApps[origin];
    setCloseFrame(app.frame);
    closeCallback = callback || noop;
    ready = ready || noop;

    var onSwitchWindow = isSwitchWindow();

    var homescreenFrame;

    if (!onSwitchWindow) {
      // Animate the window close.  Ensure the homescreen is in the
      // foreground since it will be shown during the animation.
      homescreenFrame = ensureHomescreen();

      // invoke openWindow to show homescreen here
      openWindow(homescreen, null);

      // set orientation for homescreen app
      setOrientationForApp(homescreen);

      // Set the size of both homescreen app and the closing app
      // since the orientation had changed.
      runningApps[homescreen].resize();

      app.setRotateTransition();
    }

    // Send a synthentic 'appwillclose' event.
    // The keyboard uses this and the appclose event to know when to close
    // See https://github.com/andreasgal/gaia/issues/832
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appwillclose', true, false, { origin: origin });
    closeFrame.dispatchEvent(evt);

    transitionCloseCallback = function startClosingTransition() {
      // Remove the wrapper and reset the homescreen to a normal state
      if (wrapperFooter.classList.contains('visible')) {
        wrapperHeader.classList.remove('visible');
        wrapperFooter.classList.remove('visible');
      }

      // We have been canceled by another transition.
      if (!closeFrame || transitionCloseCallback != startClosingTransition) {
        setTimeout(closeCallback);
        closeCallback = null;
        return;
      }

      // Make sure we're not called twice.
      transitionCloseCallback = null;

      ready();

      // Start the transition
      if (!onSwitchWindow) {
        closeAnimation();
        homescreenFrame.classList.add('zoom-out');
      }
    };

    onSwitchWindow ? transitionCloseCallback() :
                     waitForNextPaint(homescreenFrame, transitionCloseCallback);
  }

  function isSwitchWindow() {
    return screenElement.classList.contains('switch-app');
  }

  // Perform a "switching" animation for the closing frame and the opening frame
  function switchWindow(origin, callback) {
    // This will trigger different transition to both openWindow()
    // and closeWindow() transition.
    screenElement.classList.add('switch-app');

    // Ask closeWindow() to start closing the displayedApp
    closeWindow(displayedApp, callback, function ready() {
      // Ask openWindow() to show a card on the left waiting to be opened
      openWindow(origin, noop, closeAnimation);
    });
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
                  app.manifest.name, app.manifest, app.manifestURL,
                  /* expectingSystemMessage */ false);
      runningApps[homescreen].iframe.dataset.start = Date.now();
      runningApps[homescreen].resize();
      if (displayedApp != homescreen &&
        'setVisible' in runningApps[homescreen].iframe)
        runningApps[homescreen].iframe.setVisible(false);
    } else if (reset) {
      runningApps[homescreen].iframe.src = homescreenURL + Date.now();
      runningApps[homescreen].resize();
    }

    return runningApps[homescreen].frame;
  }

  navigator.mozSettings.addObserver('homescreen.manifestURL', function(event) {
    kill(homescreen);
    retrieveHomescreen(function() {
      setDisplayedApp(homescreen);
    });
  });

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

      // Dispatch an event here for battery check.
      window.dispatchEvent(new CustomEvent('homescreen-ready'));
    };
  }

  function toggleHomescreen(visible) {
    var homescreenFrame = ensureHomescreen();
    if (homescreenFrame)
      runningApps[homescreen].setVisible(visible);
  }

  // This is an event listener which listens to an iframe's 'mozbrowserloadend'
  // and 'appopen' events.  We don't declare it inside another function so as
  // to ensure that it doesn't accidentally keep anything alive.
  function appLoadedHandler(e)
  {
    if (e.type != 'appopen' && e.type != 'mozbrowserloadend') {
      return;
    }

    var iframe = e.target;
    if (iframe.dataset.enableAppLoaded != e.type) {
      return;
    }

    iframe.dataset.enableAppLoaded = undefined;

    // * type == 'w' indicates a warm start (the app was already running; we
    //   just transitioned to it)
    // * type == 'c' indicates a cold start (the app process wasn't already
    //   running)

    var doc = e.target.ownerDocument;
    var evt = doc.createEvent('CustomEvent');
    evt.initCustomEvent('apploadtime', true, false, {
      time: parseInt(Date.now() - iframe.dataset.start),
      type: (e.type == 'appopen') ? 'w' : 'c'
    });
    iframe.dispatchEvent(evt);
  }

  // Switch to a different app
  function setDisplayedApp(origin, callback) {
    var currentApp = displayedApp, newApp = origin || homescreen;

    var homescreenFrame = null;
    // Returns the frame reference of the home screen app.
    // Restarts the homescreen app if it was killed in the background.
    homescreenFrame = ensureHomescreen();
    homescreenFrame.classList.remove('zoom-in');
    homescreenFrame.classList.remove('zoom-out');

    // Cancel transitions waiting to be started.
    transitionOpenCallback = null;
    transitionCloseCallback = null;

    // Discard any existing activity
    stopInlineActivity(true);

    // Cancel fullscreen
    if (document.mozFullScreen)
      document.mozCancelFullScreen();

    // Before starting a new transition, let's make sure current transitions
    // are stopped and the state classes are cleaned up.
    // visibility status should also be reset.
    if (openFrame && 'setVisible' in openFrame.firstChild) {
      // XXX: After bug 822325 is fixed in gecko,
      // we don't need to check trusted ui state here anymore.
      // We do this because we don't want the trustedUI opener
      // is killed in background due to OOM.
      if (!TrustedUIManager.hasTrustedUI(
            openFrame.firstChild.dataset.frameOrigin))
        openFrame.firstChild.setVisible(false);
    }

    if (closeFrame && 'setVisible' in closeFrame.firstChild) {
      // XXX: After bug 822325 is fixed in gecko,
      // we don't need to check trusted ui state here anymore.
      // We do this because we don't want the trustedUI opener
      // is killed in background due to OOM.
      if (!TrustedUIManager.hasTrustedUI(
            closeFrame.firstChild.dataset.frameOrigin)) {
        closeFrame.firstChild.setVisible(false);
      }
    }

    if (newApp == homescreen && !AttentionScreen.isFullyVisible()) {
      toggleHomescreen(true);
    }

    setOpenFrame(null);
    setCloseFrame(null);
    screenElement.classList.remove('switch-app');
    screenElement.classList.remove('fullscreen-app');

    // Dispatch an appwillopen event only when we open an app
    if (newApp != currentApp) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('appwillopen', true, true, {
        origin: newApp,
        isHomescreen: (newApp === homescreen)
      });

      var app = runningApps[newApp];
      // Allows listeners to cancel app opening and so stay on homescreen
      if (!app.iframe.dispatchEvent(evt)) {
        if (callback) {
          callback();
        }
        return;
      }

      var iframe = app.iframe;

      // Set iframe.dataset.enableAppLoaded so that the iframe's
      // mozbrowserloadend or appopen event listener (appLoadedHandler) can
      // run.
      //
      // |unpainted in iframe.dataset| means that the app is cold booting.  If
      // it is, we listen for Browser API's loadend event, which is fired when
      // the iframe's document load finishes.
      //
      // If the app is not cold booting (its process is alive), we listen to
      // the appopen event, which is fired when the transition to the app
      // window completes.

      if ('unloaded' in iframe.dataset) {
        iframe.dataset.enableAppLoaded = 'mozbrowserloadend';
      } else {
        iframe.dataset.start = Date.now();
        iframe.dataset.enableAppLoaded = 'appopen';
      }
    }

    // Case 1: the app is already displayed
    if (currentApp && currentApp == newApp) {
      if (newApp == homescreen) {
        // relaunch homescreen
        openWindow(homescreen, callback);
      } else {
        if (runningApps[newApp].isFullScreen()) {
          screenElement.classList.add('fullscreen-app');
        }

        // Just run the callback right away if it is not homescreen
        if (callback) {
          callback();
        }
      }
    }
    // Case 2: null --> app
    else if (FtuLauncher.isFtuRunning() && newApp !== homescreen) {
      openWindow(newApp, function windowOpened() {
        InitLogoHandler.animate(callback);
      });
    }
    // Case 3: null->homescreen
    else if ((!currentApp && newApp == homescreen)) {
      openWindow(newApp, callback);
    }
    // Case 4: homescreen->app
    else if ((!currentApp && newApp == homescreen) ||
             (currentApp == homescreen && newApp)) {
      var zoomInPreCallback = function() {
        homescreenFrame.classList.add('zoom-in');
      };
      var zoomInCallback = function() {
        homescreenFrame.classList.remove('zoom-in');
        if (callback) {
          callback();
        }
      };
      openWindow(newApp, zoomInCallback, zoomInPreCallback);
    }
    // Case 5: app->homescreen
    else if (currentApp && currentApp != homescreen && newApp == homescreen) {
      var zoomOutCallback = function() {
        homescreenFrame.classList.remove('zoom-out');
        if (callback) {
          callback();
        }
      };
      closeWindow(currentApp, zoomOutCallback);
    }
    // Case 6: app-to-app transition
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
    if (newApp)
      runningApps[newApp].launchTime = Date.now();

    // If the app has a attention screen open, displaying it
    AttentionScreen.showForOrigin(newApp);
  }

  function setOrientationForInlineActivity(frame) {
    if ('orientation' in frame.dataset) {
      screen.mozLockOrientation(frame.dataset.orientation);
    } else {  // If no orientation was requested, then let it rotate
      screen.mozUnlockOrientation();
    }
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

    var orientation = manifest.orientation;
    if (orientation) {
      if (!Array.isArray(orientation)) {
        orientation = [orientation];
      }
      var rv = screen.mozLockOrientation.apply(screen, orientation);
      if (rv === false) {
        console.warn('screen.mozLockOrientation() returned false for',
                     origin, 'orientation', orientation);
        // Prevent breaking app size on desktop since we've resized landscape
        // apps for transition.
        if (app.frame.dataset.orientation == 'landscape-primary' ||
            app.frame.dataset.orientation == 'landscape-secondary' ||
            app.currentOrientation == 'landscape-primary' ||
            app.currentOrientation == 'landscape-secondary') {
          app.resize();
        }
      }
    } else {  // If no orientation was requested, then let it rotate
      screen.mozUnlockOrientation();
    }
  }

  // update app name when language setting changes
  SettingsListener.observe('language.current', null,
    function(value) {
      if (!value)
          return;

      for (var origin in runningApps) {
        var app = runningApps[origin];
        if (!app || !app.manifest)
          continue;
        var manifest = app.manifest;
        app.name = new ManifestHelper(manifest).name;
      }
    });

  function createFrame(origFrame, origin, url, name, manifest, manifestURL) {
    var browser_config = {
      origin: origin,
      url: url,
      name: name,
      manifest: manifest,
      manifestURL: manifestURL,
      isHomescreen: (origin === homescreen)
    };

    // TODO: Move into browser configuration helper.
    // These apps currently have bugs preventing them from being
    // run out of process. All other apps will be run OOP.
    //
    var host = document.location.host;
    var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
    var protocol = document.location.protocol + '//';
    var browserManifestUrl =
      protocol + 'browser.' + domain + '/manifest.webapp';
    var outOfProcessBlackList = [
      browserManifestUrl
      // Requires nested content processes (bug 761935).  This is not
      // on the schedule for v1.
    ];

    if (outOfProcessBlackList.indexOf(manifestURL) === -1) {
      browser_config.oop = true;
    }

    var browser = new BrowserFrame(browser_config, origFrame);

    var iframe = browser.element;

    // TODO: Move into appWindow's render function.
    var frame = document.createElement('div');
    frame.appendChild(iframe);
    frame.className = 'appWindow';

    // TODO: Remove this line later.
    // We won't need to store origin or url in iframe element anymore.
    iframe.dataset.frameOrigin = origin;
    // Save original frame URL in order to restore it on frame load error
    iframe.dataset.frameURL = url;

    // Note that we don't set the frame size here.  That will happen
    // when we display the app in setDisplayedApp()

    // TODO: Will become app window's attribute.
    // frames are began unloaded.
    iframe.dataset.unloaded = true;

    if (!manifestURL) {
      frame.setAttribute('data-wrapper', 'true');
      return frame;
    }

    // TODO: Move into app window.
    // Add minimal chrome if the app needs it.
    if (manifest.chrome && manifest.chrome.navigation === true) {
      frame.setAttribute('data-wrapper', 'true');
    }

    return frame;
  }

  function maybeSetFrameIsCritical(iframe, origin) {
    // XXX Those urls needs to be built dynamically.
    if (origin.startsWith('app://communications.gaiamobile.org/dialer') ||
        origin.startsWith('app://clock.gaiamobile.org')) {
      iframe.setAttribute('mozapptype', 'critical');
    }
  }

  function appendFrame(origFrame, origin, url, name, manifest, manifestURL,
                       expectingSystemMessage) {
    // Create the <iframe mozbrowser mozapp> that hosts the app
    var frame =
        createFrame(origFrame, origin, url, name, manifest, manifestURL);
    var iframe = frame.firstChild;
    frame.id = 'appframe' + nextAppId++;
    iframe.dataset.frameType = 'window';

    // Give a name to the frame for differentiating between main frame and
    // inline frame. With the name we can get frames of the same app using the
    // window.open method.
    iframe.name = 'main';

    // If this frame corresponds to the homescreen, set mozapptype=homescreen
    // so we're less likely to kill this frame's process when we're running low
    // on memory.
    //
    // We must do this before we the appendChild() call below. Once
    // we add this frame to the document, we can't change its app type.
    if (origin === homescreen) {
      iframe.setAttribute('mozapptype', 'homescreen');
    }

    if (expectingSystemMessage) {
      iframe.setAttribute('expecting-system-message',
                          'expecting-system-message');
    }
    maybeSetFrameIsCritical(iframe, origin);

    // Register appLoadedHandler as a capturing listener for the
    // 'mozbrowserloadend' and 'appopen' events on this iframe.  This event
    // listener will only do something if iframe.dataset.enableAppLoaded is set
    // to 'mozbrowserloadend' or 'appopen'.
    //
    // If appropriate, appLoadedHandler fires an apploadtime event, which helps
    // us time how long the app took to load.
    //
    // We use a capturing listener in order to ignore any systel-level work
    // done once the app is launched; we're only interested in timing the app
    // itself.

    iframe.addEventListener('mozbrowserloadend', appLoadedHandler,
                            /* capturing */ true);
    iframe.addEventListener('appopen', appLoadedHandler,
                            /* capturing */ true);

    // Add the iframe to the document
    windows.appendChild(frame);

    // And map the app origin to the info we need for the app
    var app = new AppWindow({
      origin: origin,
      name: name,
      manifest: manifest,
      manifestURL: manifestURL,
      frame: frame,
      iframe: iframe,
      launchTime: 0,
      isHomescreen: (manifestURL === homescreenManifestURL)
    });
    runningApps[origin] = app;

    if (app.isFullScreen()) {
      frame.classList.add('fullscreen-app');
    }

    numRunningApps++;

    return app;
  }

  function startInlineActivity(origin, url, name, manifest, manifestURL) {
    // If the same inline activity frame is existed and showing,
    // we reuse its iframe.
    if (inlineActivityFrames.length) {
      var showingInlineActivityFrame =
        inlineActivityFrames[inlineActivityFrames.length - 1].firstChild;

      if (showingInlineActivityFrame.dataset.frameURL == url) {
        return;
      }
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('activitywillopen', true, true, { origin: origin });

    // Create the <iframe mozbrowser mozapp> that hosts the app
    var frame = createFrame(null, origin, url, name, manifest, manifestURL);
    var iframe = frame.firstChild;
    frame.classList.add('inlineActivity');
    iframe.dataset.frameType = 'inline-activity';

    iframe.setAttribute('expecting-system-message',
                        'expecting-system-message');
    maybeSetFrameIsCritical(iframe, origin);

    // Give a name to the frame for differentiating between main frame and
    // inline frame. With the name we can get frames of the same app using the
    // window.open method.
    iframe.name = 'inline';
    iframe.dataset.start = Date.now();

    // Save the reference
    inlineActivityFrames.push(frame);

    // Set the size
    setInlineActivityFrameSize();

    frame.addEventListener('mozbrowserloadend', function activityloaded(e) {
      e.target.removeEventListener(e.type, activityloaded, true);

      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('activityloadtime', true, false, {
        time: parseInt(Date.now() - iframe.dataset.start),
        type: 'c', // Activity is always cold booted now.
        src: iframe.src
      });
      iframe.dispatchEvent(evt);
    }, true);

    // Add the iframe to the document
    windows.appendChild(frame);

    // Open the frame, first, store the reference
    openFrame = frame;

    // set the frame to visible state
    if ('setVisible' in iframe)
      iframe.setVisible(true);

    if ('orientation' in manifest) {
      frame.dataset.orientation = manifest.orientation;
      setOrientationForInlineActivity(frame);
    }

    setFrameBackground(openFrame, function gotBackground() {
      // Start the transition when this async/sync callback is called.
      openFrame.classList.add('active');
      if (inlineActivityFrames.length == 1)
        activityCallerOrigin = displayedApp;
      if ('wrapper' in runningApps[displayedApp].frame.dataset) {
        wrapperFooter.classList.remove('visible');
        wrapperHeader.classList.remove('visible');
      }
    });
  }

  function removeFrame(origin) {
    var app = runningApps[origin];
    var frame = app.frame;

    if (frame) {
      windows.removeChild(frame);
    }

    if (openFrame == frame) {
      setOpenFrame(null);
      setTimeout(openCallback);
      openCallback = null;
    }
    if (closeFrame == frame) {
      setCloseFrame(null);
      setTimeout(closeCallback);
      closeCallback = null;
    }

    delete runningApps[origin];
    numRunningApps--;
  }

  function removeInlineFrame(frame) {
    // If frame is transitioning we should remove the reference
    if (openFrame == frame)
      setOpenFrame(null);

    // Bug 856692: force the close of the keyboard in closing inline activities
    dispatchEvent(new CustomEvent('activitywillclose'));

    // If frame is never set visible, we can remove the frame directly
    // without closing transition
    if (!frame.classList.contains('active')) {
      windows.removeChild(frame);
      return;
    }
    // Take keyboard focus away from the closing window
    frame.firstChild.blur();
    // Remove the active class and start the closing transition
    frame.classList.remove('active');
  }

  function restoreRunningApp() {
    // Give back focus to the displayed app
    var app = runningApps[displayedApp];
    setOrientationForApp(displayedApp);
    if (app && app.iframe) {
      app.iframe.focus();
      app.setVisible(true);
      if ('wrapper' in app.frame.dataset) {
        wrapperFooter.classList.add('visible');
      }
    }
  }

  // If all is not specified,
  // remove the top most frame
  function stopInlineActivity(all) {
    if (!inlineActivityFrames.length)
      return;

    if (!all) {
      var frame = inlineActivityFrames.pop();
      removeInlineFrame(frame);
    } else {
      // stop all activity frames
      // Remore the inlineActivityFrame reference
      inlineActivityFrames.forEach(function(frame) {
        removeInlineFrame(frame);
      });
      inlineActivityFrames = [];
    }

    if (!inlineActivityFrames.length) {
      screenElement.classList.remove('inline-activity');
      // if attention screen is fully visible, we shouldn't restore the running
      // app. It will be done when attention screen is closed.
      if (!AttentionScreen.isFullyVisible()) {
        restoreRunningApp();
      }
    } else {
      setOrientationForInlineActivity(
        inlineActivityFrames[inlineActivityFrames.length - 1]);
    }
  }

  // Watch activity completion here instead of activity.js
  // Because we know when and who to re-launch when activity ends.
  window.addEventListener('mozChromeEvent', function(e) {
    if (e.detail.type == 'activity-done') {
      // Remove the top most frame every time we get an 'activity-done' event.
      stopInlineActivity();
      if (!inlineActivityFrames.length && !activityCallerOrigin) {
        setDisplayedApp(activityCallerOrigin);
        activityCallerOrigin = '';
      }
    }
  });

  // Watch chrome event that order to close an app
  window.addEventListener('killapp', function(e) {
    kill(e.detail.origin);
  });

  function getIconForSplash(manifest) {
    var icons = 'icons' in manifest ? manifest['icons'] : null;
    if (!icons) {
      return null;
    }

    var sizes = Object.keys(icons).map(function parse(str) {
      return parseInt(str, 10);
    });

    sizes.sort(function(x, y) { return y - x; });

    return icons[sizes[0]];
  }

  // TODO: Move into app window.
  window.addEventListener('launchapp', windowLauncher);

  // TODO: Remove this.
  function windowLauncher(e) {
    // TODO: Move into app window's attribute.
    var startTime = Date.now();
    var config = e.detail;
    // Don't need to launch system app.
    if (config.url === window.location.href)
      return;

    var splash = getIconForSplash(config.manifest);
    // TODO: Move into app Window.
    if (splash) {
      var a = document.createElement('a');
      a.href = config.origin;
      splash = a.protocol + '//' + a.hostname + ':' + (a.port || 80) + splash;

      // Start to load the image in background to avoid flickering if possible.
      var img = new Image();
      img.src = splash;
    }

    if (!config.isSystemMessage) {
      if (config.origin == homescreen) {
        // No need to append a frame if is homescreen
        setDisplayedApp();
      } else {
        if (!isRunning(config.origin)) {
          appendFrame(null, config.origin, config.url,
                      config.name, config.manifest, config.manifestURL);
        }
        // TODO: Move below iframe hack into app window.
        runningApps[config.origin].iframe.dataset.start = startTime;
        runningApps[config.origin].iframe.splash = splash;
        setDisplayedApp(config.origin, null);
      }
    } else {
      if (config.isActivity && config.inline) {
        // Inline activities behaves more like a dialog,
        // let's deal them here.
        startInlineActivity(config.origin, config.url,
                            config.name, config.manifest, config.manifestURL);

        return;
      }

      // If the message specifies we only have to show the app,
      // then we don't have to do anything here
      if (config.changeURL) {
        if (isRunning(config.origin)) {
          // If the app is in foreground, it's too risky to change it's
          // URL. We'll ignore this request.
          if (displayedApp !== config.origin) {
            var iframe = getAppFrame(config.origin).firstChild;

            // If the app is opened and it is loaded to the correct page,
            // then there is nothing to do.
            if (iframe.src !== config.url) {
              // Rewrite the URL of the app frame to the requested URL.
              // XXX: We could ended opening URls not for the app frame
              // in the app frame. But we don't care.
              iframe.src = config.url;
            }
          }
        } else if (config.origin !== homescreen) {
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
            if ('setVisible' in app.iframe)
              app.iframe.setVisible(false);
          }
        } else {
          ensureHomescreen();
        }
      }

      // We will only bring apps to the foreground when the message
      // specifically requests it.
      if (!config.isActivity)
        return;

      // XXX: the correct way would be for UtilityTray to close itself
      // when there is a appwillopen/appopen event.
      UtilityTray.hide();

      setDisplayedApp(config.origin);
    }
  };

  // If the application tried to close themselves by calling window.close()
  // we will handle that here.
  // XXX: this event is fired twice:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=814583
  window.addEventListener('mozbrowserclose', function(e) {
    if (!'frameType' in e.target.dataset)
      return;

    switch (e.target.dataset.frameType) {
      case 'window':
        kill(e.target.dataset.frameOrigin);
        break;

      case 'inline-activity':
        stopInlineActivity(true);
        break;
    }
  });

  // Deal with locationchange
  window.addEventListener('mozbrowserlocationchange', function(e) {
    if (!'frameType' in e.target.dataset)
      return;

    e.target.dataset.url = e.detail;
  });

  // Deal with application uninstall event
  // if the application is being uninstalled, we ensure it stop running here.
  window.addEventListener('applicationuninstall', function(e) {
    kill(e.detail.application.origin);
  });

  // When an UI layer is overlapping the current app,
  // WindowManager should set the visibility of app iframe to false
  // And reset to true when the layer is gone.
  // We may need to handle windowclosing, windowopened in the future.
  var attentionScreenTimer = null;

  var overlayEvents = [
    'lock',
    'will-unlock',
    'attentionscreenshow',
    'attentionscreenhide',
    'status-active',
    'status-inactive',
    'mozChromeEvent'
  ];

  function resetDeviceLockedTimer() {
    if (deviceLockedTimer) {
      clearTimeout(deviceLockedTimer);
      deviceLockedTimer = 0;
    }
  }

  function overlayEventHandler(evt) {
    if (attentionScreenTimer && 'mozChromeEvent' != evt.type)
      clearTimeout(attentionScreenTimer);
    switch (evt.type) {
      case 'status-active':
      case 'attentionscreenhide':
      case 'will-unlock':
        if (LockScreen.locked)
          return;

        windows.setAttribute('aria-hidden', 'false');
        if (inlineActivityFrames.length) {
          setVisibilityForInlineActivity(true);
        } else {
          runningApps[displayedApp].setVisible(true);
        }
        resetDeviceLockedTimer();
        break;
      case 'lock':
        windows.setAttribute('aria-hidden', 'true');
        // If the audio is active, the app should not set non-visible
        // otherwise it will be muted.
        if (!normalAudioChannelActive) {
          if (inlineActivityFrames.length) {
            // XXX: With this, some inline activities may close
            // themselves when visibility is true. but some may not.
            // See bug 853759 and bug 846850.
            setVisibilityForInlineActivity(false);
          } else {
            runningApps[displayedApp].setVisible(false);
          }
        }
        resetDeviceLockedTimer();
        break;

      /*
      * Because in-transition is needed in attention screen,
      * We set a timer here to deal with visibility change
      */
      case 'status-inactive':
        if (!AttentionScreen.isVisible())
          return;
      case 'attentionscreenshow':
        var detail = evt.detail;
        if (detail && detail.origin && detail.origin != displayedApp) {
          attentionScreenTimer = setTimeout(function setVisibility() {
            if (inlineActivityFrames.length) {
              setVisibilityForInlineActivity(false);
            } else {
              /**
               * We only retain the screenshot layer
               * when attention screen drops.
               * Otherwise we just bring the app to background.
               */
              runningApps[displayedApp].setVisible(false, true);
            }
          }, 3000);

          // Instantly blur the frame in order to ensure hiding the keyboard
          var app = runningApps[displayedApp];
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
              app.iframe.setVisible(false);
            } else {
              app.iframe.blur();
            }
          }
        }
        break;

      case 'mozChromeEvent':
        if (evt.detail.type == 'visible-audio-channel-changed') {
          resetDeviceLockedTimer();

          if (normalAudioChannelActive && evt.detail.channel !== 'normal' &&
              LockScreen.locked) {
            deviceLockedTimer = setTimeout(function setVisibility() {
              runningApps[displayedApp].setVisible(false);
            }, 3000);
          }

          normalAudioChannelActive = (evt.detail.channel === 'normal');
        }
        break;
    }
  }

  overlayEvents.forEach(function overlayEventIterator(event) {
    window.addEventListener(event, overlayEventHandler);
  });

  function setVisibilityForInlineActivity(visible) {
    if (!inlineActivityFrames.length)
      return;

    var topFrame = inlineActivityFrames[inlineActivityFrames.length - 1]
      .firstChild;
    if ('setVisible' in topFrame) {
      topFrame.setVisible(visible);
    }

    // Restore/give away focus on visiblity change
    // so that the app can take back its focus
    if (visible) {
      topFrame.focus();
    } else {
      topFrame.blur();
    }
  }

  function setVisibilityForCurrentApp(visible) {
    var app = runningApps[displayedApp];
    if (!app)
      return;
    if ('setVisible' in app.iframe)
      app.iframe.setVisible(visible);

    // Restore/give away focus on visiblity change
    // so that the app can take back its focus
    if (visible)
      app.iframe.focus();
    else
      app.iframe.blur();
  }

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

    if (manifest.entry_points && manifest.type == 'certified') {
      var entryPoint = manifest.entry_points[origin.split('/')[3]];
      return new ManifestHelper(entryPoint).name;
    }
    return new ManifestHelper(manifest).name;
  }

  // Deal with crashed apps
  window.addEventListener('mozbrowsererror', function(e) {
    if (!'frameType' in e.target.dataset)
      return;

    var origin = e.target.dataset.frameOrigin;
    var manifestURL = e.target.getAttribute('mozapp');

    if (e.target.dataset.frameType == 'inline-activity') {
      stopInlineActivity(true);
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
    if (displayedApp == origin && homescreen === origin) {
      kill(origin, function relaunchHomescreen() {
        setDisplayedApp(homescreen);
      });
      return;
    }

    // Actually remove the frame, and trigger the closing transition
    // if the app is currently displaying
    kill(origin);
  });

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

  // Use a setting in order to be "called" by settings app
  navigator.mozSettings.addObserver(
    'clear.remote-windows.data',
    function clearRemoteWindowsData(setting) {
      var shouldClear = setting.settingValue;
      if (!shouldClear)
        return;

      // Delete all storage and cookies from our content processes
      var request = navigator.mozApps.getSelf();
      request.onsuccess = function() {
        request.result.clearBrowserData();
      };

      // Reset the setting value to false
      var lock = navigator.mozSettings.createLock();
      lock.set({'clear.remote-windows.data': false});
    });

  // Stop running the app with the specified origin
  function kill(origin, callback) {
    if (!isRunning(origin)) {
      if (callback) {
        setTimeout(callback);
      }
      return;
    }

    // As we can't immediatly remove runningApps entry,
    // we flag it as being killed in order to avoid trying to remove it twice.
    // (Check required because of bug 814583)
    if (runningApps[origin].killed) {
      if (callback) {
        setTimeout(callback);
      }
      return;
    }
    runningApps[origin].killed = true;

    // If the app is the currently displayed app, switch to the homescreen
    if (origin === displayedApp) {
      // when the homescreen is displayed and being
      // killed we need to forcibly restart it...
      if (origin === homescreen) {
        removeFrame(origin);

        // XXX workaround bug 810431.
        // we need this here and not in other situations
        // as it is expected that homescreen frame is available.
        setTimeout(function() {
          setDisplayedApp();

          if (callback) {
            callback();
          }
        });
      } else {
        setDisplayedApp(homescreen, function() {
          removeFrame(origin);
          if (callback) {
            setTimeout(callback);
          }
        });
      }

    } else {
      removeFrame(origin);
      if (callback) {
        setTimeout(callback);
      }
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
      // Make sure this happens before activity frame is removed.
      // Because we will be asked by a 'activity-done' event from gecko
      // to relaunch to activity caller, and this is the only way to
      // determine if we are going to homescreen or the original app.
      activityCallerOrigin = '';

      setDisplayedApp(homescreen);
    } else {
      stopInlineActivity(true);
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
    getOrientationForApp: function(origin) {
      var app = runningApps[origin];

      if (!app || !app.manifest)
        return;

      return app.manifest.orientation;
    },
    toggleHomescreen: toggleHomescreen,
    retrieveHomescreen: retrieveHomescreen,
    screenshots: screenshots
  };
}());

