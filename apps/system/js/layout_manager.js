'use strict';

(function(window) {
  var DEBUG = false;
  window.LayoutManager = {
    get fullscreenHeight() {
      return window.innerHeight - KeyboardManager.getHeight();
    },

    get usualHeight() {
      return window.innerHeight - KeyboardManager.getHeight() -
              SoftwareButtonManager.height - StatusBar.height;
    },

    get width() {
      return window.innerWidth;
    },

    keyboardEnabled: false,

    init: function lm_init() {
      window.addEventListener('resize', this);
      window.addEventListener('status-active', this);
      window.addEventListener('status-inactive', this);
      window.addEventListener('keyboardchange', this);
      window.addEventListener('keyboardhide', this);
      window.addEventListener('attentionscreenhide', this);
      window.addEventListener('mozfullscreenchange', this);
      window.addEventListener('software-button-enabled', this);
      window.addEventListener('software-button-disabled', this);
    },

    handleEvent: function lm_handleEvent(evt) {
      this.debug('resize event got: ', evt.type);
      switch (evt.type) {
        case 'keyboardchange':
          if (document.mozFullScreen)
            document.mozCancelFullScreen();
          this.keyboardEnabled = KeyboardManager.getHeight() ? true : false;
          this.publish('system-resize');
          break;
        default:
          this.keyboardEnabled = KeyboardManager.getHeight() ? true : false;
          this.publish('system-resize');
          break;
      }
    },

    publish: function lm_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail || this);

      this.debug('publish: ' + event);
      window.dispatchEvent(evt);
    },

    debug: function lm_debug() {
      if (DEBUG) {
        console.log('[LayoutManager]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    }
  };

  LayoutManager.init();
}(this));
