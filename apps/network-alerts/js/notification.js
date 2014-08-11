/* global
  Utils
 */

'use strict';

window.navigator.mozSetMessageHandler('notification', onNotification);

function onNotification(message) {
  handleNotification(message);
}

function closeWindow() {
  window.close();
}

function handleNotification(message) {
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
    style,
    '&notification=1'
  ].join('');

  window.open(url, '_blank', 'attention');
  closeWindow();
}
