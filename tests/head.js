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
    var contentWindow = shell.home.contentWindow.wrappedJSObject;
    contentWindow.addEventListener('unlocked', function waitUnlocked() {
      contentWindow.removeEventListener('unlocked', waitUnlocked);
      readyAndUnlocked = true;
    });

    contentWindow.addEventListener('locked', function waitLocked() {
      contentWindow.removeEventListener('locked', waitLocked);
      contentWindow.Gaia.lockScreen.unlock(-1, true);
    });
  }, function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    return ('Gaia' in contentWindow) && ('lockScreen' in contentWindow.Gaia);
  });
}

function appTest(url, callback) {
  waitForExplicitFinish();

  waitFor(function() {
    var contentWindow = shell.home.contentWindow.wrappedJSObject;
    var AppManager = contentWindow.Gaia.AppManager;
    AppManager.launch(url);

    contentWindow.addEventListener('appopen', function launchWait() {
      contentWindow.removeEventListener('appopen', launchWait);

      callback(AppManager.foregroundWindow);

      // cleaning up
      waitFor(function() {
        AppManager.close();
        contentWindow.addEventListener('appclose', function closeWait() {
          contentWindow.removeEventListener('appclose', closeWait);
          AppManager.kill(url);

          finish();
        });
      }, function() {
        return SimpleTest.__appTestFinished;
      }, (Date.now() + 5000));
    });
  }, function() {
    return readyAndUnlocked;
  });
}

