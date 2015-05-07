/* global BaseModule, LogoLoader */
'use strict';

(function(exports) {
  const DEFAULT_RESOURCES = {
    poweron: {
      video: '/resources/power/carrier_power_on.mp4',
      image: '/resources/power/carrier_power_on.png'
    },
    poweroff: {
      video: '/resources/power/carrier_power_off.mp4',
      image: '/resources/power/carrier_power_off.png'
    }
  };

  const ATT_PWRON_VIDEO = 'poweron.video';
  const ATT_PWRON_IMG = 'poweron.image';
  const ATT_PWROFF_VIDEO = 'poweroff.video';
  const ATT_PWROFF_IMG = 'poweroff.image';

  var CoverScreen = function() {};
  CoverScreen.SETTINGS = [
    'operatorResources.power'
  ];
  CoverScreen.SERVICES = [
    'poweroff',
    'animatePoweronLogo'
  ];
  BaseModule.create(CoverScreen, {
    name: 'CoverScreen',
    EVENT_PREFIX: 'initlogo',
    ready: false,
    animated: false,
    readyCallBack: null,
    DEBUG: false,

    SETTING_POWER: 'operatorResources.power',

    _start: function() {
      this.carrierLogo = document.getElementById('carrier-logo');
      this.osLogo = document.getElementById('os-logo');
      this.service.request('registerHierarchy', this);
    },

    _removeCarrierPowerOn: function ilh_removeCarrierPowerOn() {
      var self = this;
      if (this.carrierLogo && this.carrierLogo.parentNode) {
        this.carrierLogo.parentNode.removeChild(self.carrierLogo);
        this._setReady();
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          if (self.carrierLogo) {
            self.carrierLogo.parentNode.removeChild(self.carrierLogo);
          }
          self._setReady();
        });
      }
    },

    _appendCarrierPowerOn: function ilh_appendCarrierPowerOn() {
      this.debug('appending power on logo');
      if (this.carrierLogo) {
        this.carrierLogo.appendChild(this.poweronLogoLoader.element);
        this._setReady();
      } else {
        var self = this;
        document.addEventListener('DOMContentLoaded', function() {
          self.carrierLogo.appendChild(self.poweronLogoLoader.element);
          self._setReady();
        });
      }
    },

    _setReady: function ilh_setReady() {
      this.ready = true;
      var elem = this.poweronLogoLoader.element;
      if (elem && elem.tagName.toLowerCase() == 'video') {
        // Play video just after the element is first painted.
        window.addEventListener('mozChromeEvent', function startVideo(e) {
          if (e.detail.type == 'system-first-paint') {
            window.removeEventListener('mozChromeEvent', startVideo);
            if (elem && elem.ended === false) {
              elem.play();
            }
          }
        });
      }
      if (this.readyCallBack) {
        this.readyCallBack();
        this.readyCallBack = null;
      }
      this.publish('-activated');
    },

    _waitReady: function ilh_waitReady(callback) {
      this.readyCallBack = callback;
    },

    setDefaultValues: function () {
      if (!this._poweron) {
        this._poweron = {};
      }
      if (!this._poweroff) {
        this._poweroff = {};
      }
      this._poweron.video = DEFAULT_RESOURCES.poweron.video;
      this._poweron.image = DEFAULT_RESOURCES.poweron.image;
      this._poweroff.video = DEFAULT_RESOURCES.poweroff.video;
      this._poweroff.image = DEFAULT_RESOURCES.poweroff.image;
    },

    '_observe_operatorResources.power': function(powerValues) {
      if (!powerValues) {
        this.debug('No power on settings found, using default.');
        this.setDefaultValues();
        this.poweron();
        return;
      }
      if (!this._poweron) {
        this._poweron = {};
      }
      if (!this._poweroff) {
        this._poweroff = {};
      }
      this._poweron.video = powerValues[ATT_PWRON_VIDEO] ||
        DEFAULT_RESOURCES.poweron.video;
      this._poweron.image = powerValues[ATT_PWRON_IMG] ||
        DEFAULT_RESOURCES.poweron.image;
      this._poweroff.video = powerValues[ATT_PWROFF_VIDEO] ||
        DEFAULT_RESOURCES.poweroff.video;
      this._poweroff.image = powerValues[ATT_PWROFF_IMG] ||
        DEFAULT_RESOURCES.poweroff.image;
    },

    poweron: function() {
      this.debug('start poweron logo: ' + JSON.stringify(this._poweron));
      this.poweronLogoLoader = new LogoLoader(this._poweron);
      this.poweronLogoLoader.onnotfound = this._removeCarrierPowerOn.bind(this);
      this.poweronLogoLoader.onload = this._appendCarrierPowerOn.bind(this);
    },

    isActive: function() {
      return this.ready && !this.animated;
    },

    animatePoweronLogo: function ilh_animate(callback) {
      var self = this;

      if (!this.ready) {
        this._waitReady(this.animatePoweronLogo.bind(this, callback));
        return;
      }

      if (this.animated) {
        return;
      }

      this.debug('stopping poweron logo');

      this.animated = true;

      this.publish('-deactivated');
      this.service.request('unregisterHierarchy', this);

      // No carrier logo - Just animate OS logo.
      if (!this.poweronLogoLoader.found) {
        this.osLogo.classList.add('hide');

      // Has carrier logo - Animate carrier logo, then OS logo.
      } else {
        // CarrierLogo is not transparent until now
        // to prevent flashing.
        this.carrierLogo.className = 'transparent';

        var elem = this.poweronLogoLoader.element;
        if (elem.tagName.toLowerCase() == 'video' && !elem.ended) {
          // compability: ensure movie being played here in case
          // system-first-paint is not supported by Gecko.
          elem.play();
          elem.onended = function() {
            elem.classList.add('hide');
          };
        } else {
          elem.classList.add('hide');
        }

        self.carrierLogo.addEventListener('transitionend',
        function transCarrierLogo(evt) {
          evt.stopPropagation();
          self.carrierLogo.removeEventListener('transitionend',
            transCarrierLogo);
          if (elem.tagName.toLowerCase() == 'video') {
            // XXX workaround of bug 831747
            // Unload the video. This releases the video decoding hardware
            // so other apps can use it.
            elem.removeAttribute('src');
            elem.load();
          }
          self.carrierLogo.parentNode.removeChild(self.carrierLogo);
          delete self.carrierLogo; // Don't entrain the DOM nodes.

          self.osLogo.classList.add('hide');
          self.carrierPowerOnElement = null;
        });
      }

      self.osLogo.addEventListener('transitionend', function transOsLogo() {
        self.osLogo.removeEventListener('transitionend', transOsLogo);
        self.osLogo.parentNode.removeChild(self.osLogo);
        delete self.osLogo; // Don't entrain the DOM nodes.
        window.performance.mark('osLogoEnd');
        window.dispatchEvent(new CustomEvent('logohidden'));
        if (callback) {
          callback();
        }
      });
    },

    poweroff: function(reboot) {
      this.debug('start poweroff logo');
      var power = navigator.mozPower;
      var self = this;
      if (!power) {
        return;
      }

      // Early return if we are already shutting down.
      if (document.getElementById('poweroff-splash')) {
        return;
      }
      this.publish('will-shutdown', null, true);


      // Show shutdown animation before actually performing shutdown.
      //  * step1: fade-in poweroff-splash.
      //  * step2: - As default, 3-ring animation is performed on the screen.
      //           - Manufacturer can customize the animation using mp4/png
      //             file to replace the default.
      var div = document.createElement('div');
      div.dataset.zIndexLevel = 'poweroff-splash';
      div.id = 'poweroff-splash';

      this.poweroffLogoLoader = new LogoLoader(this._poweroff);

      this.poweroffLogoLoader.onload = function(elem) {
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

      this.poweroffLogoLoader.onnotfound = function() {
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
      this.debug('stopping poweroff logo and poweroff/reboot');
      var power = navigator.mozPower;

      if (isReboot) {
        power.reboot();
      } else {
        power.powerOff();
      }
    }
  });

  // We need to start as early as possible.
  exports.CoverScreen = BaseModule.instantiate('CoverScreen');
  exports.CoverScreen.start();
}(window));
