/* global BaseModule, DebuggingIcon, LazyLoader */
'use strict';

(function() {
  var DebuggingMonitor = function() {};
  DebuggingMonitor.SETTINGS = [
    'debugger.remote-mode'
  ];
  BaseModule.create(DebuggingMonitor, {
    name: 'DebuggingMonitor',
    _start: function() {
      LazyLoader.load(['js/debugging_icon.js']).then(function() {
        this.icon = new DebuggingIcon(this);
        this.icon.start();
      }.bind(this)).catch(function(err) {
        console.error(err);
      });
    },
    '_observe_debugger.remote-mode': function(value) {
      this.enabled = (value !== 'disabled');
      this.icon && this.icon.update();
    }
  });
}());
