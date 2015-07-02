'use strict';

window.addEventListener('iac-notification-message', function(evt) {
  // XXX: Testing purpose. Please remove it once real notification sending
  // service is done.
  /* jshint nonew: false */
  new Notification('Notification test', {
    'body': evt.detail
  });
});

