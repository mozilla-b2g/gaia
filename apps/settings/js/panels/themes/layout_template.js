/**
 * The template function for generating an UI element for a layout object.
 *
 * @module themes/layout_template
 */

define(function (require) {
  'use strict';

  return function th_layoutTemplate(theme, recycled) {
    var container = null;
    var span, radio;
    var RADIO_GROUP = 'personalization.themesheader.value';
    if (recycled) {
      container = recycled;
      radio = container.querySelector('input');
      span = container.querySelector('span');
    } else {
      container = document.createElement('li');
      radio = document.createElement('input');
      var label = document.createElement('label');
      span = document.createElement('span');

      label.className = 'pack-radio';

      radio.type = 'radio';
      radio.name = RADIO_GROUP;
      radio.value = theme.manifestURL;

      label.appendChild(radio);
      label.appendChild(span);
      container.appendChild(label);
    }
    span.textContent = theme.name;

    container.onclick = function(evt) {
      if (evt.target.checked) {
        return;
      }
      theme.onclick(theme.manifestURL);
    };
    return container;
  };
});

