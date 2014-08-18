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

  var style = Utils.parseParams(message.imageURL).style;

  var url = [
    'attention.html?title=',
    encodeURIComponent(message.title),
    '&body=',
    encodeURIComponent(message.body),
    '&style=',
    encodeURIComponent(style),
    '&notification=1'
  ].join('');

  window.open(url, '_blank', 'attention');
  closeWindow();
}

exports.NotificationHandler = {
  init: init
};

})(window);
