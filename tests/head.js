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

if (typeof content.ready === 'undefined') {
  try {
    content.ready = !!content.wrappedJSObject.LockScreen;
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

