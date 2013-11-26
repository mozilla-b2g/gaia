'use strict';

/**
 * Set up event handlers for user interactions
 */
function addEventListeners() {
  var closeBtn = document.getElementById('close-btn');
  if (closeBtn) {
    closeBtn.onclick = function closeClick() {
      window.close();
    };
  }
  var retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.onclick = function retryClick() {
      window.location.reload(true);
    };
  }
}

/**
 * Populate element with localized string
 */
function localizeElement(el, key, args) {
  el.innerHTML = '';
  var text = navigator.mozL10n.get(key, args);
  el.appendChild(document.createTextNode(text));
}

/**
 * Display appropriate error messages
 */
function populateErrorMessage() {
  var title = document.getElementById('error-title');
  localizeElement(title, 'network-connection-unavailable');
  var message = document.getElementById('error-message');
  localizeElement(message, 'network-error', {
    name: location.protocol + '//' + location.host
  });
}

addEventListeners();
navigator.mozL10n.ready(populateErrorMessage);
