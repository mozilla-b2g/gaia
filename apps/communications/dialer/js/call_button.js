'use strict';

/* exported CallButton */

var CallButton = {
  init: function(elementListeningToEvents, callback) {
    elementListeningToEvents.addEventListener('click', function(evt) {
      if (!evt.target.classList.contains('call-button')) {
        return;
      }
      evt.stopImmediatePropagation();
      evt.preventDefault();

      callback(evt);
    }, true);
  }
};
