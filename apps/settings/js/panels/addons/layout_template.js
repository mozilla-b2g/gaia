/**
 * The template function for generating an UI element for a layout object.
 *
 * @module addons/layout_template
 */

define(function (require) {
  'use strict';

  return function(addon, recycled) {
    var container = null;
    var span, toggle;
    if (recycled) {
      container = recycled;
      toggle = container.querySelector('input');
      span = container.querySelector('span');
    } else {
      var kind = 'checkbox';
      container = document.createElement('li');
      toggle = document.createElement('input');
      var label = document.createElement('label');
      span = document.createElement('span');

      label.className = 'pack-' + kind;

      toggle.type = kind;
      toggle.value = addon.manifestURL;
      toggle.checked = addon.enabled;

      label.appendChild(toggle);
      label.appendChild(span);
      container.appendChild(label);
    }
    span.textContent = addon.name;

    toggle.onclick = function(evt) {
      addon.onclick(addon, evt.target.checked);
    };
    return container;
  };
});

