/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// Like console.log on top of dump()
function debug() {
  let s = '';
  for (var i = 0; i < arguments.length; i++)
    s += String(arguments[i]) + ' ';
  dump('***DEBUG: ' + s + '\n');
}

//
// Swipe from (x0,y0) to (x1,y1) over element e, taking a total of interval ms
// and then call whendone(). EventUtils doesn't know how to send a mousemove
// event, so this function just sends a mouse down, waits, then sends a
// mouse up from the new point.
//
// TODO: use EventUtils.synthesizeMouse() to send mousemove events
// if we ever actually need them.
//
EventUtils.swipe = function swipe(e, x0, y0, x1, y1, interval, whendone) {
  var t = 0;  // Start at time 0

  // Begin with a mouse down event
  EventUtils.sendMouseEvent({
    type: 'mousedown',
    clientX: x0,
    clientY: y0
  }, e);

  // Then, after interval ms, send the mouse up at a different spot
  // and call the callback
  setTimeout(function() {
    EventUtils.sendMouseEvent({
      type: 'mouseup',
      clientX: x1,
      clientY: y1
    }, e);
    if (whendone) whendone();
  }, interval);
};

// Poll every 50ms for the condition function to return a truthy value
// and then call the callback function when it does.
// This is designed to be used with yield, nextStep, and shortcut functions
// in an idiom like this:
//
//   yield until(function() document.getElementById('foo'), nextStep);
//
// TODO: create a version of this function that waits for a given event
// on a given object instead of polling for a condition
//
// TODO: add an optional timeout argument
//
function until(condition, callback) {
  var timer = setInterval(check, 50);

  function check() {
    if (!condition())
      return;
    clearInterval(timer);
    callback();
  }
}

// Like ok(), but don't print anything and don't count it if the test succeeds.
// Only generate output for tests that fail.
function silentOK(condition, message) {
  if (!condition)
    ok(condition, message);
}

//
// testApp():
//
// This function does the following:
// - unlocks the lock screen
// - launches the app specified by url
// - waits for the app to load
// - passes the app's window and document to testfunc()
// - brings up the app switcher and kills the app
// - locks the lockscreen again
//
// Write tests like this:
//
//  function generatorTest() {
//    yield testApp("../dialer/dialer.html", dialerTest)
//  }
//
// function dialerTest(window, document, nextStep) {...}
//
// Note that tests that use testApp() have to be generatorTest() tests.
// This won't work with plain test() tests.  And the function you pass
// to testApp() can itself be a generator. The outer test generator yields
// while the inner app test generator runs.  The third argument to the
// app test generator function will be the equivalent of nextStep()
//
// Note that this testing app depends on details of the the homescreen
// document structure and is therefore somewhat brittle.  If the homescreen
// changes then this test framework may have to change to match.
//
//
function testApp(url, testfunc) {
  var g = testAppGenerator(url, testfunc, testAppNextStep);
  g.next();

  function testAppNextStep() {
    try {
      g.next();
    }
    catch (e if e instanceof StopIteration) {
      nextStep();  // this is the real, mochikit nextStep function
    }
  }

  function testAppGenerator(url, testfunc, nextStep) {
    // Wait until the content document is ready
    yield until(
      function() content.wrappedJSObject.document.readyState === 'complete',
      nextStep);

    let contentWin = content.wrappedJSObject;
    let contentDoc = contentWin.document;

    // The 'complete' readyState can be triggered at a time where
    // the LockScreen module isn't accessible, so we wait.
    yield until(function() 'LockScreen' in contentWin, nextStep);

    let lockscreen = contentDoc.getElementById('lockscreen');

    // Send the Home key to turn the screen on if it was off
    EventUtils.sendKey('HOME', contentWin);
    silentOK(screen.mozEnabled, 'screen not on');

    function isLocked() {
      // It might be better to do this by inspecting the DOM to see
      // if the lockscreen is visible and on top. But the way the CSS
      // is setup, the only way to check is like this, and that is
      // is too vague:
      // return lockscreen.style.MozTransform !== 'translateY(-100%)';

      // So we rely on the lock screen module's JS API instead
      return contentWin.LockScreen.locked;
    }

    // Unlock the homescreen if it is locked
    if (isLocked()) {
      yield EventUtils.swipe(lockscreen, 200, 700, 200, 100, 500, nextStep);

      // And wait for the unlock animation to complete
      yield until(function() !isLocked(), nextStep);
    }

    // Find all the icons on the homescreen
    var icons = contentDoc.querySelectorAll('#apps > .page > .icon');
    silentOK(icons.length > 0, 'no homescreen icons found');
    var icon = null;

    // Look through them for the one that launches the specified app
    for (var i = 0; i < icons.length; i++) {
      if (icons[i].dataset.url === url) {
        icon = icons[i];
        break;
      }
    }

    silentOK(icon, 'no icon found for ' + url);

    // Before we launch the app, register an event handler that will notice
    // when the app's window appears
    var windowContainer = contentDoc.getElementById('windows');
    var appframe = null;
    windowContainer.addEventListener('DOMNodeInserted', function handler(e) {
      windowContainer.removeEventListener('DOMNodeInserted', handler);
      appframe = e.target;
      silentOK(appframe, 'got a newly launched window');
      nextStep();
    });

    // Now, click on the icon.
    // The homescreen IconGrid doesn't do anything with click events. It wants
    // mousedown/mouseup.  Since these events are dispatched synchronously
    // we've got to to do them in a set timeout, or otherwise the nextStep()
    // in the event handler above will fire before we can call yield
    yield setTimeout(function() {
      EventUtils.sendMouseEvent({type: 'mousedown'}, icon);
      EventUtils.sendMouseEvent({type: 'mouseup'}, icon);
    }, 0);

    // We've got a new iframe now, but we may need to wait until
    // it has a src attribute set
    yield until(function() appframe.src, nextStep);

    // Now wait until the frame's content document has a readyState of complete
    let win = appframe.contentWindow.wrappedJSObject;
    yield until(function() win.document.readyState === 'complete', nextStep);

    // Give the app one more chance to settle down.
    // I'm not really sure why this line needs to be here, but it seems
    // to prevent a very strange intermittent failure in one of the
    // dialer tests.
    yield setTimeout(nextStep, 0);

    // We now have a newly-launched app in an iframe, and it is time
    // to call the test function for this app. This should work with
    // regular functions and generator functions also. For generators,
    // the third argument is the nextStep function to call
    try {
      if (testfunc) {
        let generator = testfunc(win, win.document,
                                 function() {
                                   try {
                                     generator.next();
                                   }
                                   catch (e if e instanceof StopIteration) {
                                     nextStep();
                                   }
                                 });

        // If the test function does, in fact, return a generator, then we
        // need to yield until that nested generator throws StopIteration, at
        // which point the code above will resume us.
        if (generator && 'next' in generator) {
          yield generator.next();
        }
      }
    }
    catch (e) {
      // Any exception from the test function gets reported as a failed test
      ok(false, 'Exception in testApp() test function: ' +
         e.toString() + ' ' + e.fileName + ':' + e.lineNumber +
        '\n' + e.stack);
    }
    finally {
      // At this point, testing is complete. Now we kill the app and re-lock
      // the screen.  And we do this even if there was a failure above.

      // Bring up the task switcher with a long press
      EventUtils.synthesizeKey('VK_HOME', {type: 'keydown'}, contentWin);
      yield setTimeout(function() {
        EventUtils.synthesizeKey('VK_HOME', {type: 'keyup'}, contentWin);
        nextStep();
      }, 1100);

      // Wait until the task switcher has some tasks in it
      let closeselector = '#taskManager > ul > li > a';
      yield until(
        function() contentDoc.querySelectorAll(closeselector).length > 0,
        nextStep);

      // Find all the close buttons in the task switcher
      // There should only be one task open, but click all buttons if more.
      var closebtns = contentDoc.querySelectorAll('#taskManager > ul > li > a');
      silentOK(closebtns.length === 1,
               closebtns.length + ' tasks running; expected 1.');
      for (var i = 0; i < closebtns.length; i++) {
        var btn = closebtns[i];
        EventUtils.sendMouseEvent({type: 'click'}, btn);
      }

      // Wait a bit for the app to close
      yield until(function() appframe.parentNode == null, nextStep);

      // Now send a sleep button event.  This should lock the screen
      // and it might also turn the screen off.
      EventUtils.sendKey('SLEEP', contentWin);

      // Wait until it is locked
      yield until(
        function() lockscreen.style.MozTransform !== 'translateY(-100%)',
        nextStep);
    }
  }
}


const kDefaultWait = 2000;

// Until we have a better mechanism, disable mozbrowser for testing
SpecialPowers.setBoolPref('dom.mozBrowserFramesEnabled', false);

// Wait for a condition and call a supplied callback if condition is met within
// alloted time. If condition is not met, cause a hard failure,
// stopping the test.
function waitFor(callback, test, timeout) {
  if (test()) {
    callback();
    return;
  }

  timeout = timeout || Date.now();
  if (Date.now() - timeout > kDefaultWait)
    throw 'waitFor timeout';
  setTimeout(waitFor, 50, callback, test, timeout);
}

if (typeof content.ready === 'undefined') {
  try {
    content.ready = !!content.wrappedJSObject.Gaia.AppManager.installedApps;
    if (content.ready)
      content.wrappedJSObject.LockScreen.unlock();
  } catch (e) {
    content.ready = false;
  }

  window.addEventListener('ContentStart', function waitForContentStart(evt) {
    content.removeEventListener('ContentStart', waitForContentStart);

    content.addEventListener('message', function waitForReady(evt) {
       if (evt.data != 'homescreenready')
          return;

      content.removeEventListener('message', waitForReady);

      content.wrappedJSObject.LockScreen.unlock();
      content.ready = true;
    });
  });
}

function getWindowManager(callback) {
  waitFor(function() {
    let contentWindow = content.wrappedJSObject;
    setTimeout(function() {
      callback(contentWindow.getApplicationManager());
    }, 0);
  }, function() {
    return content.ready;
  }, Date.now() + 5000);
}

function ApplicationObserver(application, readyCallback, closeCallback) {
  content.addEventListener('message', function waitForReady(evt) {
    if (evt.data != 'appready')
      return;

    content.removeEventListener('message', waitForReady);

    setTimeout(function() {
      readyCallback(application);
    }, 0);
  });

  application.addEventListener('appclose', function waitForClose(evt) {
    application.removeEventListener('appclose', waitForClose);

    setTimeout(function() {
      closeCallback();
    }, 0);
  });
}

