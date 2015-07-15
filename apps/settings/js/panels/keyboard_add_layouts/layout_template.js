/**
 * The template function for generating an UI element for a layout object.
 *
 * @module keyboard_add_layouts/layout_template
 */
define(function(require) {
  'use strict';

  return function kal_layoutTemplate(layout, recycled, helper) {
    var container = null;
    var nameBdi, checkbox;
    if (recycled) {
      container = recycled;
      checkbox = container.querySelector('gaia-checkbox');
      nameBdi = container.querySelector('bdi');
    } else {
      container = document.createElement('li');
      checkbox = document.createElement('gaia-checkbox');
      nameBdi = document.createElement('bdi');

      checkbox.appendChild(document.createElement('label'));
      checkbox.lastChild.appendChild(nameBdi);

      container.appendChild(checkbox);
    }

    checkbox.addEventListener('change', function(e) {
      layout.enabled = e.target.checked;
    });

    helper.observeAndCall(layout, {
      name: function refreshName() {
        nameBdi.textContent = layout.name;
      },
      enabled: function() {
        checkbox.checked = layout.enabled;
      }
    });

    return container;
  };
});
