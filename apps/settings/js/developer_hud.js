/* global SettingsListener */

(function() {

  'use strict';

  var widgets = document.querySelectorAll('.hud-widgets');
  var items = document.querySelectorAll('.memory-item');

  SettingsListener.observe('devtools.overlay', false, function(enabled) {
    [].forEach.call(widgets, function(widget) {
      widget.classList.toggle('disabled', !enabled);
    });
  });

  SettingsListener.observe('hud.appmemory', false, function(enabled) {
    [].forEach.call(items, function(item) {
      item.parentElement.parentElement.classList.toggle('disabled', !enabled);
    });
  });

})();
