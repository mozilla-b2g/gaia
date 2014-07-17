define(function(require) {
  'use strict';

  var Parent = require('worker/manager');

  function Service() {
    Parent.call(this);
  }

  Service.prototype = {
    __proto__: Parent.prototype,

    /**
     * Load and initializer workers.
     */
    start: function() {
      this.add('caldav', '/js/caldav_worker.js');
    }

  };

  return Service;
});
