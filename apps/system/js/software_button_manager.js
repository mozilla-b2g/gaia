'use strict';

(function(window) {
  function isOnRealDevice() {
    // XXX: A hack to know we're using real device or not
    // is to detect screen size.
    // The screen size of b2g running on real device
    // is the same as the size of system app.
    if (window.innerWidth === screen.width) {
      return true;
    } else {
      return false;
    }
  };

  var SoftwareButtonManager = {
    _enable: false,

    get height() {
      return this._cacheHeight ||
            (this._cacheHeight = this.element.getBoundingClientRect().height);
    },

    init: function sbm_init() {
      this.element = document.getElementById('software-buttons');
      this.homeButton = document.getElementById('software-home-button');
      this.fullscreenHomeButton =
        document.getElementById('fullscreen-software-home-button');
      this.screenElement = document.getElementById('screen');
      if (this.height > 0 && isOnRealDevice()) {
        // By result of media query.
        this._enable = true;
      } else {
        this.element.classList.add('hidden');
        this._enable = false;

        SettingsListener.observe('software-button.enabled', false,
          function onObserve(value) {
            this._enable = value;
            this.toggle();
            this.dispatchResizeEvent(value);
          }.bind(this));
      }

      this.homeButton.addEventListener('mousedown', this);
      this.homeButton.addEventListener('mouseup', this);
      this.fullscreenHomeButton.addEventListener('mousedown', this);
      this.fullscreenHomeButton.addEventListener('mouseup', this);
      window.addEventListener('mozfullscreenchange', this);
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
      console.log(evt.timeStamp, evt.type);
      switch (evt.type) {
        case 'mousedown':
          this.publish('home-button-press');
          break;
        case 'mouseup':
          this.publish('home-button-release');
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

  window.addEventListener('localized', function onLocalized() {
    SoftwareButtonManager.init();
  });

  window.SoftwareButtonManager = SoftwareButtonManager;
}(this));
