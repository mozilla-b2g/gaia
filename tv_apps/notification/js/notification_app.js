/* globals NotificationApp */
'use strict';

(function(exports) {

function NotificationApp() {
  window.addEventListener('iac-notification-message', this);

  // XXX: Testing purpose. Please remove it once real notification sending
  // service is done.
  /* jshint nonew: false */
  new Notification('Notification test', {
    'body': 'test content'
  });
}

NotificationApp.prototype = {
  handleEvent: function (evt) {
    switch(evt.type) {
    case 'iac-notification-message':
      var detail = JSON.parse(evt.detail);

      switch(detail.type) {
      case 'desktop-notification':
        // XXX: Testing purpose. Please remove it once real notification
        // sending service is done.
        console.log(detail.title);
        console.log(detail.text);
        break;

      case 'desktop-notification-close':
        break;
      }
    }
  }
};


exports.NotificationApp = NotificationApp;
})(window);

window.notificationApp = new NotificationApp();
