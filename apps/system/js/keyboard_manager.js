'use strict';

var KeyboardManager = (function() {
  var keyboardHeight = 0;

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
  var appClosing = false;
  keyboard.addEventListener('mozbrowserlocationchange', function(e) {
    urlparser.href = e.detail;
    if (previousHash == urlparser.hash)
      return;
    previousHash = urlparser.hash;

    var type = urlparser.hash.split('=');
    switch (type[0]) {
      case '#show':

        // If an app is closing, we should ignore any #show triggered by
        // resize events which come from orientation change events.
        if (appClosing) {
          return;
        }

        //XXX: The url will contain the info for keyboard height
        keyboardHeight = parseInt(type[1]);

        var updateHeight = function updateHeight() {
          container.removeEventListener('transitionend', updateHeight);
          if (container.classList.contains('hide')) {
            // The keyboard has been closed already, let's not resize the
            // application and ends up with half apps.
            return;
          }

          var detail = {
            'detail': {
              'height': keyboardHeight
            }
          };

          dispatchEvent(new CustomEvent('keyboardchange', detail));
        };

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
        keyboardHeight = 0;
        dispatchEvent(new CustomEvent('keyboardhide'));
        container.classList.add('hide');
        break;
    }
  });

  function getHeight() {
    return keyboardHeight;
  }

  // For Bug 812115: hide the keyboard when the app is closed here,
  // since it would take a longer round-trip to receive focuschange
  // Also in Bug 856692 we realise that we need to close the keyboard
  // when an inline activity goes away.
  var closeKeyboardEvents = [
    'appwillclose',
    'activitywillclose',
    'activitymenuwillopen',
    // Hide the keyboard when the cards view is shown (i.e. by long
    // pressing the home button -- 'holdhome')
    'holdhome'
  ];
  closeKeyboardEvents.forEach(function onEvent(eventType) {
    window.addEventListener(eventType, function closeKeyboard() {
      keyboardHeight = 0;
      dispatchEvent(new CustomEvent('keyboardhide'));
      container.classList.add('hide');
      if (eventType == 'appwillclose') {
        appClosing = true;
      }
    });
  });

  window.addEventListener('appclose', function appClose() {
    appClosing = false;
  });

  return {
    getHeight: getHeight
  };

})();

