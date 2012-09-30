Calendar.ns('Controllers').Service = (function() {

  function Service() {
    Calendar.Worker.Manager.call(this);
  };

  Service.prototype = {
    __proto__: Calendar.Worker.Manager.prototype,

    /**
     * Load and initializer workers.
     */
    start: function() {
      this.add('caldav', '/caldav_worker.js');
    }

  };

  return Service;
}());
