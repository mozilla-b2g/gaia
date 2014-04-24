/* global LazyLoader */
'use strict';

var utils = window.utils || {};

utils.status = (function() {
  var STATUS_TIME = 2000;
  var statusMsg = document.querySelector('#statusMsg');
  var hidingTimeout;

  var hideAnimationDone = function() {
    statusMsg.removeEventListener('transitionend', hideAnimationDone);
    statusMsg.classList.add('hidden');
  };
  var showAnimationDone = function() {
    statusMsg.removeEventListener('transitionend', showAnimationDone);
    hidingTimeout = setTimeout(hideStatus, STATUS_TIME);
  };

  var hideStatus = function() {
    statusMsg.classList.remove('opening');
    statusMsg.classList.remove('bannerStart');
    statusMsg.addEventListener('transitionend', hideAnimationDone);
  };

  var showStatus = function(text) {
    // clean listeners in case of previous race conditions
    statusMsg.removeEventListener('transitionend', showAnimationDone);
    statusMsg.removeEventListener('transitionend', hideAnimationDone);

    LazyLoader.load([statusMsg], function _loaded() {
      statusMsg.querySelector('p').textContent = text;

      // If showing already, we increase the time after the change
      if (statusMsg.classList.contains('opening')) {
        clearTimeout(hidingTimeout);
        hidingTimeout = setTimeout(hideStatus, STATUS_TIME);
        return;
      }

      statusMsg.classList.remove('hidden');
      setTimeout(function displaying() {
        statusMsg.classList.add('opening');
        statusMsg.classList.add('bannerStart');
        statusMsg.addEventListener('transitionend', showAnimationDone);
      }, 0);
    });
  };
  return {
    show: showStatus
  };
})();
