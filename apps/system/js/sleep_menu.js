/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SleepMenu = {

  // Indicate setting status of ril.radio.disabled
  isRadioEnabled: true,

  // Indicate setting status of volume
  isVolumeEnabled: !!SoundManager.currentVolume,

  init: function sm_init() {
    var self = this;

    SettingsListener.observe('ril.radio.disabled', true,
    function radioSettingsChanged(value) {
      if (typeof value === 'string')
        value = (value == 'true');

      self.isRadioEnabled = value;
    });

    SettingsListener.observe('phone.ring.incoming', true,
    function radioSettingsChanged(value) {
      if (typeof value === 'string')
        value = (value == 'true');

      self.isVolumeEnabled = value;
    });

    window.addEventListener('volumechange', this);
    window.addEventListener('keydown', this, true);
    window.addEventListener('keyup', this, true);
  },

  // Update items only if list menu is visible
  updateItems: function sm_updateItems() {
    if (ListMenu.visible) {
      this.show();
    }
  },

  // Generate items
  generateItems: function sm_generateItems() {
    var items = [];
    var settings = window.navigator.mozSettings;
    var _ = document.mozL10n.get;
    var options = {
      airplane: {
        label: _('airplane'),
        value: 'airplane',
        icon: '/style/sleep_menu/images/airplane.png'
      },
      ground: {
        label: _('ground'),
        value: 'airplane'
      },
      silent: {
        label: _('silent'),
        value: 'silent',
        icon: '/style/sleep_menu/images/vibration.png'
      },
      normal: {
        label: _('normal'),
        value: 'normal'
      },
      restart: {
        label: _('restart'),
        value: 'restart',
        icon: '/style/sleep_menu/images/power-off.png'
      },
      power: {
        label: _('power'),
        value: 'power',
        icon: '/style/sleep_menu/images/restart.png'
      }
    };

    if (this.isRadioEnabled) {
      items.push(options.ground);
    } else {
      items.push(options.airplane);
    }

    if (this.isVolumeEnabled) {
      items.push(options.silent);
    } else {
      items.push(options.normal);
    }

    items.push(options.restart);
    items.push(options.power);

    return items;
  },

  // Event handler for addEventListener
  handleEvent: function sm_handleEvent(evt) {
    switch (evt.type) {
      case 'volumechange':
        this.updateVolumeStatus();
        break;

      case 'keydown':
        // The screenshot module also listens for the SLEEP key and
        // can call defaultPrevented() on keydown and key up events.
        if (evt.keyCode == evt.DOM_VK_SLEEP &&
            !evt.defultPrevented && !ListMenu.visible) {
          this._longpressTriggered = false;
          this._sleepMenuTimeout = window.setTimeout((function sm_timeout() {
            this.show();
            this._longpressTriggered = true;
            this._sleepMenuTimeout = null;
          }).bind(this), 1500);
        }
        break;

      case 'keyup':
        if (ListMenu.visible) {
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

        if (!this._sleepMenuTimeout || evt.keyCode != evt.DOM_VK_SLEEP)
          return;

        window.clearTimeout(this._sleepMenuTimeout);
        this._sleepMenuTimeout = null;

        break;
    }
  },

  show: function sm_show() {
    ListMenu.request(this.generateItems(), this.handler);
  },

  updateVolumeStatus: function sm_updateVolumeStatus() {
    if (this.isVolumeEnabled !== !!SoundManager.currentVolume) {
      this.isVolumeEnabled = !!SoundManager.currentVolume;
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
