define(function(require, exports) {
'use strict';

var co = require('ext/co');
var core = require('core');

exports.create = function(event) {
  return persistEvent(event, 'create', 'canCreate');
};

exports.update = function(event) {
  return persistEvent(event, 'update', 'canUpdate');
};

exports.remove = function(event) {
  return persistEvent(event, 'delete', 'canDelete');
};

var persistEvent = co.wrap(function*(event, action, capability) {
  event = event.data || event;
  try {
    var eventStore = core.storeFactory.get('Event');
    var provider = yield eventStore.providerFor(event);
    var caps = yield provider.eventCapabilities(event);
    if (!caps[capability]) {
      return Promise.reject(new Error(`Can't ${action} event`));
    }
    return provider[action + 'Event'](event);
  } catch (err) {
    console.error(
      `${action} Error for event "${event._id}" ` +
      `on calendar "${event.calendarId}"`
    );
    console.error(err);
    return Promise.reject(err);
  }
});

});
