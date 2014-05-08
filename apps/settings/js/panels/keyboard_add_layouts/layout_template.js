/**
 * The template function for generating an UI element for a layout object.
 *
 * @module keyboard_add_layouts/layout_template
 */
define(function(require) {
  'use strict';

  return function kal_layoutTemplate(layout, recycled, helper) {
    var container = null;
    var span, checkbox;
    if (recycled) {
      container = recycled;
      checkbox = container.querySelector('input');
      span = container.querySelector('span');
    } else {
      container = document.createElement('li');
      checkbox = document.createElement('input');
      var label = document.createElement('label');
      span = document.createElement('span');

      label.className = 'pack-checkbox';
      checkbox.type = 'checkbox';

      label.appendChild(checkbox);
      label.appendChild(span);

      container.appendChild(label);
    }

    checkbox.onchange = function() {
      layout.enabled = this.checked;
    };

    helper.observeAndCall(layout, {
      name: function refreshName() {
        span.textContent = layout.name;
      },
      enabled: function() {
        checkbox.checked = layout.enabled;
      }
    });

    return container;
  };
});
