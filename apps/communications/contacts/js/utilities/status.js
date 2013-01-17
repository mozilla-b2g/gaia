'use strict';

var utils = this.utils || {};

utils.status = (function() {
  var STATUS_TIME = 2000;
  var statusMsg = document.querySelector('#statusMsg');

  var showStatus = function(text) {
    statusMsg.querySelector('p').textContent = text;
    statusMsg.classList.add('visible');
    statusMsg.addEventListener('transitionend', function tend() {
      statusMsg.removeEventListener('transitionend', tend);
      setTimeout(function hide() {
        statusMsg.classList.remove('visible');
      }, STATUS_TIME);
    });
  };
  return {
    show: showStatus
  };
})();
