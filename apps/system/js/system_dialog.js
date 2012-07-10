/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SystemDialog = (function() {
  var lastDisplayedApp = null;
  var systemDialogElement = document.getElementById('systemDialog');

  function open(systemFrame) {
    if (!systemFrame)
      return;

    // We only allow one system dialog at a time.
    if (systemDialogIsShown())
      return;

    lastDisplayedApp = WindowManager.getDisplayedApp();
    console.log("Displayed app: " + lastDisplayedApp);

    // Show the homescreen.
    WindowManager.setDisplayedApp(null);

    // Create the iframe to be shown as a system dialog.
    var frame = document.createElement('iframe');
    frame.dataset.frameType = 'window';
    frame.dataset.frameOrigin = systemFrame.url;
    frame.setAttribute('mozbrowser', 'true');
    frame.classList.add('frame');
    frame.src = systemFrame.url;
    systemDialogElement.appendChild(frame);

    // Make the system dialog overlay active.
    systemDialogElement.classList.add('active');

    // Make sure we're in portrait mode.
    screen.mozLockOrientation('portrait');

    return frame;
  };

  function close(callback) {
    if (!systemDialogIsShown())
      return;

    // Make the system dialog overlay inactive.
    systemDialogElement.classList.remove('active');
    // Shows the previously displayed app.
    WindowManager.setDisplayedApp(lastDisplayedApp);
    // Switch back to apps orientation.
    WindowManager.setOrientationForApp(lastDisplayedApp);

    callback();
  };

  function systemDialogIsShown() {
    console.log("systemDialogIsShown");
    return systemDialogElement.classList.contains('active');
  };

  return {
    open: open,
    close: close
  };
})();
