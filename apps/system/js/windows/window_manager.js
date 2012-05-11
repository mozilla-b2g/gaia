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
//    getDisplayedApp: return the origin of the currently displayed app
//    getAppFrame(origin): returns the iframe element for the specified origin
//      which is assumed to be running.  This is only currently used
//      for tests and chrome stuff: see the end of the file
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
  var screenElement = document.getElementById('screen');
  var statusbar = document.getElementById('statusbar');
  var windows = document.getElementById('windows');
  var taskManager = document.getElementById('taskManager');
  var taskList = taskManager.getElementsByTagName('ul')[0];

  //
  // The set of running apps.
  // This is a map from app origin to an object like this:
  // {
  //    name: the app's name
  //    manifest: the app's manifest object
  //    frame: the iframe element that the app is displayed in
  // }
  //
  var runningApps = {};
  var numRunningApps = 0; // start() and stop() maintain this count
  var nextAppId = 0;      // to give each app's iframe a unique id attribute

  // The origin of the currently displayed app, or null if there isn't one
  var displayedApp = null;

  // The localization of the "Loading..." message that appears while
  // an app is loading
  var localizedLoading = 'Loading...';
  window.addEventListener('localized', function() {
    localizedLoading = document.mozL10n.get('loading');
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

    // launch() can be called from outside the task switcher
    // hiding it if needed
    if (taskSwitcherIsShown())
      hideTaskSwitcher();
  }

  function isRunning(origin) {
    return runningApps.hasOwnProperty(origin);
  }

  // Set the size of the app's iframe to match the size of the screen.
  // We have to call this on resize events (which happen when the
  // phone orientation is changed). And also when an app is launched
  // and each time an app is brought to the front, since the
  // orientation could have changed since it was last displayed
  function setAppSize(origin) {
    var app = runningApps[origin];
    var frame = app.frame;
    var manifest = app.manifest;

    frame.style.width = window.innerWidth + 'px';
    frame.style.height = manifest.fullscreen ?
      window.innerHeight + 'px' :
      (window.innerHeight - statusbar.offsetHeight) + 'px';
  }

  // Perform an "open" animation for the app's iframe
  function openWindow(origin, callback) {
    var app = runningApps[origin];
    var frame = app.frame;
    var manifest = app.manifest;

    // Create a window sprite element to perform an window open animation.
    // Start it off in its 'closed' state.
    var sprite = document.createElement('div');
    sprite.className = 'closed windowSprite';

    if (manifest.fullscreen) {
      sprite.classList.add('fullscreen');
      screenElement.classList.add('fullscreen');
    }

    // Make the sprite look like the app that it is animating for.
    // Animating an image resize is quicker than animating and resizing
    // the live app in its iframe.  But if even this background image
    // animation is too slow, then just comment this line out.
    //sprite.style.background = '-moz-element(#' + frame.id + ') no-repeat';

    // Add the sprite to the document
    document.body.appendChild(sprite);

    // Query css to flush this change
    var width = document.documentElement.clientWidth;

    // And start the animation
    sprite.classList.add('open');
    sprite.classList.remove('closed');

    // This event handler is triggered when the transition ends.
    // We're going to do two transitions, so it gets called twice.
    sprite.addEventListener('transitionend', function transitionListener(e) {
      // Only listen for opacity transition
      // Otherwise we may get called multiple times for each transition
      if (e.propertyName !== 'opacity')
        return;

      // If the sprite is not yet faded
      if (!sprite.classList.contains('faded')) {
        // The first transition has just completed.
        // Make the app window visible and then fade the sprite away
        frame.classList.add('active');
        windows.classList.add('active');
        sprite.classList.add('faded');

        // Let the app know that it has become visible
        frame.contentWindow.postMessage({
          message: 'visibilitychange',
          hidden: false
        }, '*');
      }
      else {
        // The second transition has just completed
        // give the app focus and discard the sprite.
        frame.focus();
        document.body.removeChild(sprite);
        // Finally, call the callback if there is one.
        if (callback)
          callback();
      }
    });

    // FIXME
    // We broadcast an 'appopen' event here.
    // Currently notification screen code in homescreen.js listens for
    // this event and uses it to clear notifications when the dialer
    // or sms apps are opened up. We probably need a better way to do this.
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appopen', true, false, { url: origin });
    frame.dispatchEvent(evt);
  }

  function closeWindow(origin, instant, callback) {
    var app = runningApps[origin];
    var frame = app.frame;
    var manifest = app.manifest;

    // Send a synthentic 'appwillclose' event.
    // The keyboard uses this and the appclose event to know when to close
    // See https://github.com/andreasgal/gaia/issues/832
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appwillclose', true, false, {});
    frame.dispatchEvent(evt);

    // Send a synthentic 'appclose' event.
    // The keyboard uses this event to know when to close
    // FIXME: this second event should probably happen
    // below, after the animation. But the event isn't being
    // delivered correctly if I do that.
    // See https://github.com/andreasgal/gaia/issues/832
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appclose', true, false, {});
    frame.dispatchEvent(evt);

    // Take keyboard focus away from the closing window
    frame.blur();

    // Let the app know that it has become hidden
    frame.contentWindow.postMessage({
      message: 'visibilitychange',
      hidden: true
    }, '*');

    // If this was a fullscreen app, leave full-screen mode
    if (manifest.fullscreen)
      screenElement.classList.remove('fullscreen');

    // If we're not doing an animation, then just switch directly
    // to the closed state. Note that we don't handle the hackKillMe
    // flag here. If we bring up the task switcher and switch to another
    // app then the video or camera or whatever should keep running
    // in the background. Its only animated transitions to the homescreen
    // that should kill those resource-intensive apps.
    if (instant) {
      frame.classList.remove('active');
      if (callback)
        callback();
      return;
    }

    // Create a window sprite object in the open state, then hide
    // the app window and transition the sprite down to the closed state.
    var sprite = document.createElement('div');
    sprite.className = 'open windowSprite';

    if (manifest.fullscreen)
      sprite.classList.add('fullscreen');

    // Make the sprite look like the app that it is animating for.
    // Animating an image resize is quicker than animating and resizing
    // the live app in its iframe.  But if even this background image
    // animation is too slow, then just comment this line out.
    //sprite.style.background = '-moz-element(#' + frame.id + ') no-repeat';

    // Add the sprite to the document
    document.body.appendChild(sprite);

    // And close the real app window
    frame.classList.remove('active');
    windows.classList.remove('active');

    // If this is an hackKillMe app, set the apps iframe's src attribute
    // to an empty file to get rid of whatever resource-intensive
    // app it is currently running. For some reason actually removing
    // the iframe from the document here does not work, so we remove it
    // after the transition below.
    if (manifest.hackKillMe)
      frame.src = 'blank.html';

    // Query css to flush this change
    var width = document.documentElement.clientWidth;

    // And begin the transition
    sprite.classList.remove('open');
    sprite.classList.add('closed');

    // When the transition ends, discard the sprite.
    // For hackKillMe apps, stop running the app, too
    sprite.addEventListener('transitionend', function transitionListener() {
      sprite.removeEventListener('transitionend', transitionListener);
      document.body.removeChild(sprite);
      if (manifest.hackKillMe)
        stop(origin);
      if (callback)
        callback();
    });
  }

  // Switch to a different app
  function setDisplayedApp(origin, callback) {
    var currentApp = displayedApp, newApp = origin;

    // There are four cases that we handle in different ways:
    // 1) The new app is already displayed: do nothing
    // 2) We're going from the homescreen to an app
    // 3) We're going from an app to the homescreen
    // 4) We're going from one app to another (via task switcher)

    // Case 1
    if (currentApp == newApp) {
      // Just run the callback right away
      if (callback)
        callback();
    }
    // Case 2: homescreen->app
    else if (currentApp == null) {
      setAppSize(newApp);
      openWindow(newApp, callback);
    }
    // Case 3: app->homescreen
    else if (newApp == null) {
      // Animate the window close
      closeWindow(currentApp, false, callback);
    }
    // Case 4: app-to-app transition
    else {
      setAppSize(newApp);
      openWindow(newApp, function() {
        closeWindow(currentApp, true, callback);
      });
    }

    // Lock orientation as needed
    if (newApp == null) {  // going to the homescreen, so force portrait
      screen.mozLockOrientation('portrait-primary');
    }
    else {
      setOrientationForApp(newApp);
    }

    displayedApp = origin;
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
    // FIXME: a platform fix will come
    var exceptions = ['Camera'];
    if (exceptions.indexOf(manifest.name) == -1) {
      frame.setAttribute('mozbrowser', 'true');
      frame.setAttribute('mozapp', manifestURL);
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
      frame: frame
    };

    numRunningApps++;

    // Now animate the window opening and actually set the iframe src
    // when that is done.
    setDisplayedApp(origin, function() {
      frame.src = url;
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

    /*
    // If the application is not a regular application, it can be bookmark.
    // A bookmark consist in a name, an url and an icon. No manifest.
    if (!app) {
      for (var name in bookmarks) {
        if (bookmarks[name].url == origin)
          break;
      }

      appendFrame(origin, origin, name, { 'hackNetworkBound': true });
      return;
    }
    */

    // TODO: is the startPoint argument implemented?
    // and is it passed back to us in the webapps-launch method?
    // If so, we could use that to pass a query string or fragmentid
    // to append to the apps' URL.
    app.launch();
  }

  // The mozApps API launch() method generates an event that we handle
  // here to do the actual launching of the app
  window.addEventListener('mozChromeEvent', function(e) {
    if (e.detail.type === 'webapps-launch') {
      var origin = e.detail.origin;
      if (isRunning(origin)) {
        setDisplayedApp(origin);
        return;
      }

      var app = Applications.getByOrigin(origin);
      appendFrame(origin, e.detail.url, app.manifest.name, app.manifest, app.manifestURL);
    }
  });

  // Stop running the app with the specified origin
  function stop(origin) {
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

  // Build and display the task switcher overlay
  // Note that we rebuild the switcher each time we need it rather
  // than trying to keep it in sync with app launches.  Performance is
  // not an issue here given that the user has to hold the HOME button down
  // for one second before the switcher will appear.
  //
  // FIXME: Currently tasks are displayed in the order in which
  // they were launched. We might want to change this to most recently
  // used order. Or, we might want to keep the apps in launch order, but
  // scroll so that the current task is always shown
  function showTaskSwitcher() {
    // First add an item to the taskList for each running app
    for (var origin in runningApps)
      addTaskIcon(origin, runningApps[origin]);

    // Then make the taskManager overlay active
    taskManager.classList.add('active');

    // Make sure we're in portrait mode
    screen.mozLockOrientation('portrait');

    // If there is a displayed app, take keyboard focus away
    if (displayedApp)
      runningApps[displayedApp].frame.blur();

    function addTaskIcon(origin, app) {
      // Build an icon representation of each window.
      // And add it to the task switcher
      var icon = document.createElement('li');
      icon.style.background = '-moz-element(#' + app.frame.id + ') no-repeat';
      var close_button = document.createElement('a');
      icon.appendChild(close_button);
      var title = document.createElement('h1');
      title.textContent = app.name;
      icon.appendChild(title);
      taskList.appendChild(icon);

      // Set up event handling

      // A click on the close button ends that task. And if it is the
      // last task, it dismisses the task switcher overlay
      close_button.addEventListener('click', function(e) {
        // Don't trigger a click on our ancestors
        e.stopPropagation();

        // Remove the icon from the task list
        taskList.removeChild(icon);

        // Stop the app itself
        // If the app is the currently displayed one,
        // this will also switch back to the homescreen
        // (though the task switcher will still be displayed over it)
        stop(origin);

        // if there are no more running apps, then dismiss
        // the task switcher
        if (numRunningApps === 0)
          hideTaskSwitcher();
      });

      // A click elsewhere in the icon switches to that task
      icon.addEventListener('click', function() {
        hideTaskSwitcher();
        setDisplayedApp(origin);
      });
    }
  }

  function hideTaskSwitcher() {
    // Make the taskManager overlay inactive
    taskManager.classList.remove('active');

    // And remove all the task icons from the document.
    taskList.textContent = '';

    // If there is a displayed app, give the keyboard focus back
    // And switch back to that's apps orientation
    if (displayedApp) {
      runningApps[displayedApp].frame.focus();
      setOrientationForApp(displayedApp);
    }
  }

  function taskSwitcherIsShown() {
    return taskManager.classList.contains('active');
  }

  // When a resize event occurs, resize the running app, if there is one
  window.addEventListener('resize', function() {
    if (displayedApp)
      setAppSize(displayedApp);
  });

  // Listen for the Back button.  We need both a capturing listener
  // and a regular listener for this.  If the task switcher (or some
  // other overlay) is displayed, the capturing listener can intercept
  // the back key and use it to take down the overlay.  Otherwise, the
  // back button should go to the displayed app first, so it can use
  // it if it has more than one screen.  Finally, if the event bubbles
  // is not cancelled and bubbles back up to the window, we use it to
  // switch from an app back to the homescreen.
  //
  // FIXME: I'm using key up here because the other apps do that.
  // But I think for back we should use keydown.  Keyup is only for
  // the Home key since we want to distinguish long from short on that one.
  //
  // FIXME: some other apps use capturing listeners for Back.
  //   they should be changed to use non-capturing, I think.
  //   See https://github.com/andreasgal/gaia/issues/753
  //
  //   Also, we may not event need a capturing listener here. This might
  //   be a focus management issue instead:
  //   https://github.com/andreasgal/gaia/issues/753#issuecomment-4559674
  //
  // This is the capturing listener for Back.
  // TODO: right now this only knows about the task switcher, but
  // there might be other things that it needs to be able to dismiss
  //
  window.addEventListener('keyup', function(e) {
    if (e.keyCode === e.DOM_VK_ESCAPE && taskSwitcherIsShown()) {
      hideTaskSwitcher();
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // The non capturing Back key handler.
  window.addEventListener('keyup', function(e) {
    // If we see the Back key, and it hasn't been cancelled, and there
    // is an app displayed, then hide the app and go back to the
    // homescreen. Unlike the Home key, apps can intercept this event
    // and use it for their own purposes.
    if (e.keyCode === e.DOM_VK_ESCAPE &&
        !e.defaultPrevented &&
        displayedApp !== null) {

      setDisplayedApp(null); // back to the homescreen
    }
  });

  // Handle the Home key with capturing event listeners so that
  // other homescreen modules never even see the key.
  (function() {
    var timer = null;
    var keydown = false;

    window.addEventListener('keydown', keydownHandler, true);
    window.addEventListener('keyup', keyupHandler, true);

    function keydownHandler(e) {
      if (e.keyCode !== e.DOM_VK_HOME) return;

      // If the screen was blank, turn it back on as soon as the
      // home key is pressed.
      ScreenManager.turnScreenOn();

      // We don't do anything else until the Home key is released...
      // If there is not a timer running, start one so we can
      // measure how long the key is held down for.  If there is
      // already a timer running, then this is a key repeat event
      // during a long Home key press and we ignore it.
      if (!keydown) {
        timer = window.setTimeout(longPressHandler, kLongPressInterval);
        keydown = true;
      }

      // No one sees the HOME key but us
      e.stopPropagation();
      e.preventDefault();  // Don't generate the keypress event
    }

    function keyupHandler(e) {
      if (e.keyCode !== e.DOM_VK_HOME)
        return;

      keydown = false;

      // If the key was released before the timer, then this was
      // a short press. Show the homescreen and cancel the timer.
      // Otherwise it was a long press that was handled in the timer
      // function so just ignore it.
      if (timer !== null) {
        clearInterval(timer);
        timer = null;

        // If the screen is locked, ignore the home button.
        // Otherwise, make the homescreen visible.
        // Also, if the task switcher is visible, then hide it.
        if (!LockScreen.locked) {
          setDisplayedApp(null);
          if (taskSwitcherIsShown())
            hideTaskSwitcher();
        }
      }

      // No one ever sees the HOME key but us
      e.stopPropagation();
    }

    function longPressHandler() {
      // If the timer fires, then this was a long press on the home key
      // So bring up the app switcher overlay if we're not locked
      // and if the task switcher is not already shown
      timer = null;

      if (!LockScreen.locked && !taskSwitcherIsShown())
        showTaskSwitcher();
    }
  }());

  // Return the object that holds the public API
  return {
    launch: launch,
    kill: stop,
    getDisplayedApp: getDisplayedApp,
    setOrientationForApp: setOrientationForApp,
    getAppFrame: function(origin) {
      if (isRunning(origin))
        return runningApps[origin].frame;
      else
        return null;
    }
  };
}());

