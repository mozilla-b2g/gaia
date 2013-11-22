'use strict';
// TODO: animation for closing app and enable cardview
var HomeGesture = {
  enable: false,
  _moving: false,
  _multiTouch: false,
  _startY1: 0,
  // minimum moving distance to home in pixel of screen height
  MINUMUM_DISTANCE: 50,

  init: function hg_init() {
    var isTablet =
      !ScreenLayout.getCurrentLayout('tiny');
    this.hasHardwareHomeButton =
      ScreenLayout.getCurrentLayout('hardwareHomeButton');
    this.homeBar = document.getElementById('bottom-panel');

    window.addEventListener('software-button-enabled', this);
    window.addEventListener('software-button-disabled', this);
    this.homeBar.addEventListener('touchstart', this, true);
    this.homeBar.addEventListener('touchend', this, true);
    // This 'click' listener can prevent other element which
    // have click listener steal 'touchstart'.
    this.homeBar.addEventListener('click', this, true);

    if (!this.hasHardwareHomeButton && isTablet) {
      // enable gesture for tablet without hardware home button
      // as default
      this.toggle(true);
    } else {
      SettingsListener.observe('homegesture.enabled', false,
        function onObserve(value) {
          this.toggle(value);
        }.bind(this));
    }
  },

  toggle: function hg_toggle(enable) {
    if (enable === this.enable)
      return;
    if (enable) {
      this.publish('homegesture-enabled');
      window.addEventListener('will-unlock', this);
      window.addEventListener('lock', this);
      window.addEventListener('utilitytrayshow', this);
      window.addEventListener('utilitytrayhide', this);
      this.homeBar.classList.add('visible');
    } else {
      this.publish('homegesture-disabled');
      window.removeEventListener('will-unlock', this);
      window.removeEventListener('lock', this);
      window.removeEventListener('utilitytrayshow', this);
      window.removeEventListener('utilitytrayhide', this);
      this.homeBar.classList.remove('visible');
    }
    this.enable = enable;
  },

  handleEvent: function hg_handleEvent(evt) {
    switch (evt.type) {
      case 'touchstart':
        evt.preventDefault();
        this._moving = true;
        this._startY1 = evt.changedTouches[0].pageY;
        if (evt.touches.length > 1) {
          this._multiTouch = true;
        }
        break;
      case 'touchend':
        var progress = Math.abs(this._startY1 - evt.changedTouches[0].pageY);
        if (this._moving &&
            (progress >= this.MINUMUM_DISTANCE)) {
          if (this._multiTouch) {
            dispatchEvent(new CustomEvent('holdhome'));
          } else {
            dispatchEvent(new CustomEvent('home'));
          }
        }
        this._multiTouch = false;
        this._moving = false;
        break;
      // hide gesture function when utilitytray/lockscreen display
      case 'lock':
      case 'utilitytrayshow':
        this.homeBar.classList.remove('visible');
        break;
      case 'will-unlock':
      case 'utilitytrayhide':
        this.homeBar.classList.add('visible');
        break;
      case 'software-button-disabled':
        // at least one of software home button or gesture is enabled
        // when no hardware home button
        if (!this.hasHardwareHomeButton && !this.enable) {
          SettingsListener.getSettingsLock().set({
            'homegesture.enabled': true});
        }
        break;
      case 'software-button-enabled':
        if (this.enable) {
          SettingsListener.getSettingsLock().set({
            'homegesture.enabled': false});
        }
        break;
    }
  },
  publish: function hg_publish(type) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(type, true, false, null);
    window.dispatchEvent(evt);
  }
};
HomeGesture.init();
