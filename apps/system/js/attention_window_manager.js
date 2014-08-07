/* globals System, AppWindowManager, homescreenLauncher  */
'use strict';

(function(exports) {
  var AttentionWindowManager = function() {};
  AttentionWindowManager.prototype = {
    DEBUG: false,
    TRACE: false,
    CLASS_NAME: 'AttentionWindowManager',
    _openedInstances: null,

    publish: function vm_publish(eventName, detail) {
      this.debug('publishing: ', eventName);
      var evt = new CustomEvent(eventName, { detail: detail });
      window.dispatchEvent(evt);
    },

    debug: function aw_debug() {
      if (this.DEBUG) {
        console.log('[' + this.CLASS_NAME + ']' +
          '[' + System.currentTime() + '] ' +
          Array.slice(arguments).concat());
        if (this.TRACE) {
          console.trace();
        }
      }
    },

    hasActiveWindow: function attwm_hasActiveWindow() {
      return (this._openedInstances.size !== 0);
    },

    getTopMostWindow: function attwm_hasActiveWindow() {
      return this._topMostWindow;
    },

    /**
     * Return current alive attention window instances in a map.
     * @return {Map} The attention window map
     */
    getInstances: function() {
      return this._instances;
    },

    screen: document.getElementById('screen'),

    get barHeight() {
      return 40;
    },

    start: function attwm_init() {
      this._instances = [];
      this._openedInstances = new Map();
      window.addEventListener('attentioncreated', this);
      window.addEventListener('attentionterminated', this);
      window.addEventListener('attentionopened', this);
      window.addEventListener('attentionclosed', this);
      window.addEventListener('attentionclosing', this);
      window.addEventListener('attentionrequestopen', this);
      window.addEventListener('attentionrequestclose', this);
      window.addEventListener('home', this);
      window.addEventListener('holdhome', this);
      window.addEventListener('emergencyalert', this);
      window.addEventListener('launchapp', this);
      window.addEventListener('system-resize', this);
      window.addEventListener('lockscreen-appclosed', this);
      window.addEventListener('lockscreen-appopened', this);
      window.addEventListener('utility-tray-overlayopening', this);
    },

    stop: function attwm_init() {
      this._instances = null;
      this._openedInstances = null;
      window.removeEventListener('attentioncreated', this);
      window.removeEventListener('attentionterminated', this);
      window.removeEventListener('attentionopened', this);
      window.removeEventListener('attentionclosed', this);
      window.removeEventListener('attentionclosing', this);
      window.removeEventListener('attentionrequestopen', this);
      window.removeEventListener('attentionrequestclose', this);
      window.removeEventListener('home', this);
      window.removeEventListener('holdhome', this);
      window.removeEventListener('emergencyalert', this);
      window.removeEventListener('launchapp', this);
      window.removeEventListener('system-resize', this);
      window.removeEventListener('lockscreen-appclosed', this);
      window.removeEventListener('lockscreen-appopened', this);
      window.removeEventListener('utility-tray-overlayopening', this);
    },

    handleEvent: function attwm_handleEvent(evt) {
      this.debug('handling ' + evt.type);
      var attention = evt.detail;
      switch (evt.type) {
        case 'attentioncreated':
          this._instances.push(attention);
          break;

        case 'attentionopened':
          this._openedInstances.set(attention, attention);
          break;

        case 'attentionrequestclose':
          this._openedInstances.delete(attention);
          if (this._topMostWindow == attention) {
            var candidate = null;
            if (this._openedInstances.size === 0) {
              this._topMostWindow = null;
              candidate = AppWindowManager.getActiveApp();
            } else {
              this._openedInstances.forEach(function(instance) {
                candidate = instance;
              });
              this._topMostWindow = candidate;
            }
            if (candidate) {
              candidate.ready(function() {
                attention.close();
              });
            } else {
              attention.close();
            }
          } else {
            attention.close();
          }
          break;

        case 'attentionclosing':
        case 'attentionclosed':
          this._openedInstances.delete(attention);
          if (this._topMostWindow) {
            this._topMostWindow.promote();
            this._topMostWindow.setVisible(true);
          }
          attention.demote();
          if (this._openedInstances.size === 0) {
            this.publish('attention-inactive');
          }
          break;

        case 'attentionrequestopen':
          this._topMostWindow = attention;
          attention.ready(function() {
            this._openedInstances.forEach(function(opened) {
              if (opened !== attention) {
                opened.demote();
                opened.setVisible(false);
              }
            });
            attention.promote();
            attention.setVisible(true);
            attention.unsetClip();
            attention.open();
          }.bind(this));
          break;

        case 'attentionterminated':
          var index = this._instances.indexOf(attention);
          if (index) {
            this._instances.splice(index, 1);
          }
          this._openedInstances.delete(attention);
          break;

        case 'home':
          this._topMostWindow = null;
          var nextApp = homescreenLauncher.getHomescreen();
          if (nextApp && !nextApp.isDead()) {
            nextApp.ready(this.closeAllAttentionWindows.bind(this));
          } else {
            this.closeAllAttentionWindows();
          }
          break;

        case 'launchapp':
        case 'holdhome':
        case 'emergencyalert':
          this._topMostWindow = null;
          this.closeAllAttentionWindows();
          break;

        case 'system-resize':
          if (this._topMostWindow) {
            this._topMostWindow.resize();
            evt.stopImmediatePropagation();
          }
          break;

        case 'lockscreen-appclosed':
        case 'lockscreen-appopened':
        case 'utility-tray-overlayopening':
          this._instances.forEach(function(instance) {
            instance.broadcast(evt.type);
          });
          break;
      }
    },
    closeAllAttentionWindows: function() {
      this._openedInstances.forEach(function(value) {
        value.close();
      });
    }
  };

  exports.AttentionWindowManager = AttentionWindowManager;
}(window));
