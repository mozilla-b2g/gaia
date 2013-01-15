'use strict';

var KeyboardManager = (function() {
  function getKeyboardURL() {
    // TODO: Retrieve it from Settings, allowing 3rd party keyboards
    var host = document.location.host;
    var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
    var protocol = document.location.protocol;

    return protocol + '//keyboard.' + domain + '/';
  }

  function generateKeyboard(container, keyboardURL, manifestURL) {
    var keyboard = document.createElement('iframe');
    keyboard.src = keyboardURL;
    keyboard.setAttribute('mozbrowser', 'true');
    keyboard.setAttribute('mozpasspointerevents', 'true');
    keyboard.setAttribute('mozapp', manifestURL);
    //keyboard.setAttribute('remote', 'true');

    container.appendChild(keyboard);
    return keyboard;
  }

  // Generate a <iframe mozbrowser> containing the keyboard.
  var container = document.getElementById('keyboard-frame');
  var keyboardURL = getKeyboardURL() + 'index.html';
  var manifestURL = getKeyboardURL() + 'manifest.webapp';
  var keyboard = generateKeyboard(container, keyboardURL, manifestURL);

  // Listen for mozbrowserlocationchange of keyboard iframe.
  var previousHash = '';

  var urlparser = document.createElement('a');
  keyboard.addEventListener('mozbrowserlocationchange', function(e) {
    urlparser.href = e.detail;
    if (previousHash == urlparser.hash)
      return;
    previousHash = urlparser.hash;

    var type = urlparser.hash.split('=');
    switch (type[0]) {
      case '#show':
        var updateHeight = function updateHeight() {
          container.removeEventListener('transitionend', updateHeight);
          if (container.classList.contains('hide')) {
            // The keyboard has been closed already, let's not resize the
            // application and ends up with half apps.
            return;
          }

          var detail = {
            'detail': {
              'height': parseInt(type[1])
            }
          };

          dispatchEvent(new CustomEvent('keyboardchange', detail));
        }

        if (container.classList.contains('hide')) {
          container.classList.remove('hide');
          container.addEventListener('transitionend', updateHeight);
          return;
        }

        updateHeight();
        break;

      case '#hide':
        // inform window manager to resize app first or
        // it may show the underlying homescreen
        dispatchEvent(new CustomEvent('keyboardhide'));
        container.classList.add('hide');
        break;
    }
  });

  // For Bug 812115: hide the keyboard when the app is closed here,
  // since it would take a longer round-trip to receive focuschange
  window.addEventListener('appwillclose', function closeKeyboard() {
      dispatchEvent(new CustomEvent('keyboardhide'));
      container.classList.add('hide');
  });
})();

