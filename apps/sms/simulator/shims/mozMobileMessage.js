'use strict';

(function(exports) {

var MARKUP =
  '<form class="js-send-sms-form">' +
    '<label>Body:' +
      '<input class="js-body" />' +
    '</label>' +
    '<button>Receive a SMS</button>' +
  '</form>';

var body;

function teardown(window) {
  console.log('Shims.mozMobileMessage: resetting listeners');
  exports.DesktopMockNavigatormozMobileMessage._teardown();
}

function injectTo(fwindow) {
  fwindow.navigator.mozMobileMessage =
    exports.DesktopMockNavigatormozMobileMessage;
}

function render(container) {
  container.insertAdjacentHTML('beforeend', MARKUP);
  body = container.querySelector('.js-body');

  var form = container.querySelector('.js-send-sms-form');
  form.addEventListener('submit', onSendSms);
}

function onSendSms(e) {
  e.preventDefault();
  sendSms(body.value);
}

function sendSms(body) {
  var message = {
    sender: '0123456789',
    id: 1,
    threadId: 1,
    type: 'sms',
    body: body,
    timestamp: Date.now()
  };

  exports.Shims.get('mozSetMessageHandler').trigger('sms-received', message);
  exports.DesktopMockNavigatormozMobileMessage._trigger(
    'received', { message: message }
  );
}

exports.Shims.contribute(
  'mozMobileMessage',
  {
    injectTo: injectTo,
    render: render,
    teardown: teardown
  }
);

})(window);
