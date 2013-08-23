'use strict';

var CustomLogoPath = {
  poweron: {
    video: '/resources/power/carrier_power_on.mp4',
    image: '/resources/power/carrier_power_on.png'
  },
  poweroff: {
    video: '/resources/power/carrier_power_off.mp4',
    image: '/resources/power/carrier_power_off.png'
  }
};

// Function to animate init starting logo
var InitLogoHandler = {
  ready: false,
  animated: false,
  readyCallBack: null,
  logoLoader: null,

  get carrierLogo() {
    delete this.carrierLogo;
    return (this.carrierLogo = document.getElementById('carrier-logo'));
  },

  get osLogo() {
    delete this.osLogo;
    return (this.osLogo = document.getElementById('os-logo'));
  },

  init: function ilh_init(logoLoader) {
    this.logoLoader = logoLoader;
    logoLoader.onnotfound = this._removeCarrierPowerOn.bind(this);
    logoLoader.onload = this._appendCarrierPowerOn.bind(this);
  },

  _removeCarrierPowerOn: function ilh_removeCarrierPowerOn() {
    var self = this;
    if (this.carrierLogo) {
      this.carrierLogo.parentNode.removeChild(self.carrierLogo);
      this._setReady();
    } else {
      var self = this;
      document.addEventListener('DOMContentLoaded', function() {
        self.carrierLogo.parentNode.removeChild(self.carrierLogo);
        self._setReady();
      });
    }
  },

  _appendCarrierPowerOn: function ilh_appendCarrierPowerOn() {
    if (this.carrierLogo) {
      this.carrierLogo.appendChild(this.logoLoader.element);
      this._setReady();
    } else {
      var self = this;
      document.addEventListener('DOMContentLoaded', function() {
        self.carrierLogo.appendChild(self.logoLoader.element);
        self._setReady();
      });
    }
  },

  _setReady: function ilh_setReady() {
    this.ready = true;
    var elem = this.logoLoader.element;
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
  },

  _waitReady: function ilh_waitReady(callback) {
    this.readyCallBack = callback;
  },

  animate: function ilh_animate(callback) {
    var self = this;

    if (!this.ready) {
      this._waitReady(this.animate.bind(this, callback));
      return;
    }

    if (this.animated)
      return;

    this.animated = true;

    // No carrier logo - Just animate OS logo.
    if (!self.logoLoader.found) {
      self.osLogo.classList.add('hide');

    // Has carrier logo - Animate carrier logo, then OS logo.
    } else {
      // CarrierLogo is not transparent until now
      // to prevent flashing.
      self.carrierLogo.className = 'transparent';

      var elem = self.logoLoader.element;
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
        self.carrierLogo.removeEventListener('transitionend', transCarrierLogo);
        if (elem.tagName.toLowerCase() == 'video') {
          // XXX workaround of bug 831747
          // Unload the video. This releases the video decoding hardware
          // so other apps can use it.
          elem.removeAttribute('src');
          elem.load();
        }
        self.carrierLogo.parentNode.removeChild(self.carrierLogo);

        self.osLogo.classList.add('hide');
        self.carrierPowerOnElement = null;
      });
    }

    self.osLogo.addEventListener('transitionend', function transOsLogo() {
      self.osLogo.removeEventListener('transitionend', transOsLogo);
      self.osLogo.parentNode.removeChild(self.osLogo);
      if (callback) {
        callback();
      }
    });
  }
};

InitLogoHandler.init(new LogoLoader(CustomLogoPath.poweron));
