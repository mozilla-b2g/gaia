/**
 * The template function for generating an UI element for a keyboard object.
 *
 * @module keyboard/keyboard_template
 */
define(function(require) {
  'use strict';

  return function kp_keyboardTemplate(keyboard, recycled) {
    var container = null;
    var a;
    var span;
    if (recycled) {
      container = recycled;
      a = container.querySelector('a');
      span = container.querySelector('span');
    } else {
      container = document.createElement('li');
      a = document.createElement('a');
      span = document.createElement('span');

      a.href = '#';
      a.className = 'menu-item';
      a.appendChild(span);
      container.appendChild(a);
    }

    container.onclick = function() {
      keyboard.app.launch();
    };
    span.textContent = keyboard.name;
    return container;
  };
});
