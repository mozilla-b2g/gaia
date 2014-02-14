/* global SettingsListener */

(function() {

  'use strict';

  var widgets = document.querySelector('#developer-hud-widgets');

  SettingsListener.observe('devtools.overlay', false, function(value) {
    if (value) {
      widgets.classList.remove('disabled');
    } else {
      widgets.classList.add('disabled');
    }
  });

})();
