'use strict';

var SoftwareButtonManager = {
  hasHardwareHomeButton: true,
  _enable: false,
  OverrideFlag: false,
  get height() {
    if (!this._enable)
      return 0;
    return this._cacheHeight ||
          (this._cacheHeight = this.element.getBoundingClientRect().height);
  },

  init: function sbm_init() {
    var isMobile = ScreenLayout.getCurrentLayout('tiny');
    var isOnRealDevice = ScreenLayout.isOnRealDevice();
    this.hasHardwareHomeButton =
      ScreenLayout.getCurrentLayout('hardwareHomeButton');
    // _enable is true on mobile that has no hardware home button
    this._enable = !this.hasHardwareHomeButton && isMobile;
    this.element = document.getElementById('software-buttons');
    this.homeButton = document.getElementById('software-home-button');
    this.fullscreenHomeButton =
      document.getElementById('fullscreen-software-home-button');
    this.screenElement = document.getElementById('screen');

    if (isMobile && isOnRealDevice) {
      if (!this.hasHardwareHomeButton) {
        this.OverrideFlag = true;
        var lock = SettingsListener.getSettingsLock();
        lock.set({'software-button.enabled': true});
      }

      SettingsListener.observe('software-button.enabled', false,
        function onObserve(value) {
          // Default settings from build/settings.js will override the value
          // of 'software-button.enabled', so we set a flag to avoid it
          // in case.
          if (this.OverrideFlag) {
            this.OverrideFlag = false;
            return;
          }
          this._enable = value;
          this.toggle();
          this.dispatchResizeEvent(value);
        }.bind(this));
    } else {
      this._enable = false;
      this.toggle();
    }

    this.homeButton.addEventListener('mousedown', this);
    this.homeButton.addEventListener('mouseup', this);
    this.fullscreenHomeButton.addEventListener('mousedown', this);
    this.fullscreenHomeButton.addEventListener('mouseup', this);
    window.addEventListener('mozfullscreenchange', this);
    window.addEventListener('homegesture-enabled', this);
    window.addEventListener('homegesture-disabled', this);
  },

  dispatchResizeEvent: function sbm_dispatchResizeEvent(evtName) {
    if (this._enable) {
      window.dispatchEvent(new Event('software-button-enabled'));
    } else {
      window.dispatchEvent(new Event('software-button-disabled'));
    }
  },

  publish: function sbm_publish(type) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('softwareButtonEvent', true, false, {
      type: type
    });
    this.element.dispatchEvent(evt);
  },

  toggle: function sbm_toggle() {
    delete this._cacheHeight;
    if (this._enable) {
      this.element.classList.add('visible');
      this.screenElement.classList.add('software-button-enabled');
      this.screenElement.classList.remove('software-button-disabled');
    } else {
      this.element.classList.remove('visible');
      this.screenElement.classList.remove('software-button-enabled');
      this.screenElement.classList.add('software-button-disabled');
    }
  },

  handleEvent: function sbm_handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        this.publish('home-button-press');
        break;
      case 'mouseup':
        this.publish('home-button-release');
        break;
      case 'homegesture-disabled':
        // at least one of software home button or gesture is enabled
        // when no hardware home button
        if (!this.hasHardwareHomeButton && !this._enable) {
          var lock = SettingsListener.getSettingsLock();
          lock.set({'software-button.enabled': true});
        }
        break;
      case 'homegesture-enabled':
        if (this._enable) {
          var lock = SettingsListener.getSettingsLock();
          lock.set({'software-button.enabled': false});
        }
        break;
      case 'mozfullscreenchange':
        if (!this._enable)
          return;
        if (document.mozFullScreenElement) {
          this.fullscreenHomeButton.classList.add('visible');
        } else {
          this.fullscreenHomeButton.classList.remove('visible');
        }
        break;
    }
  }
};

SoftwareButtonManager.init();
