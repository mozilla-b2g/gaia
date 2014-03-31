/* global SettingsListener */

(function() {

  'use strict';

  var widgets = document.querySelectorAll('.hud-widgets');
  var items = document.querySelectorAll('.memory-item');

  function toggle(enabled, element) {
    element.classList.toggle('disabled', !enabled);
  }

  SettingsListener.observe('devtools.overlay', false, function(enabled) {
    Array.prototype.forEach.call(widgets, toggle.bind({}, enabled));
  });

  SettingsListener.observe('hud.appmemory', false, function(enabled) {
    Array.prototype.forEach.call(items, toggle.bind({}, enabled));
  });

})();
