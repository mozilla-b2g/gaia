'use strict';
/* global Event */
/* global ScreenLayout */
/* global SettingsListener */
/* global Service */

(function(exports) {

  /**
   * SoftwareButtonManager manages a home button for devices without
   * physical home buttons. The software home button will display at the bottom
   * of the screen in portrait, and on the right in landscape and is meant to
   * function in the same way as a hardware home button.
   * @class SoftwareButtonManager
   * @requires ScreenLayout
   * @requires SettingsListener
   */
  function SoftwareButtonManager() {
    this.isMobile = ScreenLayout.getCurrentLayout('tiny');
    this.isOnRealDevice = ScreenLayout.isOnRealDevice();
    this.hasHardwareHomeButton =
      ScreenLayout.getCurrentLayout('hardwareHomeButton');
    this.element = document.getElementById('software-buttons');
    this.fullscreenLayoutElement =
      document.getElementById('software-buttons-fullscreen-layout');
    this.homeButtons = [
      document.getElementById('software-home-button'),
      document.getElementById('fullscreen-software-home-button'),
      document.getElementById('fullscreen-layout-software-home-button')
    ];
    this.screenElement = document.getElementById('screen');
    // Bind this to the tap function, if it's done in the
    // addEventListener call the removeEventListener won't work properly
    this._fullscreenTapFunction = this._fullscreenTapFunction.bind(this);
    this.enabled = !this.hasHardwareHomeButton && this.isMobile;
    // enabled is true on mobile that has no hardware home button
  }

  SoftwareButtonManager.prototype = {
    name: 'SoftwareButtonManager',

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
    _enabled: false,
    get enabled() {
      return this._enabled;
    },
    set enabled(value) {
      var shouldDispatch = false;
      if (typeof(this._enabled) !== 'undefined' &&
          this._enabled !== value) {
        shouldDispatch = true;
      }
      this._enabled = value;
      if (value) {
        this._currentOrientation = Service.query('fetchCurrentOrientation');
        window.screen.addEventListener('mozorientationchange', this);
        window.addEventListener('orientationchange', this);

        window.addEventListener('mozfullscreenchange', this);
        window.addEventListener('homegesture-enabled', this);
        window.addEventListener('homegesture-disabled', this);

        window.addEventListener('system-resize',
                                this._updateButtonRect.bind(this));
        window.addEventListener('edge-touch-redispatch', this);
        window.addEventListener('hierachychanged', this);
      } else {
        window.screen.removeEventListener('mozorientationchange', this);
        window.removeEventListener('orientationchange', this);

        window.removeEventListener('mozfullscreenchange', this);
        window.removeEventListener('homegesture-enabled', this);
        window.removeEventListener('homegesture-disabled', this);

        window.removeEventListener('system-resize',
                                this._updateButtonRect.bind(this));
        window.removeEventListener('edge-touch-redispatch', this);
        window.removeEventListener('hierachychanged', this);
      }
      shouldDispatch && this.resizeAndDispatchEvent();
    },

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
      if (!this.enabled ||
          (this._currentOrientation &&
           !this._currentOrientation.includes('portrait'))) {
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
      if (!this.enabled || !this._currentOrientation.includes('landscape')) {
        return 0;
      }

      return this._cacheWidth ||
          (this._cacheWidth = this.element.getBoundingClientRect().width);
    },

    _buttonRect: null,
    _updateButtonRect: function() {
      var isFullscreen = !!document.mozFullScreenElement;
      var activeApp = Service.query('getTopMostWindow');
      var isFullscreenLayout =  activeApp && activeApp.isFullScreenLayout();

      var button;
      if (isFullscreenLayout) {
        button = this.homeButtons[2];
      } else if (isFullscreen) {
        button = this.homeButtons[1];
      } else {
        button = this.homeButtons[0];
      }

      this._buttonRect = button.getBoundingClientRect();
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
      if (this.isMobile) {
        if (!this.hasHardwareHomeButton && this.isOnRealDevice) {
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
          }.bind(this));
      } else {
        this.enabled = false;
        this.toggle();
      }
      Service.registerState('width', this);
      Service.registerState('height', this);
      Service.registerState('enabled', this);
    },

   /**
     * Resizes software buttons panel and dispatches events so screens
     * can resize themselves after a change in the state of
     * the software home button.
     * @memberof SoftwareButtonManager.prototype
     */
     resizeAndDispatchEvent: function() {
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

        this.element.addEventListener('mousedown', this._preventFocus);
        this.homeButtons.forEach(function sbm_addTouchListeners(b) {
          b.addEventListener('touchstart', this);
          b.addEventListener('mousedown', this);
          b.addEventListener('touchend', this);
        }.bind(this));
        window.addEventListener('mozfullscreenchange', this);
      } else {
        this.screenElement.classList.remove('software-button-enabled');
        this.screenElement.classList.add('software-button-disabled');

        this.element.removeEventListener('mousedown', this._preventFocus);
        this.homeButtons.forEach(function sbm_removeTouchListeners(b) {
          b.removeEventListener('touchstart', this);
          b.removeEventListener('mousedown', this);
          b.removeEventListener('touchend', this);
        }.bind(this));
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
        case 'mousedown':
          // Prevent the button from receving focus.
          evt.preventDefault();
          break;
        case 'touchstart':
          this.press();
          break;
        case 'touchend':
          this.release();
          break;
        case 'edge-touch-redispatch':
          this.handleRedispatchedTouch(evt);
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

          window.clearTimeout(this._fullscreenTimerId);
          this._fullscreenTimerId = 0;

          if (document.mozFullScreenElement) {
            this.fullscreenLayoutElement.classList.add('hidden');

            this._fullscreenElement = document.mozFullScreenElement;
            this._fullscreenElement
              .addEventListener('touchstart', this._fullscreenTapFunction);
            this._fullscreenElement
              .addEventListener('touchend', this._fullscreenTapFunction);
          } else if (this._fullscreenElement) {
            this.fullscreenLayoutElement.classList.remove('hidden');

            this._fullscreenElement
              .removeEventListener('touchstart', this._fullscreenTapFunction);
            this._fullscreenElement
              .removeEventListener('touchend', this._fullscreenTapFunction);
            this._fullscreenElement = null;
          }

          this._updateButtonRect();
          break;
        case 'mozorientationchange':
          // mozorientationchange is fired before 'system-resize'
          // so we can adjust width/height before that happens.
          var isPortrait = this._currentOrientation.contains('portrait');
          var newOrientation = Service.query('fetchCurrentOrientation');
          if (isPortrait && newOrientation.contains('landscape')) {
            this.element.style.right = this.element.style.bottom;
            this.element.style.bottom = null;
          } else if (!isPortrait && newOrientation.includes('portrait')) {
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
        case 'hierachychanged':
          if (this.enabled && Service.query('getTopMostWindow')) {
            this.element.classList.toggle('attention-lockscreen',
              Service.query('getTopMostWindow').CLASS_NAME ===
              'LockScreenWindow');
          }
          break;
      }
    },

    /**
     * Used to prevent taps on the SHB container from stealing focus, and to
     * prevent fuzzing issues where tapping will trigger events in the app.
     * @memberof SoftwareButtonManager.prototype
     */
    _preventFocus: function(evt) {
      evt.preventDefault();
    },

    /**
     * The id of the timer that hides the soft buttons in fullscreen.
     * Saved so that the timer can be canceled if the user clicks/taps
     * the screen again.
     * @memberof SoftwareButtonManager.prototype
     * @type {number}
     */
    _fullscreenTimerId: 0,

    /**
     * The element that entered fullscreen.
     * Saved so that click eventListener can be removed when leaving fullscreen.
     * @memberof SoftwareButtonManager.prototype
     * @type {DomElement}
     */
    _fullscreenElement: null,

    /**
     * The starting position of a touch in fullscreen.
     * Saved so that we can check whether the user taps or swipes.
     * @memberof SoftwareButtonManager.prototype
     * @type {Touch}
     */
    _fullscreenTouchStart: null,

    /**
     * Function to execute when user clicks/taps screen in fullscreen mode.
     * @memberof SoftwareButtonManager.prototype
     */
    _fullscreenTapFunction: function (evt) {
      switch (evt.type) {
        case 'touchstart':
          this._fullscreenTouchStart = evt.touches[0];
          break;
        case 'touchend':
          var touch = evt.changedTouches[0];
          var xDistance =
            Math.abs(touch.pageX - this._fullscreenTouchStart.pageX);
          var yDistance =
            Math.abs(touch.pageY - this._fullscreenTouchStart.pageY);

          var swipeThreshold = 10;
          if (xDistance < swipeThreshold && yDistance < swipeThreshold) {
            window.clearTimeout(this._fullscreenTimerId);

            if (this.fullscreenLayoutElement.classList.contains('hidden')) {
              this.fullscreenLayoutElement.classList.remove('hidden');
              this._fullscreenTimerId =
                window.setTimeout(function sbm_fullscreenHideTimer() {
                  this.fullscreenLayoutElement.classList.add('hidden');
                }.bind(this), 3000);
            } else {
              // We wait for a bit to get a chance to process a potential
              // mozfullscreenchange
              this._fullscreenTimerId =
                window.setTimeout(function sbm_fullscreenHideTimer() {
                  this.fullscreenLayoutElement.classList.add('hidden');
                }.bind(this), 100);
            }
          }
          break;
      }
    },

    press: function() {
      this.homeButtons.forEach(function sbm_addActive(b) {
        b.classList.add('active');
      });

      this.publish('home-button-press');
    },

    release: function() {
      this.homeButtons.forEach(function sbm_removeActive(b) {
        b.classList.remove('active');
      });

      this.publish('home-button-release');
    },

    _pressedByRedispatch: false,
    handleRedispatchedTouch: function(evt) {
      var type = evt.detail.type;

      if (!this._onButton(evt)) {
        if (type !== 'touchstart' && this._pressedByRedispatch) {
          this._pressedByRedispatch = false;
          this.release();
        }
        return;
      }

      evt.preventDefault();

      switch (type) {
        case 'touchstart':
          this.press();
          this._pressedByRedispatch = true;
          break;
        case 'touchend':
          this._pressedByRedispatch = false;
          this.release();
          break;
      }
    },

    _onButton: function(e) {
      var type = e.detail.type;
      var touch = (type === 'touchend') ?
                  e.detail.changedTouches[0] : e.detail.touches[0];

      var x = touch.pageX;
      var y = touch.pageY;

      var radius = 4;
      var rect = this._buttonRect;
      var leftBound = rect.left - radius;
      var rightBound = rect.right + radius;
      var topBound = rect.top - radius;
      var bottomBound = rect.bottom + radius;

      return (x >= leftBound && x <= rightBound &&
               y >= topBound && y <= bottomBound);
    }
  };

  exports.SoftwareButtonManager = SoftwareButtonManager;

}(window));
