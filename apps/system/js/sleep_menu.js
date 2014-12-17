'use strict';
/* global CustomLogoPath */
/* global Event */
/* global LogoLoader */
/* global OrientationManager */
/* global SettingsListener */

(function(exports) {

  /**
   * SleepMenu controls functionality found in the menu after long-pressing on
   * the power button. Controls include: airplane mode, silence incoming calls,
   * restart, and power off. This file also currently contains a
   * developerOptions object which is not currently in use.
   * @class SleepMenu
   * @requires InitLogoHandler
   * @requires LogoLoader
   * @requires OrientationManager
   * @requires SettingsListener
   */
  function SleepMenu() {}

  SleepMenu.prototype = {

    /**
     * Indicate setting status of ril.radio.disabled
     * @memberof SleepMenu.prototype
     * @type {Boolean}
     */
    isFlightModeEnabled: false,

    /**
     * Indicate setting status of developer.menu.enabled
     * @memberof SleepMenu.prototype
     * @type {Boolean}
     */
    isDeveloperMenuEnabled: false,

    /**
     * Additional options to show in the menu if developer menu is enabled.
     * @memberof SleepMenu.prototype
     * @type {Object}
     */
    developerOptions: {
    },

    /**
     * Indicate setting status of volume
     * @memberof SleepMenu.prototype
     * @type {Boolean}
     */
    isSilentModeEnabled: false,

    /**
     * References to elements in the menu.
     * @memberof SleepMenu.prototype
     * @type {Object}
     */
    elements: {},

    /**
     * Whether or not the sleep menu is visibile.
     * @memberof SleepMenu.prototype
     * @return {Boolean}
     */
    get visible() {
      return this.elements.overlay.classList.contains('visible');
    },

    /**
     * Populates this.elements with references to elements.
     * @memberof SleepMenu.prototype
     */
    getAllElements: function sm_getAllElements() {
      this.elements.overlay = document.getElementById('sleep-menu');
      this.elements.container =
        document.querySelector('#sleep-menu-container ul');
      this.elements.cancel = document.querySelector('#sleep-menu button');
    },

    /**
     * Start listening for events and settings changes.
     * @memberof SleepMenu.prototype
     */
    start: function sm_init() {
      this.getAllElements();
      window.addEventListener('holdsleep', this.show.bind(this));
      window.addEventListener('click', this, true);
      window.addEventListener('screenchange', this, true);
      window.addEventListener('home', this);
      window.addEventListener('batteryshutdown', this);
      window.addEventListener('cardviewbeforeshow', this);

      window.addEventListener('attentionopened', this);
      this.elements.cancel.addEventListener('click', this);

      var self = this;
      SettingsListener.observe('ril.radio.disabled', false, function(value) {
        self.isFlightModeEnabled = value;
      });

      SettingsListener.observe('developer.menu.enabled', false,
        function(value) {
        self.isDeveloperMenuEnabled = value;
      });

      for (var option in this.developerOptions) {
        /* jshint loopfunc: true */
        (function attachListenerToDeveloperOption(opt) {
          SettingsListener.observe(opt.setting, opt.value, function(value) {
            opt.value = value;
          });
       })(this.developerOptions[option]);
      }

      SettingsListener.observe('audio.volume.notification', 7, function(value) {
        self.isSilentModeEnabled = (value === 0);
      });
    },

    /**
     * Generates menu items.
     * @memberof SleepMenu.prototype
     */
    generateItems: function sm_generateItems() {
      var items = [];
      var _ = navigator.mozL10n.get;
      var options = {
        airplane: {
          label: _('airplane'),
          value: 'airplane'
        },
        airplaneOff: {
          label: _('airplaneOff'),
          value: 'airplane'
        },
        silent: {
          label: _('silent'),
          value: 'silent'
        },
        silentOff: {
          label: _('normal'),
          value: 'silentOff'
        },
        restart: {
          label: _('restart'),
          value: 'restart'
        },
        power: {
          label: _('power'),
          value: 'power'
        }
      };

      if (this.isFlightModeEnabled) {
        items.push(options.airplaneOff);
      } else {
        items.push(options.airplane);
      }

      if (navigator.mozTelephony) {
        if (!this.isSilentModeEnabled) {
          items.push(options.silent);
        } else {
          items.push(options.silentOff);
        }
      }

      items.push(options.restart);
      items.push(options.power);

      // Add the developer options at the end.
      if (this.isDeveloperMenuEnabled) {
        for (var option in this.developerOptions) {
          if (this.developerOptions[option].value) {
            items.push(options[option]);
          } else {
            items.push(options[option + 'Off']);
          }
        }
      }

      return items;
    },

    /**
     * Shows the sleep menu.
     * @memberof SleepMenu.prototype
     */
    show: function sm_show() {
      this.elements.container.innerHTML = '';
      this.buildMenu(this.generateItems());
      this.elements.overlay.classList.add('visible');
      // Lock to default orientation
      screen.mozLockOrientation(OrientationManager.defaultOrientation);
    },

    /**
     * Builds markup for all menu items.
     * @memberof SleepMenu.prototype
     * @param {Array} items A list of items.
     */
    buildMenu: function sm_buildMenu(items) {
      items.forEach(function traveseItems(item) {
        var item_li = document.createElement('li');
        item_li.dataset.value = item.value;
        item_li.textContent = item.label;
        item_li.setAttribute('role', 'menuitem');
        this.elements.container.appendChild(item_li);
      }, this);
    },

    /**
     * Hides the sleep menu.
     * @memberof SleepMenu.prototype
     */
    hide: function lm_hide() {
      if (!this.elements.overlay.classList.contains('visible')) {
        return;
      }
      this.elements.overlay.classList.remove('visible');
      window.dispatchEvent(new Event('sleepmenuhide'));
    },

    /**
     * General event handler.
     * @memberof SleepMenu.prototype
     * @param {Event} evt The event to handle.
     */
    handleEvent: function sm_handleEvent(evt) {
      switch (evt.type) {
        case 'cardviewbeforeshow':
          this.hide();
          break;

        case 'batteryshutdown':
          window.dispatchEvent(
              new CustomEvent('requestshutdown', {detail: this}));
          break;

        case 'screenchange':
          if (!evt.detail.screenEnabled) {
            this.hide();
          }
          break;

        case 'click':
          if (!this.visible) {
            return;
          }

          if (evt.currentTarget === this.elements.cancel) {
            this.hide();
            return;
          }

          var action = evt.target.dataset.value;
          if (!action) {
            return;
          }
          this.clickHandler(action);
          break;

        case 'home':
        case 'attentionopened':
          if (this.visible) {
            this.hide();
          }
          break;

        default:
          break;
      }
    },

    publish: function(evtName) {
      window.dispatchEvent(new CustomEvent(evtName));
    },

    /**
     * Handles click events on menu items.
     * @memberof SleepMenu.prototype
     * @param {String} action The action of the clicked menu item.
     */
    clickHandler: function sm_clickHandler(action) {
      switch (action) {
        case 'airplane':
          this.hide();
          // Airplane mode should turn off
          //
          // Radio ('ril.radio.disabled'`)
          // Data ('ril.data.enabled'`)
          // Wifi
          // Bluetooth
          // Geolocation
          //
          // It should also save the status of the latter 4 items so when
          // leaving the airplane mode we could know which one to turn on.
          this.publish(this.isFlightModeEnabled ?
            'request-airplane-mode-disable' :
            'request-airplane-mode-enable');
          break;

        // About silent and silentOff
        // * Turn on silent mode will cause:
        //   send a custom event 'mute' to sound manager
        // * Turn off silent mode will cause:
        //   send a custom event 'unmute' to sound manager
        case 'silent':
          this.hide();
          window.dispatchEvent(new Event('mute'));
          this.isSilentModeEnabled = true;

          break;

        case 'silentOff':
          this.hide();
          window.dispatchEvent(new Event('unmute'));
          this.isSilentModeEnabled = false;

          break;

        case 'restart':
          this.startPowerOff(true);

          break;

        case 'power':
          this.startPowerOff(false);

          break;

        default:
          break;
      }
    },

    /**
     * Begins the power off of the device. Also reboots the device if
     * requested.
     * @memberof SleepMenu.prototype
     * @param {Boolean} reboot Whether or not to reboot the phone.
     */
    startPowerOff: function sm_startPowerOff(reboot) {
      this.publish('will-shutdown');
      var power = navigator.mozPower;
      var self = this;
      if (!power) {
        return;
      }

      // Early return if we are already shutting down.
      if (document.getElementById('poweroff-splash')) {
        return;
      }


      // Show shutdown animation before actually performing shutdown.
      //  * step1: fade-in poweroff-splash.
      //  * step2: - As default, 3-ring animation is performed on the screen.
      //           - Manufacturer can customize the animation using mp4/png
      //             file to replace the default.
      var div = document.createElement('div');
      div.dataset.zIndexLevel = 'poweroff-splash';
      div.id = 'poweroff-splash';


      var logoLoader = new LogoLoader(CustomLogoPath.poweroff);

      logoLoader.onload = function customizedAnimation(elem) {
        // Perform customized animation.
        div.appendChild(elem);
        div.className = 'step1';

        if (elem.tagName.toLowerCase() == 'video' && !elem.ended) {
          elem.onended = function() {
            elem.classList.add('hide');
            // XXX workaround of bug 831747
            // Unload the video. This releases the video decoding hardware
            // so other apps can use it.
            elem.removeAttribute('src');
            elem.load();
          };
          elem.play();
        } else {
          div.addEventListener('animationend', function() {
            elem.classList.add('hide');
            if (elem.tagName.toLowerCase() == 'video') {
                // XXX workaround of bug 831747
                // Unload the video. This releases the video decoding hardware
                // so other apps can use it.
                elem.removeAttribute('src');
                elem.load();
            }
          });
        }

        elem.addEventListener('transitionend', function() {
          self._actualPowerOff(reboot);
        });
        document.getElementById('screen').appendChild(div);
      };

      logoLoader.onnotfound = function defaultAnimation() {
        // - Perform OS default animation.

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
          if (e.target == div) {
            div.className = 'step2';
          }

          if (e.target != inner) {
            return;
          }

          self._actualPowerOff(reboot);
        };
        div.addEventListener('animationend', nextAnimation);

        document.getElementById('screen').appendChild(div);
      };
    },

    /**
     * Helper for powering the device off.
     * @memberof SleepMenu.prototype
     * @param {Boolean} isReboot Whether or not to reboot the phone.
     */
    _actualPowerOff: function sm_actualPowerOff(isReboot) {
      var power = navigator.mozPower;

      if (isReboot) {
        power.reboot();
      } else {
        power.powerOff();
      }
    }
  };

  exports.SleepMenu = SleepMenu;

}(window));
