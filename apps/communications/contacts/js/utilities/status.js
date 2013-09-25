'use strict';

var utils = this.utils || {};

utils.status = (function() {
  var STATUS_TIME = 2000;
  var statusMsg = document.querySelector('#statusMsg');

  var showStatus = function(text) {
    LazyLoader.load([statusMsg], function _loaded() {
      statusMsg.querySelector('p').textContent = text;
      statusMsg.classList.add('visible');
      statusMsg.classList.add('bannerStart');
      statusMsg.addEventListener('transitionend', function tend() {
        statusMsg.removeEventListener('transitionend', tend);
        setTimeout(function hide() {
          statusMsg.classList.remove('visible');
          statusMsg.classList.add('bannerEnd');
        }, STATUS_TIME);
        statusMsg.addEventListener('transitionend', function bannerEnd() {
          statusMsg.removeEventListener('transitionend', bannerEnd);
          statusMsg.classList.remove('bannerStart');
          statusMsg.classList.remove('bannerEnd');
        });
      });
    });
  };
  return {
    show: showStatus
  };
})();
