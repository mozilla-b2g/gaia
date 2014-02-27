/* global SettingsListener */

(function() {

  'use strict';

  var widgets = document.querySelector('#hud-widgets');
  var items = document.querySelectorAll('.memory-item');

  SettingsListener.observe('devtools.overlay', false, function(enabled) {
    widgets.classList.toggle('disabled', !enabled);
  });

  SettingsListener.observe('hud.appmemory', false, function(enabled) {
    Array.prototype.forEach.call(items, function(item) {
      item.classList.toggle('disabled', !enabled);
    });
  });

})();
