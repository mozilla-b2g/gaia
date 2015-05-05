/* global Notification,
  NotificationHelper,
  Notify,
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

  document.addEventListener('visibilitychange', onVisibilityChange);
}

function sendNotification() {
  var params = Utils.parseParams();
  var fromNotification = params.notification;
  if (fromNotification) {
    return Promise.resolve();
  }

  return new Promise(function(resolve, reject) {
    var title = params.title;
    var req = navigator.mozApps.getSelf();

    req.onsuccess = function onsuccess(event) {
      var app = event.target.result;

      NotificationHelper.send(title, {
        bodyL10n: params.body;
        tag: '' + Date.now(), // needs to be unique
        icon: NotificationHelper.getIconURI(app) + '?titleID=' + title
      }).then(function(notification) {
        notification.addEventListener('error', reject(new Error('CMAS: notification API error')));
        notification.addEventListener('show', resolve);
      });
    };

    req.onerror = function onerror() {
      reject(new Error('CMAS: App getSelf request error'));
    };
  });
}

function closeApp() {
  // make sure we close both parent and child window
  window.opener ? window.opener.close() : window.close();
}

function onFormSubmit(e) {
  e.preventDefault();
  // Close parent(if exist) and child attention window after user click ok
  closeApp();
}

function onVisibilityChange() {
  // Close app when app resized as top banner and moved to background
  if (document.hidden && !document.querySelector('h1').clientHeight) {
    closeApp();
  }
}

function render() {
  var params = Utils.parseParams();
  renderForm(params);
  var fromNotification = params.notification;
  if (!fromNotification) {
    Notify.notify();
  }
}

function renderForm(params) {
  var title = params.title;
  var body = params.body;

  form.querySelector('h1').setAttribute('data-l10n-id', title);
  form.querySelector('p').textContent = body;
}

exports.Attention = { init, render };

})(window);
