/* global Promise */
Calendar.ns('Controllers').notifications = (function() {
  'use strict';

  var exports = {};

  var debug = Calendar.debug('notifications');

  exports.app = null;

  exports.observe = function() {
    exports.app.messages.on('alarm', exports.onAlarm);
  };

  exports.unobserve = function() {
    exports.app.messages.off('alarm', exports.onAlarm);
  };

  exports.onAlarm = function(alarm) {
    debug('Request cpu wake lock.');
    var lock = navigator.requestWakeLock('cpu');
    return issueNotification(alarm).then(() => {
      debug('Release cpu wake lock.');
      lock.unlock();
    });
  };

  function issueNotification(alarm) {
    var app = exports.app;
    var busytimeStore = app.store('Busytime');
    var eventStore = app.store('Event');

    var trans = eventStore.db.transaction(['busytimes', 'events']);
    return Promise.all([
      findById(alarm.busytimeId, busytimeStore, trans),
      findById(alarm.eventId, eventStore, trans)
    ])
    .then((values) => {
      var [busytime, event] = values;
      debug('Alarm busytime:', busytime);
      debug('Alarm event:', event);

      var begins = Calendar.Calc.dateFromTransport(busytime.start),
          distance = app.dateFormat.fromNow(begins),
          now = new Date();

      debug('Event begins:', begins);
      debug('Now:', now);
      debug('Distance:', distance);

      var type = begins > now ?
        'alarm-start-notice' :
        'alarm-started-notice';

      debug('Will send event notification', event);

      var l10n = navigator.mozL10n;
      var title = l10n.get(type, {
        title: event.remote.title,
        distance: distance
      });

      return Calendar.sendNotification(
        title,
        event.remote.description,
        '/alarm-display/' + busytime._id
      );
    });
  }

  function findById(id, store, trans) {
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject('Missing object id!');
      }

      return store.get(id, trans).then((value) => {
        if (!value) {
          return reject('Could not find database object.');
        }

        resolve(value);
      });
    });
  }

  return exports;
})();
