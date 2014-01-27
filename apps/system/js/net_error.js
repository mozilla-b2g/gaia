(function(window) {
  'use strict';

  /**
   * Return the current application object
   */
  var _app;
  function getAppObject(cb) {
    if (_app) {
      cb(_app);
      return;
    }

    var request = navigator.mozApps.getSelf();
    request.onsuccess = function() {
      cb(request.result);
    };
    request.onerror = function() {
      console.warn('about:netError error fetching app: ' + request.error.name);
      cb();
    };
  }

  /**
   * Check if net_error is coming from within an iframe
   */
  function isFramed() {
    var error = getErrorFromURI();
    var manifestURL = error.m;

    // frame type values (regular, browser, app)
    var frameType = error.f;
    switch (frameType) {

      // if we are in a "regular" frame, we are indeed framed
      case 'regular':
        return true;

      // if we are an "app" frame, we are not framed
      case 'app':
        return false;

      // If we are in a "browser" frame, we are either in a browser tab
      // or a mozbrowser iframe within in app. Since browser tabs are
      // considered unframed, we must perform a check here to distinguish
      // between the two cases.
      case 'browser':
        return manifestURL !== window.BROWSER_MANIFEST;

      default:
        throw new Error('about:netError: invalid frame type - ' + frameType);
    }
  }

  /**
   * Set up event handlers for a net_error iframe
   */
  function addFrameHandlers() {
    document.body.onclick = function bodyClick() {
      document.getElementById('retry-icon').classList.remove('still');
      window.location.reload(true);
    };
  }

  /**
   * Set up event handlers for an app net_error page
   */
  function addAppHandlers() {
    var closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
      closeBtn.onclick = function closeClick(evt) {
        evt.preventDefault();
        window.close();
      };
    }
    var retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.onclick = function retryClick(evt) {
        evt.preventDefault();
        window.location.reload(true);
      };
    }
  }

  /**
   * Retrieve the application name, if we are not in the context
   * of an app simply return the URI
   */
  function getAppName(cb) {
    getAppObject(function(app) {
      if (app && app.manifest.name) {
        cb(app.manifest.name);
      } else {
        cb(location.protocol + '//' + location.host);
      }
    });
  }

  /**
   * Populate element with localized string
   */
  function localizeElement(el, key, args) {
    el.textContent = navigator.mozL10n.get(key, args);
  }

  /**
   * Display messages for a net_error iframe
   */
  function populateFrameMessages() {
    var title = document.getElementById('error-title');
    var message = document.getElementById('error-message');

    var error = getErrorFromURI();
    switch (error.e) {
      case 'dnsNotFound': {
        localizeElement(title, 'server-not-found');
        localizeElement(message, 'server-not-found-error', {
          name: location.host
        });
      }
      break;

      case 'netOffline': {
        localizeElement(title, 'unable-to-connect');
        localizeElement(message, 'tap-to-retry');
      }
      break;

      default: {
        // When we're a browser iframe used for generic content we'll use
        // the default error message from gecko for all errors that are
        // not directly dealt with.
        localizeElement(title, 'unable-to-connect');
        // The error message is already localized. Set it directly.
        message.textContent = error.d;
      }
    }
  }

  /**
   * Display messages for an app net_error
   */
  function populateAppMessages() {
    var title = document.getElementById('error-title');
    var message = document.getElementById('error-message');

    var error = getErrorFromURI();
    switch (error.e) {
      case 'dnsNotFound': {
        localizeElement(title, 'server-not-found');
        localizeElement(message, 'server-not-found-error', {
          name: location.host
        });
      }
      break;

      case 'netOffline': {
        getAppName(function(appName) {
          localizeElement(title, 'network-connection-unavailable');
          localizeElement(message, 'network-error', {
            name: appName
          });
        });
      }
      break;

      default: {
        getAppName(function(appName) {
          // Same thing when we're an iframe for an application.
          localizeElement(title, 'unable-to-connect');
          // The error message is already localized. Set it directly.
          message.textContent = error.d;
        });
      }
    }
  }

  /**
   * Mark this page as being in an iframe
   */
  function applyFrameStyle() {
    document.body.classList.add('framed');
  }

  /**
   * Mark this page as being an app
   */
  function applyAppStyle() {
    document.body.classList.add('no-frame');
  }

  /**
   * Parse the neterror information that's sent to us as part of the documentURI
   * and return an error object.
   *
   * The error object will contain the following attributes:
   * e - Type of error (eg. 'netOffline').
   * u - URL that generated the error.
   * m - Manifest URI of the application that generated the error.
   * c - Character set for default gecko error message (eg. 'UTF-8').
   * d - Default gecko error message.
   * f - The frame type ("regular", "browser", "app")
   */
  var _error;
  function getErrorFromURI() {
    if (_error) {
      return _error;
    }
    _error = {};
    var uri = document.documentURI;

    // Quick check to ensure it's the URI format we're expecting.
    if (!uri.startsWith('about:neterror?')) {
      // A blank error will generate the default error message (no network).
      return _error;
    }

    // Small hack to get the URL object to parse the URI correctly.
    var url = new URL(uri.replace('about:', 'http://'));

    // Set the error attributes.
    ['e', 'u', 'm', 'c', 'd', 'f'].forEach(
      function(v) {
        _error[v] = url.searchParams.get(v);
      }
    );

    return _error;
  }

  /**
   * Initialize the page
   */
  function initPage() {
    // net_error.html will either be loaded in the browser,
    // in a top level app (hosted/bookmarked), or an iFrame.
    // We need to display different information/user flows
    // based on these states.
    if (isFramed()) {
      applyFrameStyle();
      populateFrameMessages();
      addFrameHandlers();
    } else {
      applyAppStyle();
      populateAppMessages();
      addAppHandlers();
    }
  }

  navigator.mozL10n.ready(initPage);
}(this));
