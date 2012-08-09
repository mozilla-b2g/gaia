'use strict';

var KeyboardManager = (function() {
  // XXX TODO: Retrieve it from Settings, allowing 3rd party keyboards
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');

  var keyboardURL = document.location.protocol + '//keyboard.' + domain;
  if (keyboardURL.substring(0, 6) == 'app://') { // B2G bug 773884
    keyboardURL += '/index.html';
  }

  var keyboardFrame = document.getElementById('keyboard-frame');
  keyboardFrame.src = keyboardURL;

  var keyboardOverlay = document.getElementById('keyboard-overlay');

  // TODO Think on a way of doing this
  // without postMessages between Keyboard and System
  window.addEventListener('message', function receiver(evt) {
    var message = JSON.parse(evt.data);
    if (message.action === 'hideKeyboard') {
      keyboardFrame.classList.add('hide');
      keyboardFrame.classList.remove('visible');
      return;
    }

    if (message.action !== 'updateHeight')
      return;

    var app = WindowManager.getDisplayedApp();

    var currentApp, appHeight;
    if (TrustedDialog.isVisible()) {
      currentApp = TrustedDialog.getFrame();
      appHeight = currentApp.getBoundingClientRect().height;

    } else if (ModalDialog.isVisible()) {
      // XXX: As system has no iframe, we calc the height separately
      currentApp = document.getElementById('dialog-overlay');
      appHeight = window.innerHeight;

    } else if (app) {
      WindowManager.setAppSize(app);
      currentApp = WindowManager.getAppFrame(app);
      appHeight = currentApp.getBoundingClientRect().height;

    } else {
      console.error('There is no current application, nor trusted dialog ' +
                    'nor modal dialog. The resize event is acting on nothing.');
      return;
    }

    var height = appHeight - message.keyboardHeight;
    keyboardOverlay.hidden = true;

    if (message.hidden) {
      keyboardFrame.classList.add('hide');
      keyboardFrame.classList.remove('visible');
      return;
    }

    if (!keyboardFrame.classList.contains('hide')) {
      currentApp.style.height = height + 'px';
      keyboardOverlay.style.height = (height + StatusBar.height) + 'px';
      keyboardOverlay.hidden = false;
    } else {
      keyboardFrame.classList.remove('hide');
      keyboardFrame.addEventListener('transitionend', function keyboardShown() {
        keyboardFrame.removeEventListener('transitionend', keyboardShown);
        currentApp.style.height = height + 'px';
        keyboardOverlay.style.height = (height + StatusBar.height) + 'px';
        keyboardOverlay.hidden = false;
        keyboardFrame.classList.add('visible');
      });
    }
  });

  window.navigator.mozKeyboard.onfocuschange = function onfocuschange(evt) {
    var currentType = evt.detail.type;
    if (currentType.indexOf('select') == -1)
      return;

    switch (currentType) {
      case 'select-one':
      case 'select-multiple':
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('select', true, true, evt.detail);
        window.dispatchEvent(event);
        break;
    }
  };
})();

