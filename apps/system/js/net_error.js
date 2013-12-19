'use strict';
(function(window) {
  function isFramed() {
    return window !== window.parent;
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
        localizeElement(title, 'unable-to-connect');
        localizeElement(message, 'tap-to-retry');
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
        localizeElement(title, 'network-connection-unavailable');
        localizeElement(message, 'network-error', {
          name: location.protocol + '//' + location.host
        });
      }
      break;

      default: {
        localizeElement(title, 'network-connection-unavailable');
        localizeElement(message, 'network-error', {
          name: location.protocol + '//' + location.host
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
   */
  function getErrorFromURI() {
    var error = {};
    var uri = document.documentURI;

    // Quick check to ensure it's the URI format we're expecting.
    if (!uri.startsWith('about:neterror?')) {
      // A blank error will generate the default error message (no network).
      return error;
    }

    // Small hack to get the URL object to parse the URI correctly.
    var url = new URL(uri.replace('about:', 'http://'));

    // Set the error attributes.
    ['e', 'u', 'm', 'c', 'd'].forEach(
      function(v) {
        error[v] = url.searchParams.get(v);
      }
    );

    return error;
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
