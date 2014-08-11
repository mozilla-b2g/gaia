/* global
  Notification,
  Promise,
  Utils
*/
'use strict';

var form = document.querySelector('form');
var style;

renderForm();
form.addEventListener('submit', onFormSubmit);
window.addEventListener('resize', onWindowResize);

function closeWindow() {
  window.close();
}

function sendNotification() {
  var fromNotification = Utils.parseParams().notification;
  if (fromNotification) {
    return Promise.resolve();
  }

  Notification.requestPermission();

  var title = form.querySelector('h1').textContent;
  var body = form.querySelector('p').textContent;

  var notification = new Notification(
    title, {
      body: body,
      tag: '' + Date.now(), // needs to be unique
      icon: window.location.origin + '/style/icons/icon-48.png?style=' + style
    }
  );

  return new Promise(function(resolve, reject) {
    notification.onerror = function onerror() {
      console.log('got an error while sending the notification');
      reject(new Error());
    };

    notification.onshow = resolve;
  });
}

function onWindowResize(e) {
  if (window.innerHeight < 440) {
    window.removeEventListener('resize', onWindowResize);
    sendNotification().then(closeWindow);
  }
}

function onFormSubmit(e) {
  e.preventDefault();

  sendNotification().then(closeWindow);
}

function renderForm() {
  var params = Utils.parseParams();

  if (params.style) {
    document.body.classList.add(params.style);
    style = params.style;
  }

  var title = decodeURIComponent(params.title);
  var body = decodeURIComponent(params.body);

  form.querySelector('h1').textContent = title;
  form.querySelector('p').textContent = body;
}
