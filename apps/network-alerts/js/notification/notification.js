/* global Utils */

'use strict';

(function(exports) {

function init() {
  window.navigator.mozSetMessageHandler('notification', onNotification);
}

function closeWindow() {
  window.close();
}

function onNotification(message) {
  if (!message.clicked) {
    closeWindow();
    return;
  }

  var title = message.data.title;

  var url = [
    'attention.html?title=',
    encodeURIComponent(title),
    'body=',
    encodeURIComponent(message.body),
    '&notification=1'
  ].join('');

  window.open(url, '_blank', 'attention');
}

exports.NotificationHandler = {
  init: init
};

})(window);
