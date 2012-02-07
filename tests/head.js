const kDefaultWait = 2000;
// Wait for a condition and call a supplied callback if condition is met within
// alloted time. If condition is not met, cause a hard failure,
// stopping the test.
function waitFor(callback, test, timeout, nothrow) {
  if (test()) {
    callback();
    return;
  }

  timeout = timeout || Date.now();
  if (Date.now() - timeout > kDefaultWait) {
    if (nothrow === true) {
      callback();
      return;
    } else {
      throw 'waitFor timeout ' + test.toString();
    }
  }
  setTimeout(waitFor, 50, callback, test, timeout, nothrow);
}

// Currently we're waiting for the lockscreen to be auto-locked
// then we're unlocking it and waiting for the custom event to declare
// the tests ready to run.
// see https://github.com/andreasgal/gaia/issues/333
if (typeof readyAndUnlocked === 'undefined') {
  var readyAndUnlocked = false;
  var locked = false;

  waitFor(function() {
    var contentWindow = content.wrappedJSObject;
    function waitLocked() {
      locked = true;
    }

    contentWindow.addEventListener('locked', waitLocked);
    waitFor(function() {
      locked = true;
      contentWindow.removeEventListener('locked', waitLocked);
      contentWindow.addEventListener('unlocked', function waitUnlocked() {
        contentWindow.removeEventListener('unlocked', waitUnlocked);
        readyAndUnlocked = true;
      });
      contentWindow.Gaia.lockScreen.unlock(-1, true);
    }, function() {
      return locked;
    }, 2000, true);
  }, function() {
    let contentWindow = content.wrappedJSObject;
    return ('Gaia' in contentWindow) &&
      ('WindowManager' in contentWindow.Gaia) &&
      ('lockScreen' in contentWindow.Gaia);
  });
}

function getWindowManager(callback) {
  waitFor(function() {
    let contentWindow = content.wrappedJSObject;
    callback(contentWindow.getWindowManager());
  }, function() {
    return readyAndUnlocked;
  });
}

function ApplicationObserver(appFrame, readyCallback, closeCallback) {
  waitFor(function() {
    let applicationWindow = appFrame.contentWindow;

    applicationWindow.addEventListener('appready', function waitForReady(evt) {
      applicationWindow.removeEventListener('appready', waitForReady);
      readyCallback(appFrame);
    });

    applicationWindow.addEventListener('appclose', function waitForClose(evt) {
      applicationWindow.removeEventListener('appclose', waitForClose);
      closeCallback();
    });
  }, function() {
    return 'contentWindow' in appFrame;
  });
}
