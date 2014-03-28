'use strict';
/* global Event */
/* global ScreenLayout */
/* global SettingsListener */

(function(exports) {

  /**
   * SoftwareButtonManager manages a home button for devides without
   * physical home buttons. The software home button will display at the bottom
   * of the screen and is meant to function in the same way as a hardware 
   * home button.
   * @class SoftwareButtonManager
   * @requires ScreenLayout
   * @requires SettingsListener
   */
  function SoftwareButtonManager() {
    this.isMobile = ScreenLayout.getCurrentLayout('tiny');
    this.isOnRealDevice = ScreenLayout.isOnRealDevice();
    this.hasHardwareHomeButton =
      ScreenLayout.getCurrentLayout('hardwareHomeButton');
    // enabled is true on mobile that has no hardware home button
    this.enabled = !this.hasHardwareHomeButton && this.isMobile;
    this.element = document.getElementById('software-buttons');
    this.homeButton = document.getElementById('software-home-button');
    this.fullscreenHomeButton =
      document.getElementById('fullscreen-software-home-button');
    this.screenElement = document.getElementById('screen');
  }

  SoftwareButtonManager.prototype = {

    /**
     * True if the device has a hardware home button.
     * @memberof SoftwareButtonManager.prototype
     * @type {Boolean}
     */
    hasHardwareHomeButton: true,

    /**
     * Whether or not the SoftwareButtonManager is enabled.
     * @memberof SoftwareButtonManager.prototype
     * @type {Boolean}
     */
    enabled: false,

    /**
     * Enables the software button if hasHardwareHomeButton is false.
     * @memberof SoftwareButtonManager.prototype
     * @type {Boolean}
     */
    overrideFlag: false,

    /**
     * Whether or not the SoftwareButtonManager is enabled.
     * @memberof SoftwareButtonManager.prototype
     * @return The height of the software home button element.
     */
    get height() {
      if (!this.enabled) {
        return 0;
      }

      return this._cacheHeight ||
            (this._cacheHeight = this.element.getBoundingClientRect().height);
    },


    /**
     * Starts the SoftwareButtonManager instance.
     * @memberof SoftwareButtonManager.prototype
     */
    start: function() {
      if (this.isMobile && this.isOnRealDevice) {
        if (!this.hasHardwareHomeButton) {
          this.overrideFlag = true;

          var lock = SettingsListener.getSettingsLock();
          var req = lock.get('homegesture.enabled');
          req.onsuccess = function sbm_getHomeGestureEnabled() {
            var gestureEnabled = req.result['homegesture.enabled'];
            lock.set({'software-button.enabled': !gestureEnabled});
          };
        }

        SettingsListener.observe('software-button.enabled', false,
          function onObserve(value) {
            // Default settings from build/settings.js will override the value
            // of 'software-button.enabled', so we set a flag to avoid it
            // in case.
            if (this.overrideFlag) {
              this.overrideFlag = false;
              return;
            }
            this.enabled = value;
            this.toggle();
            this.dispatchResizeEvent(value);
          }.bind(this));
      } else {
        this.enabled = false;
        this.toggle();
      }

      this.homeButton.addEventListener('mousedown', this);
      this.homeButton.addEventListener('mouseup', this);
      this.fullscreenHomeButton.addEventListener('mousedown', this);
      this.fullscreenHomeButton.addEventListener('mouseup', this);
      window.addEventListener('mozfullscreenchange', this);
      window.addEventListener('homegesture-enabled', this);
      window.addEventListener('homegesture-disabled', this);

      return this;
    },

    /**
     * Dispatches an event so screens can resize themselves after a change
     * in the state of the software home button.
     * @memberof SoftwareButtonManager.prototype
     * @param {String} type The type of softwareButtonEvent.
     */
    dispatchResizeEvent: function(evtName) {
      if (this.enabled) {
        window.dispatchEvent(new Event('software-button-enabled'));
      } else {
        window.dispatchEvent(new Event('software-button-disabled'));
      }
    },

    /**
     * Shortcut to publish a custom software button event.
     * @memberof SoftwareButtonManager.prototype
     * @param {String} type The type of softwareButtonEvent.
     */
    publish: function(type) {
      this.element.dispatchEvent(new CustomEvent('softwareButtonEvent', {
        bubbles: true,
        detail: {
          type: type
        }
      }));
    },

    /**
     * Toggles the status of the software button.
     * @memberof SoftwareButtonManager.prototype
     */
    toggle: function() {
      delete this._cacheHeight;
      if (this.enabled) {
        this.element.classList.add('visible');
        this.screenElement.classList.add('software-button-enabled');
        this.screenElement.classList.remove('software-button-disabled');
      } else {
        this.element.classList.remove('visible');
        this.screenElement.classList.remove('software-button-enabled');
        this.screenElement.classList.add('software-button-disabled');
      }
    },

    /**
     * General event handler interface.
     * @memberof SoftwareButtonManager.prototype
     * @param {DOMEvent} evt The event.
     */
    handleEvent: function(evt) {
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
          if (!this.hasHardwareHomeButton && !this.enabled) {
            SettingsListener.getSettingsLock()
              .set({'software-button.enabled': true});
          }
          break;
        case 'homegesture-enabled':
          if (this.enabled) {
            SettingsListener.getSettingsLock()
              .set({'software-button.enabled': false});
          }
          break;
        case 'mozfullscreenchange':
          if (!this.enabled) {
            return;
          }

          if (document.mozFullScreenElement) {
            this.fullscreenHomeButton.classList.add('visible');
          } else {
            this.fullscreenHomeButton.classList.remove('visible');
          }
          break;
      }
    }
  };

  exports.SoftwareButtonManager = SoftwareButtonManager;

}(window));
