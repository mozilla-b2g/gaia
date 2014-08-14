/* global
  Notification,
  Promise,
  Utils
*/
'use strict';

(function(exports) {

var form;
var style;

function init() {
  form = document.querySelector('form');
  form.addEventListener('submit', onFormSubmit);
  sendNotification().catch((err) => {
    console.error('Error while sending a notification', err);
  });
}

function sendNotification() {
  var params = Utils.parseParams();
  var fromNotification = params.notification;
  if (fromNotification) {
    return Promise.resolve();
  }

  var title = params.title;
  var body = params.body;

  var notification = new Notification(
    title, {
      body: body,
      tag: '' + Date.now(), // needs to be unique
      icon: window.location.origin + '/style/icons/icon-68.png?style=' + style
    }
  );

  return new Promise(function(resolve, reject) {
    notification.onerror = function onerror() {
      reject(new Error());
    };

    notification.onshow = resolve;
  });
}

function onFormSubmit(e) {
  e.preventDefault();
  window.close();
}

function renderForm() {
  var params = Utils.parseParams();

  if (params.style) {
    document.body.classList.add(params.style);
    style = params.style;
  }

  var title = params.title;
  var body = params.body;

  form.querySelector('h1').textContent = title;
  form.querySelector('p').textContent = body;
}

exports.Attention = {
  init: init,
  render: renderForm
};

})(window);
