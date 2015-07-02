/* globals NotificationConnector */
'use strict';

(function(exports) {

var NotificationConnector = function() {
  navigator.mozApps.getSelf().onsuccess = function(evt) {
    var app = evt.target.result;
    app.connect('notification-message').then(function onConnAcceptet(ports) {
      ports.forEach(function(port) {
        // XXX: Testing purpose. Please remove it once real notification sending
        // service is done.
        port.postMessage('hello');
      });
    }, function onConnRejected(reason) {
      console.log('rejected');
    });
  };
};

exports.NotificationConnector = NotificationConnector;
})(window);

window.notificationConnector = new NotificationConnector();
