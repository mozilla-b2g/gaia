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
        var size = parseInt(type[1]);
        var height = window.innerHeight - size;

        var updateHeight = function() {
          container.removeEventListener('transitionend', updateHeight);
          container.classList.add('visible');

          var detail = {
            'detail': {
              'height': size
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
        container.classList.add('hide');
        container.classList.remove('visible');
        dispatchEvent(new CustomEvent('keyboardhide'));
        break;
    }
  });
})();

