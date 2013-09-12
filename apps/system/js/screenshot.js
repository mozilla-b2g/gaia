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

  // Assume that the maximum screenshot size is 4 bytes per pixel
  // plus a bit extra. In practice, with compression, our PNG files will be
  // much smaller than this.
  var MAX_SCREENSHOT_SIZE = window.innerWidth * window.innerHeight * 4 + 4096;

  function takeScreenshot() {
    // Give feedback that the screenshot request was received
    navigator.vibrate(100);

    // We don't need device storage here, but check to see that
    // it is available before sending the screenshot request to chrome.
    // If device storage is available, the callback will be called.
    // Otherwise, an error message notification will be displayed.
    getDeviceStorage(function() {
      // Let chrome know we'd like a screenshot.
      // This is a completely non-standard undocumented API
      // for communicating with our chrome code.
      var screenshotProps = {
        detail: {
          type: 'take-screenshot'
        }
      };
      window.dispatchEvent(new CustomEvent('mozContentEvent', screenshotProps));
    });
  }

  // Display a screenshot success or failure notification.
  // Localize the first argument, and localize the third if the second is null
  function notify(titleid, body, bodyid) {
    var title = navigator.mozL10n.get(titleid) || titleid;
    body = body || navigator.mozL10n.get(bodyid);
    navigator.mozNotification.createNotification(
      title, body, 'style/icons/Gallery.png').show();
  }

  // Get a DeviceStorage object and pass it to the callback.
  // Or, if device storage is not available, display a notification.
  function getDeviceStorage(callback) {
    var storage = navigator.getDeviceStorage('pictures');
    var availreq = storage.available();
    availreq.onsuccess = function() {
      var state = availreq.result;
      if (state === 'unavailable') {
        notify('screenshotFailed', null, 'screenshotNoSDCard');
      }
      else if (state === 'shared') {
        notify('screenshotFailed', null, 'screenshotSDCardInUse');
      }
      else if (state === 'available') {
        var freereq = storage.freeSpace();
        freereq.onsuccess = function() {
          if (freereq.result < MAX_SCREENSHOT_SIZE) {
            notify('screenshotFailed', null, 'screenshotSDCardLow');
          }
          else {
            callback(storage);
          }
        };
        freereq.onerror = function() {
          notify('screenshotFailed', freereq.error && freereq.error.name);
        };
      }
    };
    availreq.onerror = function() {
      notify('screenshotFailed', availreq.error && availreq.error.name);
    };
  }

  // Handle the event we get from chrome with the screenshot
  window.addEventListener('mozChromeEvent', function ss_onMozChromeEvent(e) {
    try {
      if (e.detail.type === 'take-screenshot-success') {
        getDeviceStorage(function(storage) {
          var d = new Date();
          d = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
          var filename = 'screenshots/' +
            d.toISOString().slice(0, -5).replace(/[:T]/g, '-') +
            '.png';

          var saveRequest = storage.addNamed(e.detail.file, filename);

          saveRequest.onsuccess = function ss_onsuccess() {
            // Vibrate again when the screenshot is saved
            navigator.vibrate(100);

            // Display filename in a notification
            notify('screenshotSaved', filename);
          };

          saveRequest.onerror = function ss_onerror() {
            notify('screenshotFailed', saveRequest.error.name);
          };
        });
      }
      else if (e.detail.type === 'take-screenshot-error') {
        notify('screenshotFailed', e.detail.error);
      }
    }
    catch (e) {
      console.log('exception in screenshot handler', e);
      notify('screenshotFailed', e.toString());
    }
  });
}());
