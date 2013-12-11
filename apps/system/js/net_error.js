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
    localizeElement(title, 'unable-to-connect');
    localizeElement(message, 'tap-to-retry');
  }

  /**
   * Display messages for an app net_error
   */
  function populateAppMessages() {
    var title = document.getElementById('error-title');
    var message = document.getElementById('error-message');
    localizeElement(title, 'network-connection-unavailable');
    localizeElement(message, 'network-error', {
      name: location.protocol + '//' + location.host
    });
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
