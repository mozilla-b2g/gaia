/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

const kDefaultWait = 2000;

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

// Currently we're waiting for the lockscreen to be auto-locked
// then we're unlocking it and waiting for the custom event to declare
// the tests ready to run.
// see https://github.com/andreasgal/gaia/issues/333
let readyAndUnlocked = true;
if (typeof readyAndUnlocked === 'undefined') {
  readyAndUnlocked = false;

  function isReady() {
    let contentWindow = content.wrappedJSObject;
    return ('Gaia' in contentWindow) && ('lockScreen' in contentWindow.Gaia);
  }

  function unlock() {
    let contentWindow = content.wrappedJSObject;

    contentWindow.addEventListener('unlocked', function waitUnlocked() {
      contentWindow.removeEventListener('unlocked', waitUnlocked);
      readyAndUnlocked = true;
    });

    contentWindow.addEventListener('locked', function waitLocked() {
      contentWindow.removeEventListener('locked', waitLocked);
      contentWindow.Gaia.lockScreen.unlock(-1, true);
    });
  }

  waitFor(unlock, isReady);
}

// TODO Get rid of this helper.
function getApplicationManager(callback) {
  waitFor(function() {
    let contentWindow = content.wrappedJSObject;
    callback(contentWindow.getApplicationManager());
  }, function() {
    return readyAndUnlocked;
  });
}

function ApplicationObserver(application, readyCallback, closeCallback) {
  function attachEventsListener() {
    let applicationWindow = application.contentWindow;

    applicationWindow.addEventListener('appready', function waitForReady(evt) {
      applicationWindow.removeEventListener('appready', waitForReady);
      readyCallback(application);
    });

    applicationWindow.addEventListener('appclose', function waitForClose(evt) {
      applicationWindow.removeEventListener('appclose', waitForClose);
      closeCallback();
    });
  }

  function hasContentWindow() {
    return 'contentWindow' in application;
  }

  waitFor(attachEventsListener, hasContentWindow);
}
