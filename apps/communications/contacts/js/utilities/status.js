'use strict';

var utils = this.utils || {};

utils.status = (function() {
  var STATUS_TIME = 2000;
  var statusMsg = document.querySelector('#statusMsg');

  var showStatus = function(text) {
    LazyLoader.load([statusMsg], function _loaded() {
      statusMsg.querySelector('p').textContent = text;
      statusMsg.classList.remove('hidden');
      setTimeout(function displaying() {
        statusMsg.classList.add('opening');
        statusMsg.classList.add('bannerStart');
        statusMsg.addEventListener('transitionend', function tend() {
          statusMsg.removeEventListener('transitionend', tend);
          setTimeout(function hide() {
            statusMsg.classList.remove('opening');
            statusMsg.classList.add('bannerEnd');
          }, STATUS_TIME);
          statusMsg.addEventListener('transitionend', function bannerEnd() {
            statusMsg.removeEventListener('transitionend', bannerEnd);
            statusMsg.classList.add('hidden');
            statusMsg.classList.remove('bannerStart');
            statusMsg.classList.remove('bannerEnd');
          });
        });
      }, 0);
    });
  };
  return {
    show: showStatus
  };
})();
