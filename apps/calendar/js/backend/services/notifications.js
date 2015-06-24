define(function(require, exports) {
'use strict';

var core = require('core');

exports.get = function(alarm) {
  var { eventId, busytimeId } = alarm;

  var storeFactory = core.storeFactory;
  var eventStore = storeFactory.get('Event');
  var busytimeStore = storeFactory.get('Busytime');

  var trans = core.db.transaction(['busytimes', 'events']);

  // Find the event and busytime associated with this alarm.
  return Promise.all([
    eventStore.get(eventId, trans),
    busytimeStore.get(busytimeId, trans)
  ]).then(values => {
    var [ event, busytime ] = values;

    // just a safeguard on the very unlikely case that busytime or event
    // doesn't exist anymore (should be really hard to happen)
    if (!event) {
      throw new Error(`can't find event with ID: ${eventId}`);
    }
    if (!busytime) {
      throw new Error(`can't find busytime with ID: ${busytimeId}`);
    }

    // easier to pass an object than to rely on array order
    return {
      event: event,
      busytime: busytime
    };
  });

};

});
