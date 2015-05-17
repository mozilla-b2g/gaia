/**
 * The template function for generating an UI element for an Addon item.
 *
 * @module addons/addons_template
 */
define(function(require) {
  'use strict';

  var ManifestHelper = require('shared/manifest_helper');

  const PREFERRED_ICON_SIZE = 30 * (window.devicePixelRatio || 1);

  function addonsTemplate(onClick, addon, recycled) {
    var manifest = new ManifestHelper(addon.instance.manifest ||
      addon.instance.updateManifest);
    var container = null;
    var link, span, small, icon;
    if (recycled) {
      container = recycled;
      link = container.querySelector('a');
      span = container.querySelector('span');
      small = container.querySelector('small');
      icon = container.querySelector('img');
    } else {
      container = document.createElement('li');
      link = document.createElement('a');
      span = document.createElement('span');
      small = document.createElement('small');
      icon = document.createElement('img');

      link.href = '#';
      link.classList.add('menu-item');
      small.classList.add('menu-item-desc');

      link.appendChild(icon);
      link.appendChild(span);
      link.appendChild(small);
      container.appendChild(link);
    }

    navigator.mozApps.mgmt
      .getIcon(addon.instance, PREFERRED_ICON_SIZE).then((blob) => {
        icon.src = URL.createObjectURL(blob);
    }).catch(() => {
      icon.src = '../style/images/default.png';
    });

    span.textContent = manifest.displayName;
    small.setAttribute('data-l10n-id', addon.enabled ? 'enabled' : 'disabled');
    addon.observe('enabled', function(enabled) {
      small.setAttribute('data-l10n-id', enabled ? 'enabled' : 'disabled');
    });

    link.onclick = () => {
      onClick(addon);
    };

    return container;
  }

  return function ctor_addonsTemplate(onClick) {
    return addonsTemplate.bind(null, onClick);
  };
});
