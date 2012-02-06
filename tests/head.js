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
if (typeof readyAndUnlocked === 'undefined') {
  readyAndUnlocked = false;

  waitFor(function() {
    var contentWindow = content.wrappedJSObject;
    contentWindow.addEventListener('unlocked', function waitUnlocked() {
      contentWindow.removeEventListener('unlocked', waitUnlocked);
      readyAndUnlocked = true;
    });

    contentWindow.addEventListener('locked', function waitLocked() {
      contentWindow.removeEventListener('locked', waitLocked);
      contentWindow.Gaia.lockScreen.unlock(-1, true);
    });
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
