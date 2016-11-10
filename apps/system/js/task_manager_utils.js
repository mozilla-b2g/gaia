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
        return new Promise(resolve => {
          icon.renderBlob(iconObject.blob, { size: size, onLoad: resolve });
        });
      }
    }, (err) => {
      element.classList.remove('pending');
      console.warn('getSiteIconUrl failed to resolve an icon:', err.message);
    }).then(() => {
      element.classList.remove('pending');
    });
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
