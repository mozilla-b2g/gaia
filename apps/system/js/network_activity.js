/* global BaseModule, NetworkActivityIcon, LazyLoader */
'use strict';

(function() {
  var NetworkActivity = function() {};
  NetworkActivity.EVENTS = [
    'moznetworkupload',
    'moznetworkdownload',
    'visibilitychange'
  ];
  BaseModule.create(NetworkActivity, {
    name: 'NetworkActivity',
    _start: function() {
      if (this.icon) {
        return;
      }
      LazyLoader.load(['js/network_activity_icon.js']).then(function() {
        this.icon = new NetworkActivityIcon(this);
        this._handle_visibilitychange();
      }.bind(this)).catch(function(err) {
        console.error(err);
      });
    },
    _stop: function() {
      this.icon.stop();
    },
    _handle_visibilitychange: function() {
      if (document.hidden) {
        this.icon && this.icon.stop();
      } else {
        this.icon && this.icon.start();
      }
    },
    _handle_moznetworkupload: function() {
      this.update();
    },
    _handle_moznetworkdownload: function() {
      this.update();
    },
    update: function() {
      this.icon && this.icon.update();
    }
  });
}());
