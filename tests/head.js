
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

// XXX the tests are initially started a little too early
// contrary to classic browser chrome tests we need to load Gaia first
// while waiting for a better readiness test at least this is isolated
// (and we're only waiting once)
var gaiaReady = false;
setTimeout(function() {
  gaiaReady = true;
}, 500);

function appTest(callback) {
  waitFor(function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    contentWindow.Gaia.lockScreen.unlock(-1, true);

    var AppManager = contentWindow.Gaia.AppManager;
    callback(AppManager);
  }, function() {
    return gaiaReady;
  });
}

registerCleanupFunction(function() {
  let contentWindow = shell.home.contentWindow.wrappedJSObject;
  contentWindow.Gaia.lockScreen.unlock(-1, true);

  let AppManager = contentWindow.Gaia.AppManager;
  AppManager.runningApps.forEach(function(app) {
    AppManager.close(app.url);
  });
});
