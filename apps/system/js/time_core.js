/* global System, BaseUI */
'use strict';

(function(exports) {
  var TimeCore = function() {
    this.clock = new Clock();
  };
  TimeCore.EVENTS = [
    'moztimechange',
    'timeformatchange',
    'hierarchychanged'
  ];
  TimeCore.SETTINGS = [
    'statusbar.show-am-pm'
  ];
  BaseModule.create(TimeCore, {
    name: 'TimeCore',
    _start: function() {
      this.icon = new TimeIcon(this);
      this.icon.start();
      this.service.request('screensave', this.icon);
    },
    _stop: function() {
      this.icon.stop();
    },
    _handle_hierarchychange: function() {
      var win = System.query('getTopMostWindow');
      if ((win.CLASS_NAME === 'SecureWindow' && win.isFullScreen()) ||
           win.CLASS_NAME === 'LockScreenWindow') {
        this.toggle(false);
      } else {
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
      navigator.mozL10n.ready((function _updateTime() {
        // To stop clock for reseting the clock interval which runs every 60
        // seconds. The reason to do this is that the time updated will be
        // exactly aligned to minutes which means always getting 0 on seconds
        // part.
        this.icon.toggle(false);
        this.icon.toggle(true);

        // But we still need to consider if we're locked. So may we need to
        // hide it again.
        this.icon.toggle(!this.service.query('getTopMostWindow').CLASS_NAME ===
          'LockScreenWindow');
      }).bind(this));
    };
  });
}(window));
