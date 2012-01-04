
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

function test() {
  waitForExplicitFinish();

  function testDialerAndFinish() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    var AppManager = contentWindow.Gaia.AppManager;

    // TODO Do a test here!
    todo(false);
    finish();
  }

  waitFor(testDialerAndFinish, function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    return 'Gaia' in contentWindow;
  });
}

test();
