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
    assert.lengthOf(Object.keys(calendarObserver.calendarList), 2);
    var one = calendarObserver.calendarList.one;
    var two = calendarObserver.calendarList.two;
    assert.strictEqual(one.calendar.accountId, 55);
    assert.strictEqual(one.calendar._id, 'one');
    assert.isTrue(one.capabilities.canCreateEvent);
    assert.strictEqual(two.calendar.accountId, 55);
    assert.strictEqual(two.calendar._id, 'two');
    assert.isTrue(two.capabilities.canCreateEvent);
  });

  test('change should notify new listeners of all calendars', function(done) {
    calendarObserver.on('change', calendarList => {
      assert.lengthOf(Object.keys(calendarList), 2);
      done();
    });
  });

  test('adding a calendar should trigger observer', function() {
    // TODO(gareth)
  });

  test('updating a calendar should trigger observer', function() {
    // TODO(gareth)
  });

  test('deleting a calendar should trigger observer', function() {
    // TODO(gareth)
  });
});

});
