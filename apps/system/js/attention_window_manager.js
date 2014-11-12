/* globals System, homescreenLauncher, SettingsListener */
'use strict';

(function(exports) {
  var AttentionWindowManager = function() {};
  AttentionWindowManager.prototype = {
    DEBUG: false,
    TRACE: false,
    name: 'AttentionWindowManager',
    _openedInstances: null,
    EVENT_PREFIX: 'attentionwindowmanager',

    publish: function vm_publish(eventName, detail) {
      this.debug('publishing: ', eventName);
      var evt = new CustomEvent(this.EVENT_PREFIX + eventName,
        { detail: detail });
      window.dispatchEvent(evt);
    },

    debug: function aw_debug() {
      if (this.DEBUG) {
        console.log('[' + this.name + ']' +
          '[' + System.currentTime() + '] ' +
          Array.slice(arguments).concat());
        if (this.TRACE) {
          console.trace();
        }
      }
    },

    isActive: function() {
      return this.hasActiveWindow();
    },

    hasActiveWindow: function attwm_hasActiveWindow() {
      return (this._openedInstances.size !== 0);
    },

    getActiveWindow: function() {
      return this.getTopMostWindow();
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

    start: function attwm_start() {
      this._instances = [];
      this._openedInstances = new Map();
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
      window.addEventListener('lockscreen-appclosed', this);
      window.addEventListener('lockscreen-appopened', this);
      window.addEventListener('rocketbar-overlayopened', this);
      System.request('registerHierarchy', this);
    },

    stop: function attwm_stop() {
      this._instances = null;
      this._openedInstances = null;
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
      window.removeEventListener('lockscreen-appclosed', this);
      window.removeEventListener('lockscreen-appopened', this);
      window.removeEventListener('rocketbar-overlayopened', this);
      System.request('unregisterHierarchy', this);
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
          this.publish('-activated');
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
            break;
          }

          var candidate = null;
          if (this._openedInstances.size === 0) {
            this._topMostWindow = null;
            candidate = System.currentApp;
          } else {
            this._openedInstances.forEach(function(instance) {
              candidate = instance;
            });
            this._topMostWindow = candidate;
          }
          if (!candidate) {
            attention.close();
            break;
          }
          candidate.ready(function() {
            attention.close();
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
            this.publish('-deactivated');
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

        // For callscreen window.
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
          if (System.locked) {
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
        case 'rocketbar-overlayopened':
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
          this._instances.forEach(function(instance) {
            instance.broadcast(evt.type);
          });
          break;
      }
    },
    updateAttentionIndicator: function() {
      if (this._openedInstances.size == this._instances.length) {
        System.request('makeAmbientIndicatorInactive');
      } else {
        System.request('makeAmbientIndicatorActive');
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
