/* globals Service, BaseModule,
           DialerAgent */
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
          '[' + Service.currentTime() + '] ' +
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

    respondToHierarchyEvent: function(evt) {
      if (this['_handle_' + evt.type]) {
        return this['_handle_' + evt.type](evt);
      } else {
        return true;
      }
    },

    _handle_home: function(evt) {
      if (!this.hasActiveWindow()) {
        return true;
      }
      this._topMostWindow = null;
      var nextApp = Service.query('getHomescreen');
      if (Service.query('locked')) {
        this.closeAllAttentionWindows();
      } else if (nextApp && !nextApp.isDead()) {
        nextApp.ready(this.closeAllAttentionWindows.bind(this));
      } else {
        this.closeAllAttentionWindows();
      }
      return true;
    },

    '_handle_system-resize': function(evt) {
      if (this._topMostWindow) {
        var p = this._topMostWindow.resize();
        if (typeof evt.detail.waitUntil === 'function') {
          evt.detail.waitUntil(p);
        }
        return false;
      }
      return true;
    },

    _handle_holdhome: function() {
      if (this.isActive()) {
        this._topMostWindow = null;
        this.closeAllAttentionWindows();
      }
      return true;
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
      window.addEventListener('emergencyalert', this);
      window.addEventListener('launchapp', this);
      window.addEventListener('lockscreen-appclosed', this);
      window.addEventListener('lockscreen-appopened', this);
      window.addEventListener('secure-appclosed', this);
      window.addEventListener('secure-appopened', this);
      window.addEventListener('rocketbar-overlayopened', this);
      window.addEventListener('languagechange', this);
      Service.request('registerHierarchy', this);
      if (navigator.mozTelephony) {
        BaseModule.lazyLoad(['DialerAgent']).then(function() {
          // DialerAgent will create callscreen window
          // so it is 'CallscreenWindowLauncher' exactly.
          var dialerAgent = new DialerAgent();
          dialerAgent.start();
        });
      }
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
      window.removeEventListener('emergencyalert', this);
      window.removeEventListener('launchapp', this);
      window.removeEventListener('lockscreen-appclosed', this);
      window.removeEventListener('lockscreen-appopened', this);
      window.removeEventListener('secure-appclosed', this);
      window.removeEventListener('secure-appopened', this);
      window.removeEventListener('rocketbar-overlayopened', this);
      window.removeEventListener('languagechange', this);
      Service.request('unregisterHierarchy', this);
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
          this.updateClassState();
          break;

        case 'attentionrequestclose':
          this._openedInstances.delete(attention);
          if (this._topMostWindow !== attention) {
            attention.close();
            break;
          }

          var candidate = null;
          if (this._openedInstances.size === 0) {
            this._topMostWindow = null;
            candidate = Service.query('AppWindowManager.getActiveWindow');
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
          this.updateClassState();
          break;

        case 'attentionrequestopen':
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

          // In case of a kill/crash we might not get the attentionclosed
          // event, so updating the attention class if that's the case.
          if (attention.isCrashed) {
            this.updateClassState();
          }
          break;

        case 'launchapp':
          if (evt.detail && evt.detail.stayBackground) {
            break;
          } // jshint ignore:line
        case 'emergencyalert':
        case 'rocketbar-overlayopened':
          this._topMostWindow = null;
          this.closeAllAttentionWindows();
          break;

        case 'lockscreen-appclosed':
        case 'lockscreen-appopened':
        case 'secure-appopened':
        case 'secure-appclosed':
        case 'languagechange':
          this._instances.forEach(function(instance) {
            instance.broadcast(evt.type);
          });
          break;
      }
    },
    /**
     * Traverse the instances list to get the count of displayed window.
     * @return {Number} The count of displayed window
     */
    getShownWindowCount: function() {
      var count = this._instances.length;
      this._instances.forEach(function(attention) {
        if (attention.isHidden()) {
          count--;
        }
      });
      return count;
    },
    updateAttentionIndicator: function() {
      if (this._openedInstances.size == this.getShownWindowCount()) {
        Service.request('makeAmbientIndicatorInactive');
      } else {
        Service.request('makeAmbientIndicatorActive');
      }
    },
    updateClassState: function() {
      // XXX We set a class to screen to allow overriding the screen.lock class.
      // When we get rid of screen.lock in the future, this can go away safely.
      if (this._openedInstances.size !== 0) {
        this.screen.classList.add('attention');
      } else {
        this.screen.classList.remove('attention');
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
