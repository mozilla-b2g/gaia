/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SleepMenu = {
  list_item: [
    {
      i10nId: ''
    }
  ],

  init: function sm_init() {
    ListMenu.init({items: [{}]}, this.handler);
  },

  handler: function sm_handler(action) {
    switch (action) {
      case 'airplane':
        var settings = window.navigator.mozSettings;
        if (settings) {
          var settingName = 'ril.radio.disabled';
          var req = settings.getLock().get(settingName);
          req.onsuccess = function() {
            var newValue = !req.result[settingName];
            settings.getLock().set({'ril.radio.disabled': newValue});
          }
        }
        break;
  
      case 'silent':
        var settings = window.navigator.mozSettings;
        if (settings)
          settings.getLock().set({ 'phone.ring.incoming': false});

        document.getElementById('silent').hidden = true;
        document.getElementById('normal').hidden = false;
        break;

      case 'normal':
        var settings = window.navigator.mozSettings;
        if (settings)
          settings.getLock().set({'phone.ring.incoming': true});

        document.getElementById('silent').hidden = false;
        document.getElementById('normal').hidden = true;
        break;

      case 'restart':
        navigator.mozPower.reboot();
        break;

      case 'power':
        navigator.mozPower.powerOff();
        break;
    }
  }
};
