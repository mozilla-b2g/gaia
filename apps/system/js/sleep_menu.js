/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SleepMenu = {
  get element() {
    delete this.element;
    return this.element = document.getElementById('sleep');
  },

  get visible() {
    return this.element.classList.contains('visible');
  },

  init: function sm_init() {
    window.addEventListener('click', SleepMenu, true);
    window.addEventListener('keyup', SleepMenu, true);
  },

  show: function sm_show() {
    this.element.classList.add('visible');
  },

  hide: function sm_hide() {
    this.element.classList.remove('visible');
  },

  handleEvent: function sm_handleEvent(evt) {
    if (!this.visible)
      return;

    switch (evt.type) {
      case 'click':
        var action = evt.target.dataset.value;
        switch (action) {
          case 'airplane':
            var settings = window.navigator.mozSettings;
            if (settings) {
              var settingName = 'ril.radio.disabled'
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
        this.hide();
        break;

      case 'keyup':
        if (evt.keyCode == evt.DOM_VK_ESCAPE ||
            evt.keyCode == evt.DOM_VK_HOME) {

            this.hide();
            evt.preventDefault();
            evt.stopPropagation();
         }
        break;
    }
  }
};
