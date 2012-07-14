'use strict';

var KeyboardManager = (function() {
  // XXX TODO: Retrieve it from Settings, allowing 3rd party keyboards
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  var KEYBOARD_URL = document.location.protocol + '//keyboard.' + domain;

  var keyboardFrame, keyboardOverlay;

  var init = function kbManager_init() {
    keyboardFrame = document.getElementById('keyboard-frame');
    keyboardOverlay = document.getElementById('keyboard-overlay');
    keyboardFrame.src = KEYBOARD_URL;

    listenUpdateHeight();
    listenShowHide();
  };

  var listenUpdateHeight = function() {
    // TODO Think on a way of doing this
    // without postMessages between Keyboard and System
    window.addEventListener('message', function receiver(evt) {
      var message = JSON.parse(evt.data);
      if (message.action !== 'updateHeight')
        return;

      var app = WindowManager.getDisplayedApp();
      if (!app)
        return;

      // Reset the height of the app
      WindowManager.setAppSize(app);
      var currentApp = WindowManager.getAppFrame(app);

      if (!message.hidden) {
        var height = (parseInt(currentApp.style.height) -
                      message.keyboardHeight);

        keyboardOverlay.style.height = (height + 20) + 'px';

        currentApp.style.height = height + 'px';
        currentApp.classList.add('keyboardOn');
        keyboardFrame.classList.remove('hide');
      } else {
        currentApp.classList.remove('keyboardOn');
        keyboardFrame.classList.add('hide');
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

