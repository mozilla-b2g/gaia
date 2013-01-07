/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SleepMenu = {
  // Indicate setting status of ril.radio.disabled
  isFlightModeEnabled: false,

  // Indicate setting status of volume
  isSilentModeEnabled: false,

  elements: {},

  get visible() {
    return this.elements.overlay.classList.contains('visible');
  },

  getAllElements: function sm_getAllElements() {
    this.elements.overlay = document.getElementById('sleep-menu');
    this.elements.container =
      document.querySelector('#sleep-menu-container ul');
    this.elements.cancel = document.querySelector('#sleep-menu button');
  },

  init: function sm_init() {
    this.getAllElements();
    window.addEventListener('holdsleep', this.show.bind(this));
    window.addEventListener('click', this, true);
    window.addEventListener('screenchange', this, true);
    window.addEventListener('home', this);
    this.elements.cancel.addEventListener('click', this);

    var self = this;
    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      self.isFlightModeEnabled = value;
    });
  },

  // Generate items
  generateItems: function sm_generateItems() {
    var items = [];
    var _ = navigator.mozL10n.get;
    var options = {
      airplane: {
        label: _('airplane'),
        value: 'airplane',
        icon: '/style/sleep_menu/images/airplane.png'
      },
      airplaneOff: {
        label: _('airplaneOff'),
        value: 'airplane'
      },
      silent: {
        label: _('silent'),
        value: 'silent',
        icon: '/style/sleep_menu/images/vibration.png'
      },
      silentOff: {
        label: _('normal'),
        value: 'silentOff'
      },
      restart: {
        label: _('restart'),
        value: 'restart',
        icon: '/style/sleep_menu/images/restart.png'
      },
      power: {
        label: _('power'),
        value: 'power',
        icon: '/style/sleep_menu/images/power-off.png'
      }
    };

    if (this.isFlightModeEnabled) {
      items.push(options.airplaneOff);
    } else {
      items.push(options.airplane);
    }

    if (!this.isSilentModeEnabled) {
      items.push(options.silent);
    } else {
      items.push(options.silentOff);
    }

    items.push(options.restart);
    items.push(options.power);

    return items;
  },

  show: function sm_show() {
    this.elements.container.innerHTML = '';
    this.buildMenu(this.generateItems());
    this.elements.overlay.classList.add('visible');
  },

  buildMenu: function sm_buildMenu(items) {
    items.forEach(function traveseItems(item) {
      var item_li = document.createElement('li');
      item_li.dataset.value = item.value;
      item_li.textContent = item.label;
      this.elements.container.appendChild(item_li);
    }, this);
  },

  hide: function lm_hide() {
    this.elements.overlay.classList.remove('visible');
  },

  handleEvent: function sm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (!evt.detail.screenEnabled)
          this.hide();
        break;

      case 'click':
        if (!this.visible)
          return;

        if (evt.currentTarget === this.elements.cancel) {
          this.hide();
          return;
        }

        var action = evt.target.dataset.value;
        if (!action) {
          return;
        }
        this.hide();
        this.handler(action);
        break;

      case 'home':
        if (this.visible) {
          this.hide();
        }
        break;
    }
  },

  handler: function sm_handler(action) {
    switch (action) {
      case 'airplane':
        // Airplane mode should turn off
        //
        // Radio ('ril.radio.disabled'`)
        // Data ('ril.data.enabled'`)
        // Wifi
        // Bluetooth
        // Geolocation
        //
        // It should also save the status of the latter 4 items
        // so when leaving the airplane mode we could know which one to turn on.

        if (!window.navigator.mozSettings)
          return;

        SettingsListener.getSettingsLock().set({
          'ril.radio.disabled': !this.isFlightModeEnabled
        });

        break;

      // About silent and silentOff
      // * Turn on silent mode will cause:
      //   * Turn off ringtone no matter if ring is on or off
      //   * for sms and incoming calls.
      // * Turn off silent mode will cause:
      //   * Turn on ringtone no matter if ring is on or off
      //   * for sms and incoming calls.
      case 'silent':
        if (!window.navigator.mozSettings)
          return;

        SettingsListener.getSettingsLock().set({
          'ring.enabled': false
        });
        this.isSilentModeEnabled = true;

        break;

      case 'silentOff':
        if (!window.navigator.mozSettings)
          return;

        SettingsListener.getSettingsLock().set({
          'ring.enabled': true
        });
        this.isSilentModeEnabled = false;

        break;

      case 'restart':
        this.startPowerOff(true);

        break;

      case 'power':
        this.startPowerOff(false);

        break;
    }
  },

  startPowerOff: function sm_startPowerOff(reboot) {
    var power = navigator.mozPower;
    if (!power)
      return;

    // Show shutdown animation before actually performing shutdown.
    //  * step1: fade-in poweroff-splash.
    //  * step2: The 3-rings animation is performed on the screen.
    var div = document.createElement('div');
    div.dataset.zIndexLevel = 'poweroff-splash';
    div.id = 'poweroff-splash';

    // The overall animation ends when the inner span of the bottom ring
    // is animated, so we store it for detecting.
    var inner;

    for (var i = 1; i <= 3; i++) {
      var outer = document.createElement('span');
      outer.className = 'poweroff-ring';
      outer.id = 'poweroff-ring-' + i;
      div.appendChild(outer);

      inner = document.createElement('span');
      outer.appendChild(inner);
    }

    div.className = 'step1';

    var nextAnimation = function nextAnimation(e) {
      // Switch to next class
      if (e.target == div)
        div.className = 'step2';

      if (e.target != inner)
        return;

      // Actual poweroff/reboot
      setTimeout(function powerOffAnimated() {
        if (reboot) {
          power.reboot();
        } else {
          power.powerOff();
        }
      });

      // Paint screen to black before reboot/poweroff
      ScreenManager.turnScreenOff(true);
    };

    div.addEventListener('animationend', nextAnimation);

    document.getElementById('screen').appendChild(div);
  }
};

SleepMenu.init();
