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
    if (additionalLine) {
      statusMsg.removeChild(additionalLine);
      additionalLine = null;
    }
  };

  var showStatus = function(text, additional) {
    // clean listeners in case of previous race conditions
    statusMsg.removeEventListener('transitionend', showAnimationDone);
    statusMsg.removeEventListener('transitionend', hideAnimationDone);

    LazyLoader.load([statusMsg], function _loaded() {
      statusMsg.querySelector('p').textContent = text;

      if (additional) {
        additionalLine = document.createElement('p');
        statusMsg.appendChild(additionalLine);
        additionalLine.textContent = additional;
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
