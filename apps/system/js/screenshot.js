// screenshot.js: system screenshot module
//
// This system module takes a screenshot of the currently running app
// or homescreen and stores it with DeviceStorage when the user
// presses the home and sleep buttons at the same time. It communicates
// with gecko code running in b2g/chrome/content/shell.js using a private
// event-based API. It is the gecko code that creates and saves the screenshot.
//
// Other modules that listen for the home and sleep buttons should
// ignore those events if defaultPrevented is set on them. Note that
// defaultPrevented will only be set on the key up events and the key
// down event for the button that was pressed second. The key down
// event for the button that is pressed first will not be defaultPrevented.
//
// This script must be used with the defer attribute.
//
// This script probably needs to run before the window_manager.js script
// which tries to prevent propagation of the HOME key to other modules.
//
(function() {
  // Register capturing handlers for both keydown and keyup
  window.addEventListener('keydown', keyDownHandler, true);
  window.addEventListener('keyup', keyUpHandler, true);

  // The current state of the two keys we care about
  var homeKeyDown = false, sleepKeyDown = false;

  var preventDefaultOnHomeKeyUp = false;
  var preventDefaultOnSleepKeyUp = false;

  function keyDownHandler(e) {
    if (e.keyCode === e.DOM_VK_HOME)
      homeKeyDown = true;
    if (e.keyCode === e.DOM_VK_SLEEP)
      sleepKeyDown = true;
    if (homeKeyDown && sleepKeyDown) {
      e.preventDefault();
      takeScreenshot();
      preventDefaultOnHomeKeyUp = true;
      preventDefaultOnSleepKeyUp = true;
    }
  }

  function keyUpHandler(e) {
    if (e.keyCode === e.DOM_VK_HOME) {
      homeKeyDown = false;
      if (preventDefaultOnHomeKeyUp) {
        e.preventDefault();
        preventDefaultOnHomeKeyUp = false;
      }
    }
    if (e.keyCode === e.DOM_VK_SLEEP) {
      sleepKeyDown = false;
      if (preventDefaultOnSleepKeyUp) {
        e.preventDefault();
        preventDefaultOnSleepKeyUp = false;
      }
    }
  }


  function takeScreenshot() {
    // Give feedback that the screenshot request was received
    navigator.mozVibrate(100);

    // Let chrome know we'd like a screenshot.
    // This is a completely non-standard undocumented API
    // for communicating with our chrome code.
    var screenshotProps = {
      detail: {
        type: 'save-screenshot'
      }
    };
    window.dispatchEvent(new CustomEvent('mozContentEvent', screenshotProps));
  }

  var _ = navigator.mozL10n.get;

  // Handle notifications that screenshots have been taken
  window.addEventListener('mozChromeEvent', function ss_onMozChromeEvent(e) {
    if (e.detail.type === 'save-screenshot-success') {
      // Vibrate again when the screenshot is saved
      navigator.mozVibrate(100);

      // Display filename in a notification
      navigator.mozNotification
        .createNotification(_('screenshotSaved'), e.detail.filename)
        .show();
    }
    else if (e.detail.type === 'save-screenshot-no-card') {
      // Display filename in a notification
      navigator.mozNotification
        .createNotification(_('screenshotFailed'), _('screenshotNoSDCard'))
        .show();
    }
    else if (e.detail.type === 'save-screenshot-error') {
      // Display filename in a notification
      navigator.mozNotification
        .createNotification(_('screenshotFailed'),
                            _('screenshotStorageError', e.detail))
        .show();
    }
  });
}());
