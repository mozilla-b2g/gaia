/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/**
 * This file manages airplane mode interaction within the settings app.
 * The airplane mode button is disabled when the user taps it.
 * We then determine the number of components that need to change,
 * and fire off an event only when all components are ready.
 */

'use strict';

var AirplaneMode = {

  element: null,

  init: function apm_init() {
    var self = this;
    var settings = window.navigator.mozSettings;

    if (!settings) {
      return;
    }

    this.element = document.getElementById('airplaneMode-input');

    // handle change on radio
    this.element.addEventListener('change', function(e) {
      this.disabled = true;
      AirplaneModeHelper.setEnabled(this.checked);
    });

    // initial status
    var status = AirplaneModeHelper.getStatus();
    this.element.checked = (status === 'enabled') ? true : false;
    this.element.disabled = false;

    // handle transition
    AirplaneModeHelper.addEventListener('statechange', function(status) {
      if (status === 'enabled' || status === 'disabled') {
        self.element.checked = (status === 'enabled') ? true : false;
        self.element.disabled = false;
      } else {
        self.element.disabled = true;
      }
    });
  }
};

// starting when we get a chance
navigator.mozL10n.ready(function loadWhenIdle() {
  var idleObserver = {
    time: 5,
    onidle: function() {
      AirplaneMode.init();
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
