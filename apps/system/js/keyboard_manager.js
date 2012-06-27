/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var KeyboardManager = (function() {

  var KEYBOARD_ID = 'keyboard-frame';

  // XXX TODO: Retrieve it from Settings, allowing 3rd party keyboards
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  var KEYBOARD_URL = 'http://keyboard.' + domain;

  var keyboardFrame;

  var init = function kbManager_init() {
    keyboardFrame = document.getElementById(KEYBOARD_ID);
    keyboardFrame.src = KEYBOARD_URL;

    listenUpdateHeight();
    listenShowHide();
  };

  var listenUpdateHeight = function() {
    // TODO Think on a way of doing this
    // without postMessages between Keyboard and System
    window.addEventListener('message', function receiver(evt) {
      var message = JSON.parse(evt.data);

      if (!message.action) {
        console.log('Cannot get message.action');
        return;
      }

      switch (message.action) {

        case 'updateHeight':
          var app = WindowManager.getDisplayedApp();

          if (!app)
            return;

          // Reset the height of the app
          WindowManager.setAppSize(app);
          var currentApp = WindowManager.getAppFrame(app);

          if (!message.hidden) {
            currentApp.style.height =
            (parseInt(currentApp.style.height) - message.keyboardHeight) + 'px';
            currentApp.classList.add('keyboardOn');
          } else {
            currentApp.classList.remove('keyboardOn');
          }
          break;

        case 'showKeyboard':
          keyboardFrame.classList.remove('hide');
          break;

        case 'hideKeyboard':
          keyboardFrame.classList.add('hide');
          break;

      }
    });
  };

  var listenShowHide = function() {
    var keyboardWindow = keyboardFrame.contentWindow;

    // Handling showime and hideime events, as they are received only in System
    // https://bugzilla.mozilla.org/show_bug.cgi?id=754083

    function kbdEventRelay(evt) {
      //
      // We will trusted keyboard app to send back correct updateHeight message
      // for us to hide the keyboardFrame when the keyboard transition is
      // finished.
      //
      switch (evt.type) {

        case 'appwillclose':
          // Hide the keyboardFrame!
          var app = WindowManager.getDisplayedApp();
          var currentApp = WindowManager.getAppFrame(app);
          currentApp.classList.remove('keyboardOn');
          keyboardFrame.classList.add('hide');
          break;
      }

      var message = { type: evt.type };
      if (evt.detail)
        message.detail = evt.detail;

      keyboardWindow.postMessage(JSON.stringify(message), KEYBOARD_URL);
    };

    window.addEventListener('showime', kbdEventRelay);
    window.addEventListener('hideime', kbdEventRelay);
    window.addEventListener('appwillclose', kbdEventRelay);
  };

  return {
    'init': init
  };

}());

window.addEventListener('load', function initKeyboardManager(evt) {
  window.removeEventListener('load', initKeyboardManager);
  KeyboardManager.init();
});
