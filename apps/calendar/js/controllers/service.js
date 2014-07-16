define(function() {
  'use strict';

  function Service() {
    Calendar.Worker.Manager.call(this);
  }

  Service.prototype = {
    __proto__: Calendar.Worker.Manager.prototype,

    /**
     * Load and initializer workers.
     */
    start: function() {
      this.add('caldav', '/js/caldav_worker.js');
    }

  };

  Calendar.ns('Controllers').Service = Service;
  return Service;
});
