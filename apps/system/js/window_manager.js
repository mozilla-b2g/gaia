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

  window.addEventListener('globalorientationchanged', function(value) {
    _globalOrientation = value ? OrientationManager.globalOrientation : null;
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
    setDisplayedApp(HomescreenLauncher.origin);
  });

  // Open and close app animations
  windows.addEventListener('animationend', function frameAnimationend(evt) {
    var animationName = evt.animationName;
    var frame = evt.target;

    if (animationName.indexOf('openApp') !== -1) {
      windowScaled(frame);

      var onWindowReady = function() {
        // We're not displayed app any more. Do not fire appopen.
        if (displayedApp !== iframe.dataset.frameOrigin) {
          return;
        }
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

  // Executes when the opening transition scale the app
  // to full size.
  function windowScaled(frame) {
    var iframe = frame.firstChild;

    // Set displayedApp to the new value
    displayedApp = iframe.dataset.frameOrigin;

    var app = runningApps[displayedApp];

    // Set orientation for the new app
    app.setOrientation();
  }

  // Execute when the application is actually loaded
  function windowOpened(frame) {
    var iframe = frame.firstChild;

    if (displayedApp == iframe.dataset.frameOrigin) {
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
        HomescreenLauncher.getHomescreen().setVisible(false);
      }

      waitForNextPaint(frame, function makeWindowActive() {
        frame.classList.add('render');

        // Giving focus to a frame can create an expensive reflow, so let's
        // delay it until the frame has rendered.
        if (frame.classList.contains('active')) {
          iframe.focus();
        }
      });
    }

    // Dispatch an 'appopen' event.
    var manifestURL = runningApps[displayedApp].manifestURL;
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appopen', true, false, runningApps[displayedApp]);
    iframe.dispatchEvent(evt);
  }

  // Executes when app closing transition finishes.
  function windowClosed(frame) {
    var iframe = frame.firstChild;
    var origin = iframe.dataset.frameOrigin;
    var app = runningApps[origin];

    frame.classList.remove('active');

    // set the closed frame visibility to false

    // XXX: After bug 822325 is fixed in gecko,
    // we don't need to check trusted ui state here anymore.
    // We do this because we don't want the trustedUI opener
    // is killed in background due to OOM.
    if (!TrustedUIManager.hasTrustedUI(origin)) {
      app.setVisible(false, true);
    }

    // Inform keyboardmanager that we've finished the transition
    iframe.dispatchEvent(new CustomEvent('appclose'));
  }

  function setActiveApp(app) {
    var openedApp = app;
    var closedApp = runningApps[displayedApp];
    var closedFrame = closedApp.frame;

    displayedApp = app.origin;
    openedApp.setVisible(true);

    windowOpened(openedApp.frame);
    windowClosed(closedFrame);

    var wrapper = ('wrapper' in openedApp.frame.dataset);
    wrapperFooter.classList.toggle('visible', wrapper);

    screenElement.classList.toggle('fullscreen-app', openedApp.isFullScreen());
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
    // TODOEVME - this kept throwing errors when homescreen launched,
    // bgcolor was null
    if (backgroundColor && backgroundColor.indexOf('rgb(') != -1) {
      iframe.style.backgroundColor = backgroundColor;
    }
  });

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

    // Make window visible to screenreader
    app.frame.removeAttribute('aria-hidden');

    app.fadeIn();

    if (app.resized)
      app.resize();

    if (origin === HomescreenLauncher.origin) {
      // Call the openCallback only once. We have to use tmp var as
      // openCallback can be a method calling the callback
      // (like the `removeFrame` callback in `kill()` ).
      var tmpCallback = openCallback;
      openCallback = null;

      HomescreenLauncher.getHomescreen().open(tmpCallback);

      setOpenFrame(null);
      displayedApp = origin;

      return;
    }

    if (app.isFullScreen())
      screenElement.classList.add('fullscreen-app');

    if (app.rotatingDegree !== 0) {
      // Lock the orientation before transitioning.
      app.setOrientation();
    }

    transitionOpenCallback = function startOpeningTransition() {
      // We have been canceled by another transition.
      if (!openFrame || transitionOpenCallback != startOpeningTransition)
        return;

      // Make sure we're not called twice.
      transitionOpenCallback = null;
      preCallback();
      openFrame.classList.add('opening');
      HomescreenLauncher.getHomescreen().close();
    };

    var iframe = openFrame.firstChild;
    if ('unloaded' in iframe.dataset) {
      setFrameBackground(openFrame, transitionOpenCallback);
    } else {
      app.tryWaitForFullRepaint(transitionOpenCallback);
    }

    // Set the frame to be visible.
    if (!AttentionScreen.isFullyVisible()) {
      app.setVisible(true);
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
        app.setVisible(false);
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

    // Make window invisible to screenreader
    app.frame.setAttribute('aria-hidden', 'true');

    var onSwitchWindow = isSwitchWindow();

    // Send a synthentic 'appwillclose' event.
    // The keyboard uses this and the appclose event to know when to close
    // See https://github.com/andreasgal/gaia/issues/832
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appwillclose', true, false, { origin: origin });
    closeFrame.dispatchEvent(evt);

    if (!onSwitchWindow) {
      // invoke openWindow to show homescreen here
      // XXX: This doesn't really do the opening. Clean it.
      displayedApp = HomescreenLauncher.origin;
      HomescreenLauncher.getHomescreen().setVisible(true);
      if (app.determineClosingRotationDegree() !== 0) {
        app.fadeOut();
      }
      setOrientationForApp(HomescreenLauncher.origin);
    }

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
        HomescreenLauncher.getHomescreen().open();
      }
    };

    onSwitchWindow ? transitionCloseCallback() :
                     HomescreenLauncher.getHomescreen().
                     _waitForNextPaint(transitionCloseCallback);
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
    var currentApp = displayedApp, newApp = origin ||
      HomescreenLauncher.origin;

    if (newApp === HomescreenLauncher.origin) {
      HomescreenLauncher.getHomescreen();
    }

    // Cancel transitions waiting to be started.
    transitionOpenCallback = null;
    transitionCloseCallback = null;

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

    setOpenFrame(null);
    setCloseFrame(null);
    screenElement.classList.remove('switch-app');
    screenElement.classList.remove('fullscreen-app');

    // Dispatch an appwillopen event only when we open an app
    if (newApp != currentApp && newApp != HomescreenLauncher.origin) {
      var app = runningApps[newApp];
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('appwillopen', true, true, app);

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

      if (app.rotatingDegree === 90 || app.rotatingDegree === 270) {
        HomescreenLauncher.getHomescreen().fadeOut();
      }
    }

    KeyboardManager.hideKeyboardImmediately();

    // Case 1: the app is already displayed
    if (currentApp && currentApp == newApp) {
      if (newApp == HomescreenLauncher.origin) {
        // relaunch homescreen
        HomescreenLauncher.getHomescreen().open(callback);
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
    else if (FtuLauncher.isFtuRunning() &&
             newApp !== HomescreenLauncher.origin) {
      openWindow(newApp, function windowOpened() {
        InitLogoHandler.animate(callback);
      });
    }
    // Case 3: null->homescreen
    else if ((!currentApp && newApp == HomescreenLauncher.origin)) {
      openWindow(newApp, callback);
    }
    // Case 4: homescreen->app
    else if ((!currentApp && newApp == HomescreenLauncher.origin) ||
             (currentApp == HomescreenLauncher.origin && newApp)) {
      openWindow(newApp, callback);
    }
    // Case 5: app->homescreen
    else if (currentApp && currentApp != HomescreenLauncher.origin &&
             newApp == HomescreenLauncher.origin) {
      closeWindow(currentApp, callback);
    }
    // Case 6: app-to-app transition
    else {
      switchWindow(newApp, callback);
    }

    // Record the time when app was launched,
    // need this to display apps in proper order on CardsView.
    if (newApp)
      runningApps[newApp].launchTime = Date.now();

    // If the app has a attention screen open, displaying it
    AttentionScreen.showForOrigin(newApp);
  }

  function setOrientationForApp(origin) {
    _currentSetOrientationOrigin = origin;

    if (origin == null) { // No app is currently running.
      screen.mozLockOrientation(OrientationManager.globalOrientation);
      return;
    }

    var app = runningApps[origin];
    if (!app)
      return;

    app.setOrientation(_globalOrientation);
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
      manifestURL: manifestURL
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
    frame.setAttribute('role', 'region');

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

  function appendFrame(origFrame, origin, url, name, manifest, manifestURL,
                       expectingSystemMessage, stayBackground) {
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

    if (expectingSystemMessage) {
      iframe.setAttribute('expecting-system-message',
                          'expecting-system-message');
    }

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
      url: url,
      name: name,
      manifest: manifest,
      manifestURL: manifestURL,
      frame: frame,
      iframe: iframe,
      launchTime: 0,
      stayBackground: stayBackground
    });
    runningApps[origin] = app;

    if (app.isFullScreen()) {
      frame.classList.add('fullscreen-app');
    }

    numRunningApps++;

    return app;
  }

  window.addEventListener('homescreencreated', function onHomeCreated(e) {
    runningApps[HomescreenLauncher.origin] = e.detail;
  });

  window.addEventListener('homescreen-changed',
    function onHomeChanged(evt) {
      setDisplayedApp();
    });

  window.addEventListener('appclosedbykilling', function onkilled(e) {
    removeFrame(e.detail.origin);
  });

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

  // Watch chrome event that order to close an app
  window.addEventListener('killapp', function(e) {
    kill(e.detail.origin);
  });

  // Watch for event to bring a currently-open app to the foreground.
  window.addEventListener('displayapp', function(e) {
    setDisplayedApp(e.detail.origin);
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

    var index = 0;
    var width = document.documentElement.clientWidth;
    for (var i = 0; i < sizes.length; i++) {
      if (sizes[i] < width) {
        index = i;
        break;
      }
    }

    return icons[sizes[index]];
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
      if (config.origin == HomescreenLauncher.origin) {
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
        } else if (config.origin !== HomescreenLauncher.origin) {
          // XXX: We could ended opening URls not for the app frame
          // in the app frame. But we don't care.
          var app = appendFrame(null, config.origin, config.url,
                                config.name, config.manifest,
                                config.manifestURL,
                                /* expectingSystemMessage */
                                true, config.stayBackground);

          // set the size of the iframe
          // so Cards View will get a correct screenshot of the frame
          if (config.stayBackground) {
            app.resize();
            app.setVisible(false, true /*screenshot*/);
          }
        } else {
          HomescreenLauncher.getHomescreen().ensure();
        }
      }

      // We will only bring apps to the foreground when the message
      // specifically requests it.
      if (!config.isActivity)
        return;

      // Attempt to identify the correct caller here.
      var caller = ActivityWindowFactory.getActiveWindow() ||
        runningApps[displayedApp];

      runningApps[config.origin].activityCaller = caller;
      caller.activityCallee = runningApps[config.origin];

      // XXX: the correct way would be for UtilityTray to close itself
      // when there is a appwillopen/appopen event.
      UtilityTray.hide();

      setDisplayedApp(config.origin);
    }
  };

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

  window.addEventListener('hidewindows', function() {
    windows.setAttribute('aria-hidden', 'true');
  });

  window.addEventListener('showwindows', function() {
    windows.setAttribute('aria-hidden', 'false');
  });

  window.addEventListener('hidewindow', function() {
    if (displayedApp !== HomescreenLauncher.origin) {
      runningApps[displayedApp].setVisible(false);
    } else {
      HomescreenLauncher.getHomescreen().setVisible(false);
    }
  });

  window.addEventListener('showwindow', function() {
    // XXX: Refine this in AttentionWindow
    if (AttentionScreen.isFullyVisible())
      return;
    if (displayedApp && displayedApp !== HomescreenLauncher.origin) {
      runningApps[displayedApp].setVisible(true);
    } else {
      var homescreen = HomescreenLauncher.getHomescreen();
      homescreen && homescreen.setVisible(true);
    }
  });

  window.addEventListener('overlaystart', function() {
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
        app.setVisible(false);
      } else {
        app.iframe.blur();
      }
    }
  });

  /**
   * We only retain the screenshot layer
   * when attention screen drops.
   * Otherwise we just bring the app to background.
   */
  window.addEventListener('hidewindow', function() {
    runningApps[displayedApp].setVisible(false, true);
  });

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
      }, null, /* expectingSystemMessage */ false,
      /* stayBackground */ false);

      // XXX: Move this into app window.
      // Set the window name in order to reuse this app if we try to open
      // a new window with same name
      app.windowName = config.windowName;
      runningApps[config.origin] = app;
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

    if (displayedApp !== HomescreenLauncher.origin || inTransition) {
      // Make sure this happens before activity frame is removed.
      // Because we will be asked by a 'activity-done' event from gecko
      // to relaunch to activity caller, and this is the only way to
      // determine if we are going to homescreen or the original app.
      setDisplayedApp(HomescreenLauncher.origin);
    } else {
      // dispatch event to close activity.

      HomescreenLauncher.getHomescreen().ensure(true);
    }
  });

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
    setActiveApp: setActiveApp,
    getCurrentDisplayedApp: function() {
      return runningApps[displayedApp];
    },
    getOrientationForApp: function(origin) {
      var app = runningApps[origin];

      if (!app || !app.manifest)
        return;

      return app.manifest.orientation;
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
      if (displayedApp) {
        return runningApps[displayedApp];
      } else {
        return null;
      }
    }
  };
}());
