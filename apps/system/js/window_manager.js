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
  var statusbar = document.getElementById('statusbar');
  var loadingIcon = document.getElementById('statusbar-loading');
  var windows = document.getElementById('windows');

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
    frame.style.height = window.innerHeight - statusbar.offsetHeight + 'px';
  }

  // Perform an "open" animation for the app's iframe
  function openWindow(origin, callback) {
    var app = runningApps[origin];
    var frame = app.frame;
    frame.classList.add('active');
    windows.classList.add('active');

    var width = document.documentElement.clientWidth;
    // Query css to flush this change

    frame.setVisible(true);
    frame.focus();

    if (callback)
      callback();

    // Dispatch a 'appopen' event,
    // Modal dialog would use this.
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appopen', true, false, { origin: displayedApp });
    frame.dispatchEvent(evt);
  }

  function closeWindow(origin, callback) {
    var app = runningApps[origin];
    var frame = app.frame;
    frame.classList.remove('active');
    windows.classList.remove('active');

    if (callback)
      callback();

    // Send a synthentic 'appwillclose' event.
    // The keyboard uses this and the appclose event to know when to close
    // See https://github.com/andreasgal/gaia/issues/832
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appwillclose', true, false, { origin: origin });
    frame.dispatchEvent(evt);

    // Take keyboard focus away from the closing window
    frame.blur();
    frame.setVisible(false);
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

    // Exit fullscreen mode if we're going to the homescreen
    if (newApp === null && document.mozFullScreen) {
      document.mozCancelFullScreen();
    }

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

    if (manifest.hackNetworkBound) {
      var style = 'font-family: OpenSans,sans-serif;' +
                  'text-align: center;' +
                  'color: white;' +
                  'margin-top: 100px;';

      frame.src = 'data:text/html,' +
        '<body style="background-color: black">' +
        '  <h3 style="' + style + '">' + localizedLoading + '</h3>' +
        '</body>';
    }

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
      // VolumeService doesn't work when called OOP
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=775833
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

      'Browser',
      // - Needs Nested Content Process (bug 761935) for OOP

      'Camera',
      // - Camera app doesn't work yet on otoro - bug 740997
      // - When run OOP, VolumeService dies - bug 775833
      //   Cross-process camera control
      //   Cross-process preview stream

      'Clock',
      //  - OOP - asserts on w->mApp (bug 775576)

      'Contacts',
      // System message handler (for WebActivities) doesn't get called
      // https://bugzilla.mozilla.org/show_bug.cgi?id=777195
      // Keyboard always shows up alpha when app using keyboard is run OOP
      // - bug 776118

      'Cut The Rope',
      // - Doesn't seem to work when non-OOP so didn't test OOP
      // - couldn't test OOP - since wifi wasn't working
      //   Mouse click not delivered
      //   Stop audio when app dies

      'Dialer',
      // - Dialer doesn't seem to see touches when running OOP - bug 776069

      'E-Mail',
      // - SSL/TLS support can only happen in the main process although the TCP
      //   support without security will accidentally work OOP:
      //   https://bugzilla.mozilla.org/show_bug.cgi?id=770778

      'Gallery',
      // - When running OOP, doesn't detect any photos or crashes - bug 775591
      // - When running OOP, VolumeService dies - bug 775833

      'Marketplace',
      // - When running OOP - After trying to Login/Register, never get to
      //   persona scren - bug 776086
      // - When running OOP - Sometimes get w->mApp assert (bug 775576)

      'Messages',
      // - crashes when launched OOP on otoro - bug 775997

      'Music',
      // - When running OOP, VolumeService dies - bug 775833

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
      // UI Test App - Notifications don't work properly when running OOP
      //   - bug 776134

      'Video',
      // - When running OOP, VolumeService dies - bug 775833
      //   OOP - Assertion failure: w->mApp,
      //         at /home/work/B2G-otoro/gecko/dom/base/nsGlobalWindow.cpp:10697
      //   Stop audio when app dies
    ];

    if (outOfProcessBlackList.indexOf(name) === -1) {
      // FIXME: content shouldn't control this directly
      frame.setAttribute('remote', 'true');
      console.info('%%%%% Launching', name, 'as remote (OOP)');
    } else {
      console.info('%%%%% Launching', name, 'as local');
    }

    // Add the iframe to the document
    // Note that we have not yet set its src property.
    // In order for the open animation to be smooth, we don't
    // actually set src until the open has finished.
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
    if (background) {
      frame.src = url;
      return;
    }

    // Now animate the window opening and actually set the iframe src
    // when that is done.
    setDisplayedApp(origin, function() {
      frame.src = url;

      if (manifest.fullscreen) {
        frame.mozRequestFullScreen();
      }
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
      loadingIcon.hidden = true;
      return;
    }

    // Actually update the icon.
    // Hide it if the loading property is not true.
    var app = runningApps[origin];
    loadingIcon.hidden = !app.frame.dataset.loading;
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
    setDisplayedApp(null);
    if (CardsView.cardSwitcherIsShown())
      CardsView.hideCardSwitcher();
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

