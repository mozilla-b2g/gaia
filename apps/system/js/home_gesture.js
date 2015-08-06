'use strict';
/* global ScreenLayout */
/* global SettingsListener */
/* global SettingsCache */

(function(exports) {

  /**
   * HomeGesture is used as an alternative to the software home button for
   * devices without physical home buttons.
   * HomeGesture will trigger a 'home' event for a single swipe from the bottom
   * and a 'holdhome' event with a two-finger swipe from the bottom.
   * @class HomeGesture
   * @requires ScreenLayout
   * @requires SettingsListener
   */
  function HomeGesture() {

    this.isTablet = !ScreenLayout.getCurrentLayout('tiny');
    this.hasHardwareHomeButton =
      ScreenLayout.getCurrentLayout('hardwareHomeButton');
    this.homeBar = document.getElementById('bottom-panel');
  }

  HomeGesture.prototype = {

    /**
     * Whether or not the HomeGesture is enabled.
     * @memberof HomeGesture.prototype
     * @type {Boolean}
     */
    enabled: false,

    /**
     * True when the user starts the home gesture.
     * @memberof HomeGesture.prototype
     * @type {Boolean}
     */
    _moving: false,

    /**
     * True when the user is swiping with two or more fingers.
     * @memberof HomeGesture.prototype
     * @type {Boolean}
     */
    _multiTouch: false,

    /**
     * The position of the touchstart event.
     * @memberof HomeGesture.prototype
     * @type {Integer}
     */
    _startY1: 0,

    /**
     * Minimum moving distance to home in pixel of screen height
     * @memberof HomeGesture.prototype
     * @type {Integer}
     */
    MINUMUM_DISTANCE: 50,

    /**
     * Starts the HomeGesture instance.
     * @memberof HomeGesture.prototype
     * @param  {Boolean} enable Whether or not the HomeGesture is enabled.
     */
    start: function() {
      window.addEventListener('software-button-enabled', this);
      window.addEventListener('software-button-disabled', this);
      this.homeBar.addEventListener('touchstart', this, true);
      this.homeBar.addEventListener('touchend', this, true);
      // This 'click' listener can prevent other element which
      // have click listener steal 'touchstart'.
      this.homeBar.addEventListener('click', this, true);

      if (!this.hasHardwareHomeButton && this.isTablet) {
        // enable gesture for tablet without hardware home button
        // as default
        this.toggle(true);
      } else {
        SettingsCache.observe('homegesture.enabled', false,
          function onObserve(value) {
            this.toggle(value);
          }.bind(this));
      }
    },

    /**
     * Toggles the state of the HomeGesture.
     * @memberof HomeGesture.prototype
     * @param  {Boolean} enable Whether or not the HomeGesture is enabled.
     */
    toggle: function(enable) {
      if (enable === this.enabled) {
        return;
      }

      if (enable) {
        this.publish('homegesture-enabled');
        window.addEventListener('lockscreen-appclose', this);
        window.addEventListener('lockscreen-appopened', this);
        window.addEventListener('utilitytrayshow', this);
        window.addEventListener('utilitytrayhide', this);
        this.homeBar.classList.add('visible');
      } else {
        this.publish('homegesture-disabled');
        window.removeEventListener('lockscreen-appclose', this);
        window.removeEventListener('lockscreen-appopened', this);
        window.removeEventListener('utilitytrayshow', this);
        window.removeEventListener('utilitytrayhide', this);
        this.homeBar.classList.remove('visible');
      }
      this.enabled = enable;
    },

    /**
     * General event handler interface.
     * @memberof HomeGesture.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(evt) {
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
              window.dispatchEvent(new CustomEvent('holdhome'));
            } else {
              window.dispatchEvent(new CustomEvent('home'));
            }
          }
          this._multiTouch = false;
          this._moving = false;
          break;
        // hide gesture function when utilitytray/lockscreen display
        case 'lockscreen-appopened':
        case 'utilitytrayshow':
          this.homeBar.classList.remove('visible');
          break;
        case 'lockscreen-appclose':
        case 'utilitytrayhide':
          this.homeBar.classList.add('visible');
          break;
        case 'software-button-disabled':
          // at least one of software home button or gesture is enabled
          // when no hardware home button
          if (!this.hasHardwareHomeButton && !this.enabled) {
            SettingsListener.getSettingsLock().set({
              'homegesture.enabled': true});
          }
          break;
        case 'software-button-enabled':
          if (this.enabled) {
            SettingsListener.getSettingsLock().set({
              'homegesture.enabled': false});
          }
          break;
      }
    },

    /**
     * Shortcut to publish a custom event.
     * @memberof HomeGesture.prototype
     * @param  {String} type The event type.
     */
    publish: function(type) {
      window.dispatchEvent(new CustomEvent(type));
    }
  };

  exports.HomeGesture = HomeGesture;

}(window));
