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
if (typeof content.ready === 'undefined') {
  content.ready = false;

  content.addEventListener('message', function waitForReady(evt) {
    if (!evt || evt.data != 'appready')
      return;

    content.removeEventListener('message', waitForReady);

    content.wrappedJSObject.Gaia.lockScreen.unlock(-1);
    setTimeout(function() {
      content.ready = true;
    }, 0);
  });
}

// TODO Get rid of this helper.
function getApplicationManager(callback) {
  waitFor(function() {
    let contentWindow = content.wrappedJSObject;
    callback(contentWindow.getApplicationManager());
  }, function() {
    dump('&&&&&&&&&&&&&&&&&&&&&&&&&& here!\n');
    return content.ready;
  }, Date.now() + 5000);
}

function ApplicationObserver(application, readyCallback, closeCallback) {
  content.addEventListener('message', function waitForReady(evt) {
    if (evt.data != 'appready')
      return;

    content.removeEventListener('message', waitForReady);
    readyCallback(application);
  });

  application.addEventListener('appclose', function waitForClose(evt) {
    application.removeEventListener('appclose', waitForClose);
    closeCallback();
  });
}
