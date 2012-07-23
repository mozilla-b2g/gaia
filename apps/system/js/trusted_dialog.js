/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var TrustedDialog = (function() {
  var lastDisplayedApp = null;
  var trustedDialogElement = document.getElementById('trustedDialog');
  var currentFrame = null;

  function open(url, callback) {
    if (!url)
      return;

    // If the trusted dialog is being shown we swap frames.
    if (trustedDialogIsShown()) {
      trustedDialogElement.removeChild(currentFrame);
      currentFrame = null;
    } else {
      // Save the current displayed app in order to show it after closing the
      // trusted dialog.
      lastDisplayedApp = WindowManager.getDisplayedApp();
      // Show the homescreen.
      WindowManager.setDisplayedApp(null);
    }

    // Create the iframe to be shown as a trusted dialog.
    var frame = document.createElement('iframe');
    frame.setAttribute('mozbrowser', 'true');
    frame.classList.add('frame');
    frame.classList.add('screen');
    frame.src = url;
    if (callback)
      frame.addEventListener('mozbrowserloadend', callback);
    trustedDialogElement.appendChild(frame);
    currentFrame = frame;

    if (!trustedDialogIsShown()) {
      // Make the trusted dialog overlay active.
      trustedDialogElement.classList.add('active');
      // Make sure we're in portrait mode.
      screen.mozLockOrientation('portrait');
    }

    return frame;
  };

  function close(callback) {
    if (!trustedDialogIsShown())
      return;

    // Make the trusted dialog overlay inactive and remove the frame from
    // the trusted dialog container.
    trustedDialogElement.classList.remove('active');
    trustedDialogElement.removeChild(currentFrame);
    currentFrame = null;
    // Shows the previously displayed app.
    WindowManager.setDisplayedApp(lastDisplayedApp);
    lastDisplayedApp = null;
    // Switch back to apps orientation.
    WindowManager.setOrientationForApp(lastDisplayedApp);

    callback();
  };

  function trustedDialogIsShown() {
    if (!trustedDialogElement)
      trustedDialogElement = document.getElementById('trustedDialog');
    return trustedDialogElement.classList.contains('active');
  };

  function getFrame() {
    return currentFrame;
  };

  window.addEventListener('mozChromeEvent', function(e) {
    switch (e.detail.type) {
      // Chrome asks Gaia to create a trusted iframe. Once it is created,
      // Gaia sends the iframe back to chrome so frame scripts can be loaded
      // as part of the iframe content.
      case 'open-trusted-dialog':
        if (!e.detail.trustedFrame)
          return;
        var frame = TrustedDialog.open(e.detail.trustedFrame);
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('mozContentEvent', true, true,
                              {id: e.detail.id, frame: frame});
        window.dispatchEvent(event);
        break;

      // Chrome is asking Gaia to close the current trusted dialog. Once it is
      // closed, Gaia notifies back to the chrome.
      case 'close-trusted-dialog':
        TrustedDialog.close(function closeTrustedDialog() {
          var event = document.createEvent('customEvent');
          event.initCustomEvent('mozContentEvent', true, true,
                                {id: e.detail.id});
          window.dispatchEvent(event);
        });
        break;
    }
  });

  return {
    open: open,
    close: close,
    trustedDialogIsShown: trustedDialogIsShown,
    getFrame: getFrame
  };
})();
