/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SoundSettings = {
  dialog: document.getElementById('sound-selection'),

  callSettings: {
    button: document.getElementById('call-tone-selection'),
    key: 'dialer.ringtone',
    value: null
  },

  init: function ss_init() {
    var self = this;
    this.callSettings.button.onclick = function() {
      self.showDialog(self.callSettings);
    };

    var lock = window.navigator.mozSettings.createLock();
    var req = lock.get(this.callSettings.key);
    req.onsuccess = function ss_getDialerTone() {
      self.callSettings.value = req.result[self.callSettings.key] || 'classic.ogg';
      self.updateButton(self.callSettings);
    };
    // Listen to touch on tones
    var labels = this.dialog.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      label.onmouseup = function() { 
        audioPreview(this);
      };
    }
  },

  showDialog: function ss_showDialog(target) {
    var radios = this.dialog.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        radio.checked = (target.value === radio.value);
      })(radios[i]);
    }

    var self = this;
    var submit = this.dialog.querySelector('[type=submit]');
    submit.onclick = function onsubmit() {
      var settings = window.navigator.mozSettings;
      var rule = 'input[type="radio"]:checked';
      target.value = self.dialog.querySelector(rule).value;
      var keyValue = {};
      keyValue[target.key] = target.value;
      settings.createLock().set(keyValue);
      self.updateButton(target);
      document.location.hash = 'sound';
    };

    var reset = this.dialog.querySelector('[type=reset]');
    reset.onclick = function onreset() {
      document.location.hash = 'sound'; // hide dialog box
    };
    document.location.hash = this.dialog.id;
  },

  updateButton: function ss_updateButton(target) {
    var rule = 'input[value="' + target.value + '"]';
    var label = this.dialog.querySelector(rule).dataset.label;
    target.button.textContent = label;
  }
};

SoundSettings.init();

