/* global BaseModule */
'use strict';

(function() {
  var Scheduler = function() {
  };
  Scheduler.SERVICES = [
    'schedule'
  ];
  BaseModule.create(Scheduler, {
    name: 'Scheduler',
    DEBUG: false,
    _start: function() {
      this._queue = [];
      this.hold(); // Hold on start until the parent tells us to release.
    },
    hold: function() {
      this._busyState = true;
    },
    release: function() {
      if (this._busyState) {
        document.body.setAttribute('ready-state', 'visuallyLoaded');
        window.performance.mark('visuallyLoaded');
      }
      this._busyState = false;
      if (this._queue.length) {
        this.execute();
      }
    },
    execute: function() {
      var length = this._queue.length;
      this.debug('process operations in the schedule pool: ' + length);
      this._queue.forEach(function(operation) {
        operation.request();
        operation.resolve();
      });
      this._queue = [];
    },
    schedule: function(request) {
      return new Promise((resolve) => {
        if (this._busyState) {
          this.debug('busy loading, put request in the pool.');
          this._queue.push({
            resolve: resolve,
            request: request
          });
        } else {
          this.debug('not blocking, execute right away');
          request();
          resolve();
        }
      });
    }
  });
}());