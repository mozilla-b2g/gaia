'use strict';

function sendEvent(what) {
  var event = new CustomEvent('mozContentEvent', { detail: what });
  window.dispatchEvent(event);
}

function init() {
  var buttonYes = document.querySelector('button[data-l10n-id=safemode-yes]');
  buttonYes.addEventListener('click', () => { sendEvent('safemode-yes'); });

  var buttonNo = document.querySelector('button[data-l10n-id=safemode-no]');
  buttonNo.addEventListener('click', () => { sendEvent('safemode-no'); });
}

document.addEventListener('DOMContentLoaded', init);
