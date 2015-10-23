'use strict';
/* global Icon, eventSafety, Service */
(function(exports) {

exports.TaskManagerUtils = {

  getDisplayUrlForApp(app) {
    var url = '';
    if (app.isBrowser()) {
      url = app.config.url || app.origin;
      // Do not display the URL when browsing an app page. This is
      // encountered for use-cases like the private browser splash page.
      if (url.startsWith('app://')) {
        url = '';
      }
    } else {
      var frame = app.getFrameForScreenshot();
      if (frame && frame.src) {
        var srcUrl = new URL(frame.src);
        var originUrl = new URL(app.origin);
        var isSameOrigin = (srcUrl.protocol === originUrl.protocol &&
                            srcUrl.hostname === originUrl.hostname &&
                            srcUrl.port === originUrl.port);

        url = srcUrl.protocol + '//' + srcUrl.hostname;

        if (srcUrl.protocol === 'app:' || isSameOrigin) {
          url = '';
        }
      }
    }

    // Strip the protocol.
    if (url) {
      try {
        url = url.substring(url.indexOf(new URL(url, app.origin).host));
      } catch(e) {
      }
    }

    return url;
  },

  loadAppIcon(app, element, size) {
    return app.getSiteIconUrl(size).then((iconObject) => {
      if (iconObject && iconObject.originalUrl) {
        var icon = new Icon(element, iconObject.originalUrl);
        icon.renderBlob(iconObject.blob, { size: size });
      }
    }, (err) => {
      console.warn('getSiteIconUrl failed to resolve an icon:', err.message);
    }).then(() => {
      element.classList.remove('pending');
    });
  },

  /**
   * Load a screenshot of the app into an element, only if the app is active.
   * If it isn't, just use -moz-element as the background image.
   */
  loadAppScreenshot(app, element) {
    var isActive = (Service.query('AppWindowManager.getActiveWindow') ===
                    app.getBottomMostWindow());
    element.classList.toggle('fullscreen', !!(isActive && app.isFullScreen()));
    element.classList.toggle('maximized',
      !!(isActive && app.appChrome && app.appChrome.isMaximized()));

    var screenshot = 'none';
    if (isActive) {
      var screenshotUrl = app.requestScreenshotURL();
      if (screenshotUrl) {
        screenshot = 'url(' + screenshotUrl + ')';
      }
    }
    element.style.backgroundImage =
      `${screenshot}, -moz-element(#${app.instanceID})`;
  },

  waitForAppToClose(app) {
    if (!app) {
      return Promise.resolve();
    } else if (app.isHomescreen) {
      return eventSafety(window, 'homescreenclosed', 400);
    } else {
      return eventSafety(window, 'appclosed', 400);
    }
  },

  waitForScreenToBeReady() {
    var defaultOrientation = Service.query('defaultOrientation');
    var currentOrientation = Service.query('fetchCurrentOrientation');

    screen.mozLockOrientation(defaultOrientation);

    if (document.mozFullScreen) {
      document.mozCancelFullScreen();
    }

    var promisesToWaitFor = [];

    if (Service.query('keyboardEnabled')) {
      promisesToWaitFor.push(eventSafety(window, 'keyboardhidden', 400));
    }

    if (defaultOrientation.split('-')[0] !==
        currentOrientation.split('-')[0]) {
      promisesToWaitFor.push(eventSafety(window, 'resize', 400));
    }

    return Promise.all(promisesToWaitFor).then(() => {
      var app = Service.query('AppWindowManager.getActiveWindow');
      if (app && !app.isHomescreen) {
        return new Promise((resolve) => {
          app.getScreenshot(resolve, 0, 0, 400);
        });
      }
    });
  },

};

})(window);
