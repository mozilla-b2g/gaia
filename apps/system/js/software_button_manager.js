'use strict';
/* global Event */
/* global ScreenLayout */
/* global SettingsListener */
/* global OrientationManager */

(function(exports) {

  /**
   * SoftwareButtonManager manages a home button for devides without
   * physical home buttons. The software home button will display at the bottom
   * of the screen in portrait, and on the right in landscape and is meant to
   * function in the same way as a hardware home button.
   * @class SoftwareButtonManager
   * @requires ScreenLayout
   * @requires SettingsListener
   * @requires OrientationManager
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
     * Returns the height of the software buttons if device
     * is in portrait, 0 otherwise.
     * @memberof SoftwareButtonManager.prototype
     * @return The height of the software buttons element.
     */
    _cacheHeight: null,
    get height() {
      if (!this.enabled || !this._currentOrientation.contains('portrait')) {
        return 0;
      }

      return this._cacheHeight ||
          (this._cacheHeight = this.element.getBoundingClientRect().height);
    },

    /**
     * Returns the width of the software buttons if device
     * is in landscape, 0 otherwise.
     * @memberof SoftwareButtonManager.prototype
     * @return The width of the software buttons element.
     */
    _cacheWidth: null,
    get width() {
      if (!this.enabled || !this._currentOrientation.contains('landscape')) {
        return 0;
      }

      return this._cacheWidth ||
          (this._cacheWidth = this.element.getBoundingClientRect().width);
    },

    /**
     * The current device orientation.
     * @memberof SoftwareButtonManager.prototype
     * @type {String}
     */
    _currentOrientation: null,

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
            this.resizeAndDispatchEvent();
          }.bind(this));
      } else {
        this.enabled = false;
        this.toggle();
      }

      this._currentOrientation = OrientationManager.fetchCurrentOrientation();
      window.screen.addEventListener('mozorientationchange', this);
      window.addEventListener('orientationchange', this);

      window.addEventListener('mozfullscreenchange', this);
      window.addEventListener('homegesture-enabled', this);
      window.addEventListener('homegesture-disabled', this);
    },

   /**
     * Resizes software buttons panel and dispatches events so screens
     * can resize themselves after a change in the state of
     * the software home button.
     * @memberof SoftwareButtonManager.prototype
     */
     resizeAndDispatchEvent: function() {
       if (this.enabled === this.element.classList.contains('visible')) {
         return;
       }

       var element = this.element;
       if (this.enabled) {
         element.addEventListener('transitionend', function trWait() {
           element.removeEventListener('transitionend', trWait);
           // Delay posting the event until the transition is done, otherwise
           // the screen will resize and the background will be visible.
           window.dispatchEvent(new Event('software-button-enabled'));
         });
         element.classList.add('visible');
       } else {
         element.classList.remove('visible');
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
      delete this._cacheWidth;

      if (this.enabled) {
        this.screenElement.classList.add('software-button-enabled');
        this.screenElement.classList.remove('software-button-disabled');

        this.homeButton.addEventListener('touchstart', this);
        this.homeButton.addEventListener('touchend', this);
        this.fullscreenHomeButton.addEventListener('touchstart', this);
        this.fullscreenHomeButton.addEventListener('touchend', this);
        window.addEventListener('mozfullscreenchange', this);
      } else {
        this.screenElement.classList.remove('software-button-enabled');
        this.screenElement.classList.add('software-button-disabled');

        this.homeButton.removeEventListener('touchstart', this);
        this.homeButton.removeEventListener('touchend', this);
        this.fullscreenHomeButton.removeEventListener('touchstart', this);
        this.fullscreenHomeButton.removeEventListener('touchend', this);
        window.removeEventListener('mozfullscreenchange', this);
      }
    },

    /**
     * General event handler interface.
     * @memberof SoftwareButtonManager.prototype
     * @param {DOMEvent} evt The event.
     */
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'touchstart':
          this.publish('home-button-press');
          break;
        case 'touchend':
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
        case 'mozorientationchange':
          // mozorientationchange is fired before 'system-resize'
          // so we can adjust width/height before that happens.
          var isPortrait = this._currentOrientation.contains('portrait');
          var newOrientation = OrientationManager.fetchCurrentOrientation();
          if (isPortrait && newOrientation.contains('landscape')) {
            this.element.style.right = this.element.style.bottom;
            this.element.style.bottom = null;
          } else if (!isPortrait && newOrientation.contains('portrait')) {
            this.element.style.bottom = this.element.style.right;
            this.element.style.right = null;
          }
          this._currentOrientation = newOrientation;

          // The mozorientationchange happens before redraw and orientation
          // change after, so this is done to avoid animation of the soft button
          this.element.classList.add('no-transition');
          break;
        case 'orientationchange':
          this.element.classList.remove('no-transition');
          break;
      }
    }
  };

  exports.SoftwareButtonManager = SoftwareButtonManager;

}(window));
