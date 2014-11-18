/* global BaseModule */
'use strict';

(function() {
  var NetworkActivity = function() {};
  NetworkActivity.EVENTS = [
    'moznetworkupload',
    'moznetworkdownload'
  ];
  BaseModule.create(NetworkActivity, {
    name: 'NetworkActivity',
    _start: function() {
      this.icon = new NetworkActivityIcon(this);
      this.icon.start();
      this.service.request('screensave', this);
    },
    _stop: function() {
      this.icon.stop();
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
