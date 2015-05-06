/* globals Service, AppWindowManager, homescreenLauncher, SettingsListener,
           AttentionIndicator, focusManager */
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
          '[' + Service.currentTime() + '] ' +
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

    start: function attwm_init() {
      this._instances = [];
      this._openedInstances = new Map();
      this.attentionIndicator = new AttentionIndicator(this);
      this.attentionIndicator.start();
      window.addEventListener('attentioncreated', this);
      window.addEventListener('attentionterminated', this);
      window.addEventListener('attentionshown', this);
      window.addEventListener('attentionopening', this);
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
    },

    stop: function attwm_init() {
      this._instances = null;
      this._openedInstances = null;
      this.attentionIndicator.stop();
      this.attentionIndicator = null;
      window.removeEventListener('attentioncreated', this);
      window.removeEventListener('attentionterminated', this);
      window.removeEventListener('attentionshow', this);
      window.removeEventListener('attentionopening', this);
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
    },

    handleEvent: function attwm_handleEvent(evt) {
      this.debug('handling ' + evt.type);
      var attention = evt.detail;
      switch (evt.type) {
        case 'attentioncreated':
          this._instances.push(attention);
          break;

        case 'attentionopening':
        case 'attentionopened':
          this._openedInstances.set(attention, attention);
          this.updateAttentionIndicator();
          break;

        case 'attentionrequestclose':
          //
          // This resets the state of this settings flag.
          // See the corresponding code in the requestopen handler.
          //
          window.SettingsListener && SettingsListener.getSettingsLock().set({
            'private.broadcast.attention_screen_opening': false
          });
          this._openedInstances.delete(attention);
          if (this._topMostWindow !== attention) {
            attention.close();
            focusManager.focus();
            break;
          }

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
          if (!candidate) {
            attention.close();
            focusManager.focus();
            break;
          }
          candidate.ready(function() {
            attention.close();
            focusManager.focus();
          });
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
          this.updateAttentionIndicator();
          break;

        case 'attentionrequestopen':
          //
          // The camera app needs to be notified before an attention window
          // appears so that it can stop recording video before ringer or
          // alarm sounds are recorded. We abuse the settings API as
          // a simple way to broadcast this message.
          // See bugs 995540 and 1006200
          // XXX: We should remove this hack if bug 1034001 is landed.
          //
          window.SettingsListener && SettingsListener.getSettingsLock().set({
            'private.broadcast.attention_screen_opening': true
          });
          this._topMostWindow = attention;
          attention.ready(function() {
            if (document.mozFullScreen) {
              document.mozCancelFullScreen();
            }
            this._openedInstances.forEach(function(opened) {
              if (opened !== attention) {
                opened.demote();
                opened.setVisible(false);
              }
            });
            attention.promote();
            attention.setVisible(true);
            attention.open();
          }.bind(this));
          break;

        case 'attentionshown':
          if (this._instances.indexOf(attention) < 0) {
            this._instances.push(attention);
          }
          break;

        case 'attentionterminated':
          var index = this._instances.indexOf(attention);
          if (index >= 0) {
            this._instances.splice(index, 1);
          }
          this._openedInstances.delete(attention);
          this.updateAttentionIndicator();
          break;

        case 'home':
          if (!this.hasActiveWindow()) {
            return;
          }
          this._topMostWindow = null;
          var nextApp = homescreenLauncher.getHomescreen();
          if (Service.locked) {
            this.closeAllAttentionWindows();
          } else if (nextApp && !nextApp.isDead()) {
            nextApp.ready(this.closeAllAttentionWindows.bind(this));
          } else {
            this.closeAllAttentionWindows();
          }
          break;

        case 'launchapp':
          if (evt.detail && evt.detail.stayBackground) {
            break;
          } // jshint ignore:line
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
      }
    },
    updateAttentionIndicator: function() {
      if (this._openedInstances.size == this._instances.length) {
        this.attentionIndicator.hide();
      } else {
        this.attentionIndicator.show();
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
