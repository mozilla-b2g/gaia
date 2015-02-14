'use strict';
/* global AppWindowManager, IACHandler */
(function(exports) {
  window.addEventListener('iac-screenshot', function(evt) {
    var data = evt.detail.data;
    var app = AppWindowManager.getAppByURL(data.url);
    var screenshotRequest = app.iframe.getScreenshot(
                                              data.maxWidth, data.maxHeight);
    screenshotRequest.onsuccess = function(evt) {
      try {
        var port = IACHandler.getPort('screenshot');
        port.postMessage(this.result);
      } catch (e) {
        console.error('unable to provide screenshot');
      }
    };
    screenshotRequest.onerror = function() {
      console.error('Unable to provide screenshot');
    };
  });
}(window));
