/* globals System */
'use strict';

(function(exports) {
  var AttentionWindowManager = function() {};
  AttentionWindowManager.prototype = {
    DEBUG: false,
    CLASS_NAME: 'AttentionWindowManager',
    _instances: null,
    _activeAttentionWindow: null,

    debug: function aw_debug() {
      if (this.DEBUG) {
        console.log('[' + this.CLASS_NAME + ']' +
          '[' + System.currentTime() + '] ' +
          Array.slice(arguments).concat());
      }
    },

    hasActiveWindow: function attwm_hasActiveWindow() {
      return (this._activeAttentionWindow !== null);
    },

    hasAliveWindow: function attwm_hasAliveWindow() {
      return (this._instances.size !== 0);
    },

    isAtBarMode: function attwm_isAtBarMode() {
      return (this.hasAliveWindow() && !this.hasActiveWindow());
    },

    screen: document.getElementById('screen'),

    updateClass: function attwm_updateClass() {
      this.screen.classList.toggle('active-statusbar', this.isAtBarMode());
    },

    barHeight: function attwm_barHeight() {
      return 40;
    },

    start: function attwm_init() {
      this._instances = new Map();
      window.addEventListener('attentioncreated', this);
      window.addEventListener('attentionterminated', this);
      window.addEventListener('attentionopened', this);
      window.addEventListener('attentionclosed', this);
      window.addEventListener('home', this);
      window.addEventListener('keyboardchange', this);
      window.addEventListener('keyboardhide', this);
      window.addEventListener('emergencyalert', this);
    },

    stop: function attwm_init() {
      this._instances = null;
      window.removeEventListener('attentioncreated', this);
      window.removeEventListener('attentionterminated', this);
      window.removeEventListener('attentionopened', this);
      window.removeEventListener('attentionclosed', this);
      window.removeEventListener('home', this);
      window.removeEventListener('keyboardchange', this);
      window.removeEventListener('keyboardhide', this);
      window.removeEventListener('emergencyalert', this);
    },

    handleEvent: function attwm_handleEvent(evt) {
      this.debug('handling ' + evt.type);
      var attention = evt.detail;
      switch (evt.type) {
        case 'attentionopening':
          this._activeAttentionWindow = attention;
          this.updateClass();
          break;

        case 'attentionclosed':
          if (this._activeAttentionWindow &&
              this._activeAttentionWindow.instanceID === attention.instanceID) {
            this._activeAttentionWindow = null;
          }
          this.updateClass();
          break;

        case 'attentioncreated':
          this._instances.set(attention, attention.instanceID);
          break;

        case 'attentionterminated':
          this._instances.delete(attention);
          if (this._activeAttentionWindow &&
              this._activeAttentionWindow.instanceID === attention.instanceID) {
            this._activeAttentionWindow = null;
          }
          break;

        case 'home':
        case 'emergencyalert':
          if (this._activeAttentionWindow) {
            this._activeAttentionWindow.close();
          }
          break;

        case 'keyboardchange':
        case 'keyboardhide':
          if (this._activeAttentionWindow) {
            this._activeAttentionWindow.resize();
            evt.stopImmediatePropagation();
          }
          break;
      }
    }
  };

  exports.AttentionWindowManager = AttentionWindowManager;
}(window));
