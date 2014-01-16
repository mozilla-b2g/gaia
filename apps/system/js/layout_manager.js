'use strict';

(function(window) {
  var DEBUG = false;
  /**
   * LayoutManager gathers all external events which would affect
   * the layout of the windows and redirect the event to AppWindowManager.
   *
   *
   * The height of the windows would be affected by some global factor:
   *
   *
   * * The height of StatusBar.
   * * The existence of Software Home Button.
   * * The existence of Keyboard.
   *
   *
   * When the size state of one of them is changed, LayoutManager
   * would send <code>system-resize</code> event.
   *
   * ![resize layout flow](http://i.imgur.com/bUMm4VM.png)
   *
   * @module LayoutManager
   */
  window.LayoutManager = {
    get clientWidth() {
      if (this._clientWidth)
        return this._clientWidth;

      this._clientWidth = document.documentElement.clientWidth;
      return this._clientWidth;
    },

    /**
     * Gives the possible height for a fullscreen window.
     *
     * @memberOf module:LayoutManager
     */
    get fullscreenHeight() {
      return window.innerHeight -
        (this.keyboardEnabled ? KeyboardManager.getHeight() : 0) -
        SoftwareButtonManager.height;
    },

    /**
     * Gives the possible height for a normal window.
     *
     * @memberOf module:LayoutManager
     */
    get usualHeight() {
      return window.innerHeight -
        (this.keyboardEnabled ? KeyboardManager.getHeight() : 0) -
        SoftwareButtonManager.height - StatusBar.height;
    },

    get width() {
      return window.innerWidth;
    },

    /**
     * Match the given size with current layout.
     * @param  {Number}  width        The matched width.
     * @param  {Number}  height       The matched height.
     * @param  {Boolean} isFullScreen To match fullscreen case or not.
     * @return {Boolean}              Matches current layout or not.
     *
     * @memberOf module:LayoutManager
     */
    match: function(width, height, isFullScreen) {
      if (isFullScreen) {
        return (this.fullscreenHeight === height);
      } else {
        return (this.usualHeight === height);
      }
    },

    /**
     * Record the keyboard is enabled now or not.
     * @type {Boolean}
     * @memberOf module:LayoutManager
     */
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
          this.keyboardEnabled = true;
          /**
           * Fired when layout needs to be adjusted.
           * @event module:LayoutManager#system-resize
           */
          this.publish('system-resize');
          break;
        default:
          if (evt.type === 'keyboardhide')
            this.keyboardEnabled = false;
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
