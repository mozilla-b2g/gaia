// screenshot.js: system screenshot module
//
// This system module takes a screenshot of the currently running app
// or homescreen and stores it with DeviceStorage when the user
// presses the home and sleep buttons at the same time. It communicates
// with gecko code running in b2g/chrome/content/shell.js using a private
// event-based API. It is the gecko code that creates the screenshot.
//
// This script must be used with the defer attribute.
//
//
(function() {
  window.addEventListener('home+sleep', takeScreenshot);

  function takeScreenshot() {
    // Give feedback that the screenshot request was received
    navigator.vibrate(100);

    // Let chrome know we'd like a screenshot.
    // This is a completely non-standard undocumented API
    // for communicating with our chrome code.
    var screenshotProps = {
      detail: {
        type: 'take-screenshot'
      }
    };
    window.dispatchEvent(new CustomEvent('mozContentEvent', screenshotProps));
  }

  var _ = navigator.mozL10n.get;

  // Handle notifications that screenshots have been taken
  window.addEventListener('mozChromeEvent', function ss_onMozChromeEvent(e) {
    try {
      if (e.detail.type === 'take-screenshot-success') {
        var storage = navigator.getDeviceStorage('pictures')[0];
        if (!storage) { // If we don't have an SD card to save to, send an error
          navigator.mozNotification
            .createNotification(_('screenshotFailed'), _('screenshotNoSDCard'))
            .show();
          return;
        }

        var filename = 'screenshots/' +
          new Date().toISOString().slice(0, -5).replace(/[:T]/g, '-') +
          '.png';

        var saveRequest = storage.addNamed(e.detail.file, filename);
        saveRequest.onsuccess = function ss_onsuccess() {
          // Vibrate again when the screenshot is saved
          navigator.vibrate(100);

          // Display filename in a notification
          navigator.mozNotification
            .createNotification(_('screenshotSaved'), filename)
            .show();
        };
        saveRequest.onerror = function ss_onerror() {
          navigator.mozNotification
            .createNotification(_('screenshotFailed'), saveRequest.error.name)
            .show();
        };
      }
      else if (e.detail.type === 'take-screenshot-error') {
        navigator.mozNotification
          .createNotification(_('screenshotFailed'), e.detail.error)
          .show();
      }
    }
    catch (e) {
      console.log('exception in screenshot handler', e);
    }
  });
}());
