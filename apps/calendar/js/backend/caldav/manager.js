define(function(require, exports, module) {
'use strict';

var Manager = require('caldav/worker/manager');
var debug = require('common/debug')('controllers/service');

function Service() {
  Manager.call(this);
}
module.exports = Service;

Service.prototype = {
  __proto__: Manager.prototype,

  start: function() {
    debug('Will load and initialize worker...');
    this.add('caldav', '/js/backend/caldav/caldav_worker.js');
  }
};

});
