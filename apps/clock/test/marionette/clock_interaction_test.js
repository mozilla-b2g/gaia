marionette('Clock interaction', function() {
  'use strict';
  var assert = require('./lib/assert');
  var Alarm = require('./lib/alarm');
  var client = marionette.client();
  var alarm;

  setup(function() {
    alarm = new Alarm(client);

    alarm.launch();
  });

  test('Toggling clock face', function() {
    assert(alarm.analogClockDisplayed, 'analog clock is displayed');
    assert(!alarm.digitalClockDisplayed, 'digital clock is not displayed');

    alarm.toggleClock();

    assert(
      !alarm.analogClockDisplayed,
      'analog clock is not displayed after toggle'
    );
    assert(
      alarm.digitalClockDisplayed,
      'digital clock is displayed after toggle'
    );

    alarm.toggleClock();

    assert(
      alarm.analogClockDisplayed,
      'analog clock is displayed after toggle'
    );
    assert(
      !alarm.digitalClockDisplayed,
      'digital clock is not displayed after toggle'
    );
  });

});
