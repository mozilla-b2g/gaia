/**
 * The template function for generating an UI element for a layout object.
 *
 * @module themes/layout_template
 */

define(function (require) {
  'use strict';

  return function th_layoutTemplate(theme, recycled) {
    var container = null;
    var label, radio;
    var RADIO_GROUP = 'personalization.themesheader.value';
    if (recycled) {
      container = recycled;
      radio = container.querySelector('gaia-radio');
      label = container.querySelector('label');
    } else {
      container = document.createElement('li');
      radio = document.createElement('gaia-radio');
      label = document.createElement('label');

      radio.name = RADIO_GROUP;
      radio.value = theme.manifestURL;

      radio.appendChild(label);
      container.appendChild(radio);
    }
    label.textContent = theme.name;

    radio.addEventListener('click', function(evt) {
      if (evt.target.checked) {
        return;
      }
      theme.onclick(theme.manifestURL);
    });
    return container;
  };
});

