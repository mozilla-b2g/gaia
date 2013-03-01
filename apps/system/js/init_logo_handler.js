'use strict';

// Function to animate init starting logo
var InitLogoHandler = {
  carrierVideoPath: '/resources/power/carrier_power_on.mp4',
  carrierImagePath: '/resources/power/carrier_power_on.png',
  noCarrierVideo: false,
  noCarrierImage: false,
  ready: false,
  readyCallBack: null,
  carrierPowerOnElement: null,

  get carrierLogo() {
    delete this.carrierLogo;
    return (this.carrierLogo = document.getElementById('carrier-logo'));
  },

  get osLogo() {
    delete this.osLogo;
    return (this.osLogo = document.getElementById('os-logo'));
  },

  init: function ilh_init() {
    var self = this;

    //Load carrier animation / logo if exist.
    //Only one of them will be success so try loading them at the same time.
    this._initCarrierVideo();
    this._initCarrierImage();
  },

  _initCarrierVideo: function ilh__initCarrierVideo() {
    var video = document.createElement('video');
    video.src = this.carrierVideoPath;
    video.setAttribute('autoplay', null);
    var self = this;
    video.oncanplay = function() {
      self.carrierPowerOnElement = video;
      self._appendCarrierPowerOn();
    };

    video.onerror = function() {
      self.noCarrierVideo = true;
      if (self.noCarrierImage)
        self._removeCarrierPowerOn();
    };
  },

  _initCarrierImage: function ilh_initCarrierImage() {
    var self = this;
    var img = new Image();
    img.src = this.carrierImagePath;
    img.onload = function() {
      self.carrierPowerOnElement = img;
      self._appendCarrierPowerOn();
    };

    img.onerror = function() {
      self.noCarrierImage = true;
      if (self.noCarrierVideo)
        self._removeCarrierPowerOn();
    };
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
      this.carrierLogo.appendChild(this.carrierPowerOnElement);
      this._setReady();
    } else {
      var self = this;
      document.addEventListener('DOMContentLoaded', function() {
        self.carrierLogo.appendChild(self.carrierPowerOnElement);
        self._setReady();
      });
    }
  },

  _setReady: function ilh_setReady() {
    this.ready = true;
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

    // No carrier logo - Just animate OS logo.
    if (self.noCarrierVideo && self.noCarrierImage) {
      self.osLogo.classList.add('hide');

    // Has carrier logo - Animate carrier logo, then OS logo.
    } else {
      // CarrierLogo is not transparent until now
      // to prevent flashing.
      self.carrierLogo.className = 'transparent';

      var elem = self.carrierPowerOnElement;
      if (elem.tagName == 'VIDEO' && !elem.ended) {
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

InitLogoHandler.init();
