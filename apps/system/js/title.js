'use strict';
/* global AppWindow, AppWindowManager, Rocketbar */

(function(exports) {

  /**
   * Title handle logic for the global title in the statusbar
   * @class Title
   * @requires AppWindow
   * @requires AppWindowManager
   * @requires RocketBar
   */
  function Title() {
    this.init();
  }

  Title.prototype = {
    /** @lends Title */

    /**
     * This is the dom element storing information about current app
     * @memberof Title.prototype
     * @type {DOMElement}
     */
    element: document.getElementById('statusbar-title'),

    /**
     * String which represents current app name
     * @memberof Title.prototype
     * @return {String}
     */
    get content() {
      return this.element.textContent;
    },

    /*
     * Set current app name on statusbar
     * @memberof Title.prototype
     * @param {String}
     */
    set content(val) {
      this.element.textContent = val;
    },

    /**
     * Initializes listeners to set the state on statusbar
     * @memberof Title.prototype
     */
    init: function() {
      window.addEventListener('apploading', this);
      window.addEventListener('appforeground', this);
      window.addEventListener('appnamechanged', this);
      window.addEventListener('apptitlechange', this);
      window.addEventListener('homescreenopened', this);
      window.addEventListener('rocketbarhidden', this);
      window.addEventListener('rocketbarshown', this);
    },

    /**
     * Sets the default title if we're viewing the homescreen.
     * @memberof Title.prototype
     */
    reset: function() {
      var activeApp = AppWindowManager.getActiveApp();
      if (!Rocketbar.shown && activeApp.isHomescreen) {
        this.content = navigator.mozL10n.get('search');
      }
    },

    /**
     * General event handler interface.
     * Updates the text on statusbar when we receive events.
     * @memberof Title.prototype
     * @param {DOMEvent} evt The event.
     */
    handleEvent: function(e) {
      if (!Rocketbar.enabled) {
        return;
      }
      switch (e.type) {
        case 'rocketbarshown':
          this.content = '';
          this.element.classList.add('hidden');
          break;
        case 'appnamechanged':
        case 'apploading':
        case 'apptitlechange':
        case 'appforeground':
          var detail = e.detail;
          if (detail instanceof AppWindow && detail.isActive()) {
            this.content = detail.name;
            this.element.classList.remove('hidden');
          }
          break;
        case 'homescreenopened':
          this.reset();
          break;
        case 'rocketbarhidden':
          this.element.classList.remove('hidden');
          this.reset();
          break;
        default:
          break;
      }
    }
  };

  exports.Title = Title;
}(window));
