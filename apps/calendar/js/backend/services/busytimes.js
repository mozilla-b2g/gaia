define(function(require, exports) {
'use strict';

var co = require('ext/co');
var core = require('core');
var dayObserver = require('day_observer');

/**
 * Fetch all the data needed to display the busytime information on the event
 * views based on the busytimeId
 */
exports.fetchRecord = function(busytimeId) {
  return co(function *() {
    var record = yield dayObserver.findAssociated(busytimeId);
    var eventStore = core.storeFactory.get('Event');
    var owners = yield eventStore.ownersOf(record.event);
    var provider = core.providerFactory.get(owners.account.providerType);
    var capabilities = yield provider.eventCapabilities(record.event);

    record.calendar = owners.calendar;
    record.account = owners.account;
    record.capabilities = capabilities;

    return record;
  });
};

exports.observeDay = function(stream, date) {
  var emit = stream.write.bind(stream);

  stream.cancel = function() {
    dayObserver.off(date, emit);
  };

  dayObserver.on(date, emit);
};

});
