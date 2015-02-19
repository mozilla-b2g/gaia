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
    if (l10n && l10n.id) {
      navigator.mozL10n.setAttributes(node, l10n.id, l10n.args);
      return true;
    } else {
      console.error('Status arguments must be objects');
      return false;
    }
  };

  /**
   * Fills the DOM with the proper content and makes it visible
   * As parameters, it consums objects of the form
   * {
   *    id: id,
   *    args: args
   * }
   * @param mainMessage: the message to display
   * @param extra: an optional extra line for the message
   */
  var showStatus = function(mainMessage, extra) {
    // clean listeners in case of previous race conditions
    statusMsg.removeEventListener('transitionend', showAnimationDone);
    statusMsg.removeEventListener('transitionend', hideAnimationDone);

    LazyLoader.load([statusMsg], function _loaded() {
      // if parameters correct keep going
      if (!setL10nAttributes(statusMsg.querySelector('p'), mainMessage)) {
        return;
      }

      // check for additional messages
      if (extra) {
        additionalLine = document.createElement('p');
        statusMsg.appendChild(additionalLine);
        setL10nAttributes(additionalLine, extra);
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
