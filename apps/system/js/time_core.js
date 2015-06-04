/* global BaseModule, TimeIcon, LazyLoader */
'use strict';

(function(exports) {
  var TimeCore = function() {
  };
  TimeCore.EVENTS = [
    'moztimechange',
    'timeformatchange',
    'hierarchychanged',
    'visibilitychange'
  ];
  TimeCore.SETTINGS = [
    'statusbar.show-am-pm'
  ];
  BaseModule.create(TimeCore, {
    name: 'TimeCore',
    /**
     * Indicates if we had run the date-time step in ftu or not.
     * @type {Boolean}
     */
    _stepReady: false,
    _start: function() {
      // XXX can be removed while gecko support navigator.mozHour12 API
      LazyLoader.load(['shared/js/date_time_helper.js']);
      this.service.request('stepReady', '#date_and_time').then(function() {
        this._stepReady = true;
        return LazyLoader.load(['js/clock.js', 'js/time_icon.js']);
      }.bind(this)).then(function() {
        this.icon = new TimeIcon(this);
        this.icon.start();
        this._handle_hierarchychanged();
      }.bind(this)).catch(function(err) {
        console.error(err);
      });
      this._handle_visibilitychange();
    },
    _stop: function() {
      this.toggle(false);
    },
    toggle: function(active) {
      this.active = active;
      if (!this.icon) {
        this.debug('icon not ready');
        return;
      }
      if (!this._stepReady) {
        this.warn('step not ready');
        return;
      }
      if (active) {
        this.icon.start();
      } else {
        this.icon.stop();
      }
    },
    '_observe_statusbar.show-am-pm': function(value) {
      this._ampm = value;
    },
    checkTopMostWindowNeedClock: function() {
      var win = this.service.query('getTopMostWindow');
      if (win) {
        if (win.CLASS_NAME === 'LockScreenWindow' ||
            (win.CLASS_NAME === 'SecureWindow' && win.isFullScreen())) {
          this.debug('lockscreen or fullscreen secure window');
          return false;
        }
      }
      return true;
    },
    _handle_visibilitychange: function() {
      if (document.hidden) {
        this.toggle(false);
      } else {
        this._handle_hierarchychanged();
      }
    },
    _handle_hierarchychanged: function() {
      this.debug('Before starting the icon..');
      if (!this._stepReady) {
        this.warn('Not ready yet!');
        return;
      }
      if (!this.checkTopMostWindowNeedClock()) {
        // Hide the clock in the statusbar when screen is locked
        this.debug('Top most window does not need clock');
        this.toggle(false);
      } else {
        this.debug('Need to show clock');
        this.toggle(true);
      }
    },
    _handle_timeformatchange: function() {
      this._timechanged();
    },
    _handle_moztimechange: function() {
      this._timechanged();
    },
    _timechanged: function() {
      navigator.mozL10n.ready(function _updateTime() {
        // To stop clock for reseting the clock interval which runs every 60
        // seconds. The reason to do this is that the time updated will be
        // exactly aligned to minutes which means always getting 0 on seconds
        // part.
        this.toggle(false);
        this.toggle(true);

        // But we still need to consider if we're locked. So may we need to
        // hide it again.
        this.toggle(this.checkTopMostWindowNeedClock());
      }.bind(this));
    }
  });
}(window));
