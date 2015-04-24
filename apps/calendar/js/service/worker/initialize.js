/**
 * The way that the current caldav library works,
 * we need to preconfigure some global state :/.
 */
define(function(require, exports, module) {
'use strict';

var Thread = require('./thread');
var debug = require('debug')('worker/initialize');

self.window = self;

module.exports = function() {
  var thread = self.thread = new Thread(window);
  thread.addRole('caldav');
  window.console = new thread.console('worker');
  require(['service/caldav'], (CaldavService) => {
    // Lazily loaded so that we can prime environment first.
    debug('Will create new caldav service...');
    self.caldav = new CaldavService(thread.roles.caldav);
  });
};

});
