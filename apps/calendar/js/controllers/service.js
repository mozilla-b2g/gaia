define(function(require, exports, module) {
'use strict';

var Manager = require('worker/manager');
var debug = require('debug')('controllers/service');

function Service() {
  Manager.call(this);
}
module.exports = Service;

Service.prototype = {
  __proto__: Manager.prototype,

  start: function() {
    debug('Will load and initialize worker...');
    this.add('caldav', '/js/caldav_worker.js');
  }
};

});
