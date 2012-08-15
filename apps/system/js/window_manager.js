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
  // Hold Home key for 1 second to bring up the app switcher.
  // Should this be a setting?
  var kLongPressInterval = 1000;

  // Some document elements we use
  var loadingIcon = document.getElementById('statusbar-loading');
  var windows = document.getElementById('windows');
  var dialogOverlay = document.getElementById('dialog-overlay');

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

    frame.style.width = window.innerWidth + 'px';
    frame.style.height = window.innerHeight - StatusBar.height + 'px';

    dialogOverlay.style.width = window.innerWidth + 'px';
    dialogOverlay.style.height = window.innerHeight - StatusBar.height + 'px';
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
  document.body.appendChild(sprite);

  // This event handler is triggered when the transition ends.
  // We're going to do two transitions, so it gets called twice.
  sprite.addEventListener('transitionend', function spriteTransition(e) {
    var prop = e.propertyName;
    var classes = sprite.classList;

    if (sprite.className === 'open' && prop.indexOf('transform') != -1) {
      openFrame.classList.add('active');
      windows.classList.add('active');

      classes.add('faded');
      setTimeout(openCallback);
    } else if (classes.contains('faded') && prop === 'opacity') {

      openFrame.setVisible(true);
      openFrame.focus();

      // Dispatch a 'appopen' event,
      // Modal dialog would use this.
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('appopen', true, false, { origin: displayedApp });
      openFrame.dispatchEvent(evt);
      document.getElementById('screen').classList.add('active-application');

    } else if (classes.contains('close') && prop === 'color') {
      closeFrame.classList.remove('active');
      windows.classList.remove('active');
    } else if (classes.contains('close') && prop.indexOf('transform') != -1) {
      classes.remove('open');
      classes.remove('close');

      setTimeout(closeCallback);
    }
  });

  // Perform an "open" animation for the app's iframe
  function openWindow(origin, callback) {
    var app = runningApps[origin];
    openFrame = app.frame;
    openCallback = function() {
      if (app.manifest.fullscreen)
        openFrame.mozRequestFullScreen();

      if (callback)
        callback();
    };

    sprite.className = 'open';
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

    document.getElementById('screen').classList.remove('active-application');

    // Take keyboard focus away from the closing window
    closeFrame.blur();
    closeFrame.setVisible(false);

    // And begin the transition
    // Wait for we leave full screen before starting the transition
    // https://bugzilla.mozilla.org/show_bug.cgi?id=781014
    if (document.mozFullScreen) {
      document.addEventListener('mozfullscreenchange',
        function fullscreenListener(event) {
          document.removeEventListener('mozfullscreenchange',
                                       fullscreenListener, false);
          setTimeout(function() {
            sprite.classList.remove('faded');
            sprite.classList.add('close');
          }, 20);
        }, false);

      document.mozCancelFullScreen();
    } else {
      sprite.classList.remove('faded');
      sprite.classList.add('close');
    }
  }

  //last time app was launched,
  //needed to display them in proper
  //order on CardsView
  function updateLaunchTime(origin) {
    if (!runningApps[origin])
      return;

    runningApps[origin].launchTime = Date.now();
  }

  // Switch to a different app
  function setDisplayedApp(origin, callback, url) {
    var currentApp = displayedApp, newApp = origin;

    // Case 1: the app is already displayed
    if (currentApp && currentApp == newApp) {
      // Just run the callback right away
      if (callback)
        callback();
    }
    // Case 2: homescreen->app
    else if (currentApp == null && newApp) {
      setAppSize(newApp);
      updateLaunchTime(newApp);
      openWindow(newApp, callback);
    }
    // Case 3: app->homescreen
    else if (currentApp && newApp == null) {
      // Animate the window close
      closeWindow(currentApp, callback);
    }
    // Case 4: homescreen-to-homescreen transition
    else if (currentApp == null && newApp == null) {
      // XXX Until the HOME button works as an activity, just
      // send a message to the homescreen so he nows about the
      // home key.
      document.getElementById('screen').classList.remove('active-application');
      var home = document.getElementById('homescreen');
      home.contentWindow.postMessage('home', home.src);
    }
    // Case 5: app-to-app transition
    else {
      // XXX Note: Hack for demo when current app want to set specific hash
      //           url in newApp(e.g. contact trigger SMS message list page).
      var frame = runningApps[newApp].frame;
      if (url && frame.src != url) {
        frame.src = url;
      }
      setAppSize(newApp);
      updateLaunchTime(newApp);
      closeWindow(currentApp, function closeWindow() {
        openWindow(newApp, callback);
      });
    }

    // Lock orientation as needed
    if (newApp == null) {  // going to the homescreen, so force portrait
      screen.mozLockOrientation('portrait-primary');
    } else {
      setOrientationForApp(newApp);
    }

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

  function appendFrame(origin, url, name, manifest, manifestURL, background) {
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
      // Crash when placing call
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=761925
      // Cross-process fullscreen
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=684620
      // Nested content processes
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=761935
      // Stop audio when app dies
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=761936
      // w->mApp Assertion
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=775576
      // Gallery App crash (in IndexedDB)
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=775591
      // Electrolysize b2g-bluetooth
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=755943
      // Message App crashes when run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=775997
      // Dialer doesn't seem to see touches when run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=776069
      // ICS camera support
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=740997
      // Marketplace app doesn't seem to work when run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=776086
      // Keyboard always shows up alpha when app using keyboard is run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=776118
      // Keyboard doesn't show up correctly when app run OOP
      //   https://github.com/mozilla-b2g/gaia/issues/2656
      // UI Test app - Insert Fake Contacts hangs when run OOP (or not OOP)
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=776128
      // UI Test - window.open doesn't work properly when run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=776129
      // UI Test app - window.close test causes seg fault when run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=776132
      // UI Test App - Notifications don't work properly when run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=776134
      // Cannot take on-device screenshot for Apps running in OOP (calculator, browser, Calendar)
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=780920
      // Clock App alarm doesn't sound when run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=778300
      // Music app doesn't work properly when launched OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=782458
      // Video shows black screen when run OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=782460
      // Camera app show black screen when launched OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=782456
      // AppsService is not e10s ready
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=777195
      // Contacts app doesn't work when OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=782472

      'Browser',
      // - Needs Nested Content Process (bug 761935) for OOP

      'Camera',
      // - Get a black screen when camera launched OOP (782456)
      //   Cross-process camera control
      //   Cross-process preview stream

      'Clock',
      //  - OOP - when alarm fires, analog clock stops advancing and alarm doesn sound (778300)

      'Contacts',
      // - Get a white screen when launched OOP (782472)
      // Keyboard always shows up alpha when app using keyboard is run OOP
      // - bug 776118

      'Cut The Rope',
      // - Doesn't seem to work when non-OOP so didn't test OOP
      // - couldn't test OOP - since wifi wasn't working
      //   Mouse click not delivered
      //   Stop audio when app dies

      'Dialer',
      // - Dialer doesn't seem to see touches when running OOP - bug 776069
      // - After launching dialer and going back to the home screen, I get continuous messages:
      //       Gecko - SYDNEY_AUDIO  I   0x172df28 - get position

      'E-Mail',
      // - SSL/TLS support can only happen in the main process although the TCP
      //   support without security will accidentally work OOP:
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=770778

      'Marketplace',
      // - When running OOP - After trying to Login/Register, never get to
      //   persona scren - bug 776086
      // - When running OOP - Sometimes get w->mApp assert (bug 775576)

      'Messages',
      // - crashes when launched OOP on otoro - bug 775997

      'Music',
      // - When running OOP, displays white screen after selecting song (782458)

      'Settings',
      // Most of settings seems to work OOP.
      // However, apprarently bluetooth doesn't - bug 755943

      'Staging Marketplace',
      // - When running OOP - After trying to Login/Register, never get to
      //   persona scren - bug 776086
      // - When running OOP - After trying to Login/Register, got white screen
      // - Works ok when running non-OOP

      'Test Agent',

      'UI tests',
      // Keyboard always shows up alpha when app using keyboard is running OOP
      //   - bug 776118
      // Insert Fake Contacts hangs when running OOP (or not OOP)
      //   - bug 776128
      // UI Test - window.open doesn't work properly when running OOP
      //   - bug 776129
      // UI Test app - window.close test causes seg fault when running OOP
      //   - bug 776132

      'Video'
      // - When running OOP, displays black screen when launching (i.e. no video list) (782460)
      // - Stop audio when app dies
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
      launchTime: Date.now()
    };

    numRunningApps++;

    // Launching this application without bring it to the foreground
    if (background)
      return;

    // Now animate the window opening.
    setDisplayedApp(origin);
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
        if (isRunning(origin)) {
          setDisplayedApp(origin, null, e.detail.url);
          return;
        }

        appendFrame(origin, e.detail.url,
                    name, app.manifest, app.manifestURL);
        break;

      // System Message Handler API is asking us to open the specific URL
      // that handles the pending system message.
      // We will launch it in background if it's not handling an activity.
      case 'open-app':
        // 3459: Homescreen should be an app launched and managed by
        // window manager
        if (origin.indexOf('/homescreen') !== -1) {
          setDisplayedApp(null);
          return;
        }

        if (isRunning(origin)) {
          var frame = getAppFrame(origin);
          // If the app is in foreground, it's too risky to change it's
          // URL. We'll ignore this request.
          if (displayedApp === origin)
            return;

          // If the app is opened and it is loaded to the correct page,
          // then there is nothing to do.
          if (frame.src !== e.detail.url) {
            // Rewrite the URL of the app frame to the requested URL.
            // XXX: We could ended opening URls not for the app frame
            // in the app frame. But we don't care.
            frame.src = e.detail.url;
          }
        } else {
          if (!app)
            return;

          // XXX: We could ended opening URls not for the app frame
          // in the app frame. But we don't care.
          appendFrame(origin, e.detail.url,
                      app.manifest.name, app.manifest, app.manifestURL, true);
        }

        UtilityTray.hide();
        setDisplayedApp(origin);
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
  });

  // Stop running the app with the specified origin
  function kill(origin) {
    if (!isRunning(origin))
      return;

    // If the app is the currently displayed app, switch to the homescreen
    if (origin === displayedApp)
      setDisplayedApp(null);

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
    } else {
      setDisplayedApp(null);
    }
  });

  window.addEventListener('holdhome', function(e) {
    if (!LockScreen.locked &&
        !CardsView.cardSwitcherIsShown()) {
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
