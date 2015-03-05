/* global Service */
'use strict';

(function(exports) {
  var toasterEvents = ['init', 'open', 'complete', 'terminate', 'close'];
  var toasterStateTable = {
    'uninit': ['closed', null, null, null, null],
    'closed': [null, 'opening', null, 'uninit', null],
    'opening': [null, null, 'opened', 'uninit', null],
    'opened': [null, null, null, 'uninit', 'closing'],
    'closing': [null, 'opening', 'closed', 'uninit', null]
  };
  /**
   * AttentionToaster is a sub component of AttentionWindow
   * to help the attention window instance to play like a notification toaster
   * and control the toaster's transition state.
   * @param {AppWindow} app The app window installing this sub component.
   */
  var AttentionToaster = function(app) {
    this.app = app;
  };
  AttentionToaster.prototype = {
    _currentToasterState: 'uninit',

    TOASTER_TIMEOUT: 5000,

    RESPAWN_TIMEOUT: 45000,

    start: function() {
      this.app.element.addEventListener('_closed', this);
      this.app.element.addEventListener('_requestopen', this);
      this.app.element.addEventListener('transitionend', this);
      this.app.element.addEventListener('_secure-appclosed', this);
      this.app.element.addEventListener('_secure-appopened', this);
      this.app.element.addEventListener('_lockscreen-appclosed', this);
      this.app.element.addEventListener('_lockscreen-appopened', this);
    },

    stop: function() {
      this.app.element.removeEventListener('_closed', this);
      this.app.element.removeEventListener('_requestopen', this);
      this.app.element.removeEventListener('transitionend', this);
      this.app.element.removeEventListener('_secure-appclosed', this);
      this.app.element.removeEventListener('_secure-appopened', this);
      this.app.element.removeEventListener('_lockscreen-appclosed', this);
      this.app.element.removeEventListener('_lockscreen-appopened', this);
    },

    shouldProcess: function() {
      return this.app && this.app.element && !this.app.isHidden() &&
            !this.app.isActive() && !this.app.isDead();
    },

    handleEvent: function(evt) {
      if (!this.shouldProcess()) {
        this.app.debug('should not process');
        return;
      }

      switch (evt.type) {
        case '_lockscreen-appclosed':
        case '_secure-appopened':
          this.processStateChange('close', evt.type);
          break;

        case '_requestopen':
          this.processStateChange('terminate', evt.type);
          break;

        case 'transitionend':
          if (evt.target !== this.app.element) {
            return;
          }

          this.processStateChange('complete', evt.type);
          break;

        case '_closed':
          this.processStateChange('init', evt.type);
          break;

        case '_lockscreen-appopened':
        case '_secure-appclosed':
          this.processStateChange('open', evt.type);
          break;
      }
    },

    processStateChange: function(event, reason) {
      if (!this.shouldProcess()) {
        this.app.debug('should not process ' + event);
        return;
      }

      var eventIndex = toasterEvents.indexOf(event);
      var nextState =
        toasterStateTable[this._currentToasterState][eventIndex];

      this.app.debug(this._currentToasterState + ' -> ' + nextState);

      if (!nextState) {
        return;
      }

      this.app.debug('[toaster] ' +
        this._currentToasterState + '->' + nextState +
        ':' + event + ',' + reason);
      this._currentToasterState = nextState;
      this.app.element.setAttribute('toaster-transition-state',
        this._currentToasterState);
      if (typeof(this['_enter_' + nextState]) == 'function') {
        this['_enter_' + nextState](event);
      }
    },

    _enter_closing: function() {
      if (!this.app || !this.app.element ||
          (Service && Service.query('locked') &&
           !Service.query('getTopMostWindow').isFullScreen())) {
        return;
      }

      this.app.element.classList.remove('displayed');
    },

    _enter_closed: function(evt) {
      if (!this.app || !this.app.element) {
        return;
      }

      if (evt == 'init') {
        this.becomeToaster();
        this.app.tryWaitForFullRepaint(function() {
          this.processStateChange('open', 'repainted');
        }.bind(this));
      } else if (evt == 'complete') {
        this.app && this.app.setVisible(false);
        this.respawnTimer = window.setTimeout(function() {
          this.processStateChange('open', 'respawn');
        }.bind(this), this.RESPAWN_TIMEOUT);
      }
    },

    _enter_opened: function() {
      if (!this.app || !this.app.element) {
        return;
      }

      this.app && this.app.setVisible(true);
      this._toasterTimer = window.setTimeout(function() {
        if (Service && Service.query('locked') &&
            !Service.query('getTopMostWindow').isFullScreen()) {
          return;
        }

        this.processStateChange('close', 'timeout');
      }.bind(this), this.TOASTER_TIMEOUT);
    },

    _enter_opening: function() {
      if (!this.app || !this.app.element) {
        return;
      }

      window.clearTimeout(this.respawnTimer);
      this.respawnTimer = null;
      this.app.setVisible(true);
      this.app.element.classList.add('displayed');
    },

    _enter_uninit: function() {
      if (!this.app || !this.app.element) {
        return;
      }

      if (this._toasterTimer) {
        window.clearTimeout(this._toasterTimer);
        this._toasterTimer = null;
      }
      this.recoverLayout();
    },

    recoverLayout: function() {
      if (this.app && this.app.resized) {
        this.app.element.classList.remove('displayed');
        this.app.element.classList.remove('toaster-mode');
        this.app.resized = false;
        this.app.publish('recovering');
        this.app._resize();
      }
    },

    becomeToaster: function() {
      if (!this.shouldProcess()) {
        return;
      }

      // Override the resized height anyway
      this.app.element.style.height = this.app.closedHeight + 'px';
      this.app.element.classList.add('toaster-mode');
      this.app.resized = true;
    }
  };
  exports.AttentionToaster = AttentionToaster;
}(window));