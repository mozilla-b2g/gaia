/* global Notification,
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

  var title = params.title;
  var body = params.body;

  // TODO: Use NotificationHelper.getIconURI for icon url instead of hardcoded
  var notification = new Notification(
    navigator.mozL10n.get(title), {
      body: body,
      tag: '' + Date.now(), // needs to be unique
      icon: window.location.origin + '/style/icons/icon-68.png' +
            '?titleID=' + title
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
