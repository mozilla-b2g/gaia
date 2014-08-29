/* global Notification,
  NotificationHelper,
  Promise,
  Utils
*/
'use strict';

(function(exports) {

var form;

function init() {
  form = document.querySelector('form');
  form.addEventListener('submit', onFormSubmit);

  navigator.mozL10n.once(function () {
    sendNotification().catch((err) => {
      console.error('Error while sending a notification', err);
    });
  });
}

function sendNotification() {
  var params = Utils.parseParams();
  var fromNotification = params.notification;
  if (fromNotification) {
    return Promise.resolve();
  }

  return new Promise(function(resolve, reject) {
    var title = params.title;
    var body = params.body;
    var req = navigator.mozApps.getSelf();

    req.onsuccess = function onsuccess(event) {
      var app = event.target.result;

      var notification = new Notification(
        navigator.mozL10n.get(title), {
          body: body,
          tag: '' + Date.now(), // needs to be unique
          icon: NotificationHelper.getIconURI(app) + '?titleID=' + title
        }
      );

      notification.onerror = function onerror() {
        reject(new Error('CMAS: notification API error'));
      };

      notification.onshow = resolve;
    };

    req.onerror = function onerror() {
      reject(new Error('CMAS: App getSelf request error'));
    };
  });
}

function onFormSubmit(e) {
  e.preventDefault();
  // Close parent(if exist) and child attention window after user click ok
  window.opener ? window.opener.close() : window.close();
}

function renderForm() {
  var params = Utils.parseParams();

  var title = params.title;
  var body = params.body;

  form.querySelector('h1').setAttribute('data-l10n-id', title);
  form.querySelector('p').textContent = body;
}

exports.Attention = {
  init: init,
  render: renderForm
};

})(window);
