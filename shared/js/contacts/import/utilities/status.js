/* global LazyLoader */
'use strict';

var utils = window.utils || {};

utils.status = (function() {
  var STATUS_TIME = 2000;
  var statusMsg = document.querySelector('#statusMsg');
  var hidingTimeout;
  var transitionEndTimeout;
  // Additional paragraph just in case the status msg has more than one line
  var additionalLine;

  var hideAnimationDone = function() {
    statusMsg.removeEventListener('transitionend', hideAnimationDone);
    statusMsg.classList.add('hidden');
  };
  var showAnimationDone = function() {
    if (transitionEndTimeout) {
      clearTimeout(transitionEndTimeout);
    }
    statusMsg.removeEventListener('transitionend', showAnimationDone);
    hidingTimeout = setTimeout(utils.status.hide, STATUS_TIME);
  };

  var hideStatus = function() {
    statusMsg.addEventListener('transitionend', hideAnimationDone);
    statusMsg.classList.remove('opening');
    statusMsg.classList.remove('bannerStart');
    statusMsg.querySelector('p').removeAttribute('data-l10n-id');
    if (additionalLine) {
      statusMsg.removeChild(additionalLine);
      additionalLine = null;
    }
  };

  var setL10nAttributes = function(node, l10n) {
    if (typeof l10n === 'string') {
      node.setAttribute('data-l10n-id', l10n);
    } else {
      navigator.mozL10n.setAttributes(node, l10n.id, l10n.args);
    }
  };

  var showStatus = function(textId, additionalId) {
    // clean listeners in case of previous race conditions
    statusMsg.removeEventListener('transitionend', showAnimationDone);
    statusMsg.removeEventListener('transitionend', hideAnimationDone);

    LazyLoader.load([statusMsg], function _loaded() {
      setL10nAttributes(statusMsg.querySelector('p'), textId);

      if (additionalId) {
        additionalLine = document.createElement('p');
        statusMsg.appendChild(additionalLine);
        setL10nAttributes(additionalLine, additionalId);
      }

      // If showing already, we increase the time after the change
      if (statusMsg.classList.contains('opening')) {
        clearTimeout(hidingTimeout);
        hidingTimeout = setTimeout(hideStatus, STATUS_TIME);
        return;
      }

      statusMsg.classList.remove('hidden');
      statusMsg.addEventListener('transitionend', showAnimationDone);
      setTimeout(function displaying() {
        statusMsg.classList.add('opening');
        statusMsg.classList.add('bannerStart');
        transitionEndTimeout = setTimeout(showAnimationDone, STATUS_TIME);
      }, 10); // Give the opportunity to paint the UI component
    });
  };
  return {
    show: showStatus,
    hide: hideStatus
  };
})();
