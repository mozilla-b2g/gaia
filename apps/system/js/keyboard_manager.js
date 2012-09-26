'use strict';

var KeyboardManager = (function() {
  // XXX TODO: Retrieve it from Settings, allowing 3rd party keyboards
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');

  var keyboardURL = document.location.protocol + '//keyboard.' + domain;
  if (keyboardURL.substring(0, 6) == 'app://') { // B2G bug 773884
    keyboardURL += '/index.html';
  }

  var dispatchEvent = function km_dispatchEvent(name, data) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(name, true, true, data);
    window.dispatchEvent(evt);
  };

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

    keyboardOverlay.hidden = true;

    if (message.hidden) {
      // To reset dialog height
      dispatchEvent('keyboardhide');

      keyboardFrame.classList.add('hide');
      keyboardFrame.classList.remove('visible');
      return;
    }

    var height = window.innerHeight - message.keyboardHeight;

    if (!keyboardFrame.classList.contains('hide')) {
      keyboardOverlay.style.height = height + 'px';
      keyboardOverlay.hidden = false;
      dispatchEvent('keyboardchange', { height: message.keyboardHeight });
    } else {
      keyboardFrame.classList.remove('hide');
      keyboardFrame.addEventListener('transitionend', function keyboardShown() {
        keyboardFrame.removeEventListener('transitionend', keyboardShown);
        keyboardOverlay.style.height = height + 'px';
        keyboardOverlay.hidden = false;
        keyboardFrame.classList.add('visible');
        dispatchEvent('keyboardchange', { height: message.keyboardHeight });
      });
    }

  });
})();

