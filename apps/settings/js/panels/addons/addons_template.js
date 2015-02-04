/**
 * The template function for generating an UI element for an Addon item.
 *
 * @module addons/addons_template
 */
define(function(require) {
  'use strict';

  function addonsTemplate(addonEnabler, item, recycled) {
    var manifest = item.manifest || item.updateManifest;
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
      toggle.value = item.manifestURL;
      toggle.checked = item.enabled;
      label.appendChild(toggle);
      label.appendChild(span);
      container.appendChild(label);
    }

    span.textContent = manifest.name;
    toggle.onclick = () => {
      if (item.enabled) {
        addonEnabler.disableAddon(item);
      } else {
        addonEnabler.enableAddon(item);
      }
    };

    return container;
  }

  return function ctor_addonsTemplate(enabler, item, recycled) {
    return addonsTemplate.bind(null, enabler);
  };

});
