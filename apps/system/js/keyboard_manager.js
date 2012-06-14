'use strict';

var KeyboardManager = (function() {

  var KEYBOARD_ID = 'keyboardFrame';

  // TODO: Retrieve it from Settings, allowing 3rd party keyboards
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

      if (message.action !== 'updateHeight')
        return;

      var app = WindowManager.getDisplayedApp();

      if (!app)
        return;

      var currentApp = WindowManager.getAppFrame(app);
      // Reset the height of the app
      WindowManager.setAppSize(app);

      if (!message.hidden) {
        currentApp.style.height =
          (currentApp.offsetHeight - message.keyboardHeight) + 'px';
        currentApp.classList.add('keyboardOn');
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
        case 'showime':
          // Allow the keyboardFrame to show before the height adjustment
          keyboardFrame.classList.remove('hide');
          break;

        case 'hideime':
          // Allow the app to occupy the entire screen behind the keyboard
          // before the transition
          var app = WindowManager.getDisplayedApp();
          if (app)
            WindowManager.setAppSize(app);
          break;

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
