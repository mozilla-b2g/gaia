/**
 * The template function for generating an UI element for a keyboard object.
 *
 * @module keyboard/keyboard_template
 */
define(function(require) {
  'use strict';

  return function kp_keyboardTemplate(keyboard, recycled) {
    var container = null;
    var span;
    if (recycled) {
      container = recycled;
      span = container.querySelector('span');
    } else {
      container = document.createElement('li');
      span = document.createElement('span');

      container.appendChild(span);
    }

    container.onclick = function() {
      keyboard.app.launch();
    };
    span.textContent = keyboard.name;
    return container;
  };
});
