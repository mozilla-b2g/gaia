/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SleepMenu = {
  airplane: {
      label: 'airplane',
      value: 'airplane'
  },
  ground: {
      label: 'ground',
      value: 'airplane'
  },
  silent: {
      label: 'silent',
      value: 'silent'
  },
  normal: {
      label: 'normal',
      value: 'normal'
  },
  restart: {
      label: 'restart',
      value: 'restart'
  },
  power: {
      label: 'power',
      value: 'power'
  },

  isRadioEnabled: true,

  isVolumeEnabled: !!SoundManager.currentVolume,

  init: function sm_init() {

    var self = this;

    SettingsListener.observe('ril.radio.disabled', true,
    function radioSettingsChanged(value) {
      if (typeof value === 'string')
        value = (value == 'true');

      self.isRadioEnabled = value;
    });
    
    window.addEventListener('volumechange', this);
    window.addEventListener('keydown', this, true);
    window.addEventListener('keyup', this, true);
    console.log('=====INIT SM DONE=====');
  },

  updateItems: function sm_updateItems() {
    this.isVolumeEnabled = !!VolumeManager.currentVolume;
    if (ListMenu.visible) {
      ListMenu.request(this.generateItems(), this.handler);
    }  
  },

  generateItems: function sm_generateItems() {
    var items = [];
    var settings = window.navigator.mozSettings;

    if (this.isRadioEanbled) {
      items.push(this.ground);
    } else {
      items.push(this.airplane);
    }

    if (this.isVolumeEnabled) {
      items.push(this.silent);
    } else {
      items.push(this.normal);
    }

    items.push(this.restart);
    items.push(this.power);

    console.log('======',items.length,'======');
    return items;
  },

  // Event handler for addEventListener
  handleEvent: function sm_handleEvent(evt) {
    console.log('=====',evt.type,'=====',ListMenu.visible);
    switch (evt.type) {
      case 'volumechange':
        this.updateVolumeStatus();
        break;
        
      case 'keydown':
        // The screenshot module also listens for the SLEEP key and
        // can call defaultPrevented() on keydown and key up events.
        if (evt.keyCode == evt.DOM_VK_SLEEP &&
            !evt.defultPrevented && !ListMenu.visible) {
          console.log('=======',ListMenu.visible,'=======');
          this._longpressTriggered = false;
          this._sleepMenuTimeout = window.setTimeout((function sm_timeout() {
            this.show();
            this._longpressTriggered = true;
            this._sleepMenuTimeout = null;
          }).bind(this), 1500);
        }
        break;

      case 'keyup':
        if (this.visible) {
          if (evt.keyCode == evt.DOM_VK_ESCAPE ||
              evt.keyCode == evt.DOM_VK_HOME) {

              ListMenu.hide();
              evt.stopPropagation();
          }

          if (evt.keyCode == evt.DOM_VK_SLEEP &&
              this._longpressTriggered) {
            evt.stopPropagation();
            this._longpressTriggered = false;
          }

          return;
        }

        if (!this._listMenuTimeout || evt.keyCode != evt.DOM_VK_SLEEP)
          return;

        window.clearTimeout(this._listMenuTimeout);
        this._listMenuTimeout = null;

        break;
    }
  },

  show: function sm_show() { 
    console.log('=====sm show=====');
    ListMenu.request(this.generateItems(), this.handler);
  },

  updateVolumeStatus: function sm_updateVolumeStatus() {
    if (this.isVolumeEnabled !== !!SoundManager.currentVolume) {
      this.updateItems();
    }
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
          };
        }
        break;
  
      case 'silent':
        var settings = window.navigator.mozSettings;
        if (settings)
          settings.getLock().set({ 'phone.ring.incoming': false});
        break;

      case 'normal':
        var settings = window.navigator.mozSettings;
        if (settings)
          settings.getLock().set({'phone.ring.incoming': true});
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
