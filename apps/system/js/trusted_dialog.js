/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var TrustedDialog = (function() {
  var lastDisplayedApp = null;
  var trustedDialogElement = document.getElementById('trustedDialog');

  function open(trustedFrame) {
    if (!trustedFrame)
      return;

    // We only allow one trusted dialog at a time.
    if (trustedDialogIsShown())
      return;

    lastDisplayedApp = WindowManager.getDisplayedApp();

    // Show the homescreen.
    WindowManager.setDisplayedApp(null);

    // Create the iframe to be shown as a trusted dialog.
    var frame = document.createElement('iframe');
    frame.dataset.frameType = 'window';
    frame.dataset.frameOrigin = trustedFrame.url;
    frame.setAttribute('mozbrowser', 'true');
    frame.classList.add('frame');
    frame.classList.add('screen');
    frame.src = trustedFrame.url;
    trustedDialogElement.appendChild(frame);

    // Make the trusted dialog overlay active.
    trustedDialogElement.classList.add('active');

    // Make sure we're in portrait mode.
    screen.mozLockOrientation('portrait');

    return frame;
  };

  function close(callback) {
    if (!trustedDialogIsShown())
      return;

    // Make the trusted dialog overlay inactive.
    trustedDialogElement.classList.remove('active');
    // Shows the previously displayed app.
    WindowManager.setDisplayedApp(lastDisplayedApp);
    // Switch back to apps orientation.
    WindowManager.setOrientationForApp(lastDisplayedApp);

    callback();
  };

  function trustedDialogIsShown() {
    return trustedDialogElement.classList.contains('active');
  };

  window.addEventListener('mozChromeEvent', function(e) {
    console.log("mozChromeEvent.received: " + e.detail.type);
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
    close: close
  };
})();
