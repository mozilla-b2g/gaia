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
      checkbox = container.querySelector('input');
      nameBdi = container.querySelector('bdi');
    } else {
      container = document.createElement('li');
      checkbox = document.createElement('input');
      var label = document.createElement('label');
      nameBdi = document.createElement('bdi');

      label.className = 'pack-checkbox';
      checkbox.type = 'checkbox';

      label.appendChild(checkbox);
      label.appendChild(document.createElement('span'));
      label.lastChild.appendChild(nameBdi);

      container.appendChild(label);
    }

    checkbox.onchange = function() {
      layout.enabled = this.checked;
    };

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
