'use strict';
/* global AppWindow, AppWindowManager, Rocketbar */

/**
 * Logic for the global title in the statusbar
 */
var Title = {

  element: document.getElementById('statusbar-title'),

  get content() {
    return this.element.textContent;
  },

  set content(val) {
    this.element.textContent = val;
  },

  /**
   * Initializes listeners to set the state
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
   */
  reset: function() {
    var activeApp = AppWindowManager.getActiveApp();
    if (!Rocketbar.shown && activeApp.isHomescreen) {
      this.content = navigator.mozL10n.get('search');
    }
  },

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

Title.init();
