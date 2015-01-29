define(function(require) {
'use strict';

var calendarObserver = require('observer/calendar_observer');

suite('observer/calendar_observer', function() {
  var app;

  setup(function(done) {
    app = testSupport.calendar.app();
    calendarObserver.calendarStore = app.store('Calendar');
    app.db.open(done);
  });

  testSupport.calendar.dbFixtures(
    'account',
    'Account', {
      one: { _id: 55, providerType: 'Mock' }
    }
  );

  testSupport.calendar.dbFixtures('calendar', 'Calendar', {
    one: { _id: 'one', accountId: 55 },
    two: { _id: 'two', accountId: 55 }
  });

  setup(function(done) {
    calendarObserver.init().then(() => done());
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(app.db, ['calendars'], function() {
      app.db.close();
      done();
    });
  });

  test('calendarList should have cached calendars', function() {
    assert.deepEqual(calendarObserver.calendarList, {
      one: { _id: 'one', accountId: 55 },
      two: { _id: 'two', accountId: 55 }
    });
  });

  test('change should notify new listeners of all calendars', function() {
    // TODO
  });
});

});
