'use strict';

// Handles events from the Keyboard app, in order to
// resize the current app when needed

var KeyboardManager = (function() {

  var KEYBOARD_ID = 'keyboardFrame';

  // TODO: Retrieve it from Settings, allowing 3rd party keyboards
  var KEYBOARD_URL = 'http://keyboard.' + domain;


  var init = function kbManager_init() {
    var keyboardFrame = document.getElementById(KEYBOARD_ID);
    keyboardFrame.src = KEYBOARD_URL;

    listenResize(keyboardFrame);
    listenShowHide(keyboardFrame);

  };

  var listenResize = function(keyboardFrame) {
    // Keyboard app notifying resize the screen
    // TODO Think on a way of doing this
    // without postMessages between Keyboard and System
    window.addEventListener('message', function receiver(e) {
      var currentApp = WindowManager.getAppFrame(WindowManager.getDisplayedApp());
      var event = JSON.parse(e.data);
      if (event.action == 'resize') {
        WindowManager.setAppSize(WindowManager.getDisplayedApp());
        var currentHeight = currentApp.style.height;
        currentApp.style.height = '-moz-calc(' + currentHeight + ' - ' + event.height + ')';
        currentApp.classList.add('keyboardOn');
        keyboardFrame.style.display = 'block';
        keyboardFrame.style.height = '100%';
      }
    });
  };

  var listenShowHide = function(keyboardFrame) {

    var keyboardWindow = keyboardFrame.contentWindow;

    // Handling showime and hideime events, as they are received only in System
    // https://bugzilla.mozilla.org/show_bug.cgi?id=754083

    function hideImeListener(evt) {
      keyboardFrame.style.height = 0;
      keyboardFrame.style.display = 'none';
      WindowManager.setAppSize(WindowManager.getDisplayedApp());
    }

    window.addEventListener('showime', function showImeListener(evt) {
      keyboardFrame.style.display = 'block';
      var event = { type: evt.type };
      if (evt.detail) {
        event.detail = { type: evt.detail.type };
        keyboardWindow.postMessage(JSON.stringify(event), KEYBOARD_URL);
      }
      window.addEventListener('hideime', hideImeListener);
    });

    window.addEventListener('appwillclose', function appCloseListener(evt) {
      var currentApp = WindowManager.getAppFrame(WindowManager.getDisplayedApp());
      window.removeEventListener('hideime', hideImeListener);
      keyboardFrame.style.height = 0;
      currentApp.style.height = 0;
      currentApp.classList.remove('keyboardOn');
    });
  };

  return {
    'init': init 
  };

}());

window.addEventListener('load', function initKeyboardManager(evt) {
  window.removeEventListener('load', initKeyboardManager);
  KeyboardManager.init();
});
