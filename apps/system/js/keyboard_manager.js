'use strict';

var KeyboardManager = (function() {
  function debug(str) {
    dump('  +++ KeyboardManager.js +++ : ' + str + '\n');
  }

  // XXX TODO: Retrieve it from Settings, allowing 3rd party keyboards
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  var KEYBOARD_URL = document.location.protocol + '//keyboard.' + domain;

  if (KEYBOARD_URL.substring(0, 6) == 'app://') { // B2G bug 773884
    KEYBOARD_URL += '/index.html';
  }

  var keyboardFrame = document.getElementById('keyboard-frame');
  keyboardFrame.src = KEYBOARD_URL;

  var keyboardOverlay = document.getElementById('keyboard-overlay');

  // TODO Think on a way of doing this
  // without postMessages between Keyboard and System
  window.addEventListener('message', function receiver(evt) {
    var message = JSON.parse(evt.data);
    if (message.action !== 'updateHeight')
      return;

    var app = WindowManager.getDisplayedApp();
    if (!app && !TrustedDialog.trustedDialogIsShown())
      return;

    var currentApp;
    if (TrustedDialog.trustedDialogIsShown()) {
      currentApp = TrustedDialog.getFrame();
    } else {
      WindowManager.setAppSize(app);
      currentApp = WindowManager.getAppFrame(app);
    }

    var dialogOverlay = document.getElementById('dialog-overlay');

    var height = (parseInt(currentApp.getBoundingClientRect().height) -
                  message.keyboardHeight);
    keyboardOverlay.hidden = true;

    if (message.hidden) {
      keyboardFrame.classList.add('hide');
      keyboardFrame.classList.remove('visible');
      dialogOverlay.style.height = (height + 20) + 'px';
      return;
    }

    if (!keyboardFrame.classList.contains('hide')) {
      currentApp.style.height = height + 'px';
      dialogOverlay.style.height = (height + 20) + 'px';
      keyboardOverlay.style.height = (height + 20) + 'px';
      keyboardOverlay.hidden = false;
    } else {
      keyboardFrame.classList.remove('hide');
      keyboardFrame.addEventListener('transitionend', function keyboardShown() {
        keyboardFrame.removeEventListener('transitionend', keyboardShown);
        dialogOverlay.style.height = (height + 20) + 'px';
        currentApp.style.height = height + 'px';
        keyboardOverlay.style.height = (height + 20) + 'px';
        keyboardOverlay.hidden = false;
        keyboardFrame.classList.add('visible');
      });
    }
  });

  var previousKeyboardType = null;

  var kKeyboardDelay = 20;
  var updateKeyboardTimeout = 0;

  window.navigator.mozKeyboard.onfocuschange = function onfocuschange(evt) {
    var currentType = evt.detail.type;
    if (previousKeyboardType === currentType)
      return;
    previousKeyboardType = currentType;
    clearTimeout(updateKeyboardTimeout);

    var message = {};

    switch (previousKeyboardType) {
      case 'blur':
        message.type = 'hideime';
        break;

      default:
        message.type = 'showime';
        message.detail = evt.detail;
        break;
    }

    var keyboardWindow = keyboardFrame.contentWindow;
    updateKeyboardTimeout = setTimeout(function updateKeyboard() {
      if (message.type === 'hideime') {
        keyboardFrame.classList.add('hide');
        keyboardFrame.classList.remove('visible');
      }
      keyboardWindow.postMessage(JSON.stringify(message), KEYBOARD_URL);
    }, kKeyboardDelay);
  };
})();

