'use strict';

/* global DigitalClock, MockL10n */

require('/shared/test/unit/mocks/mock_l10n.js');
require('/js/digital_clock.js');

suite('DigitalClock', function() {
  var clock;
  var digitalClock;
  var startDate;
  var realL10n;

  function createElement(tagName, id) {
    var element = document.createElement(tagName);
    element.id = id;

    return element;
  }

  var elements = {
    hoursTensDigit: createElement('span', 'hours-tens-digit'),
    hoursUnitsDigit: createElement('span', 'hours-units-digit'),
    minutesTensDigit: createElement('span', 'minutes-tens-digit'),
    minutesUnitsDigit: createElement('span', 'minutes-units-digit'),
    secondsTensDigit: createElement('span', 'seconds-tens-digit'),
    secondsUnitsDigit: createElement('span', 'seconds-units-digit'),
    today: createElement('span', 'today-is')
  };

  suiteSetup(function() {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    for (var prop in elements) {
      document.body.appendChild(elements[prop]);
    }
  });

  suiteTeardown(function() {
    var elements = document.getElementsByTagName('span');
    for (var i=0; i < elements.length; i++) {
      document.body.removeChild(elements[i]);
    }
    window.navigator.mozL10n = realL10n;
  });

  setup(function() {
    startDate = new Date(2015, 4, 31);
    clock = sinon.useFakeTimers(startDate.getTime());
    digitalClock = new DigitalClock();
    digitalClock.init();
  });

  teardown(function() {
    digitalClock.stop();
    clock.restore();
  });

  test('Should display current date and time once the clock is initialized',
  function() {
    clock.tick();
    assert.equal(digitalClock.date.getTime(), startDate.getTime());
    assert.equal(elements.hoursTensDigit.textContent, '0');
    assert.equal(elements.hoursUnitsDigit.textContent, '0');
    assert.equal(elements.minutesTensDigit.textContent, '0');
    assert.equal(elements.minutesUnitsDigit.textContent, '0');
    assert.equal(elements.secondsTensDigit.textContent, '0');
    assert.equal(elements.secondsUnitsDigit.textContent, '0');
    // Using JSON.stringify here to match the result from the mock l10n.
    assert.equal(elements.today.dataset.l10nArgs,
           JSON.stringify({'date': JSON.stringify(new Date()) + 'dateFormat'}));
  });

  test('Should clear timers after the clock is stopped', function() {
    digitalClock.stop();
    assert.isNull(digitalClock.timeoutId);
  });

  test('Should update date and time after the clock starts', function() {
    var now;
    digitalClock.start();
    // Set the clock to 1 day, 1 hour, 1 minute and 1 second later
    // after initial date.
    clock.tick(86400000);
    now = new Date();
    assert.equal(elements.today.dataset.l10nArgs,
        JSON.stringify({'date': JSON.stringify(now) + 'dateFormat'}));
    // Set the clock to 1 hour, 1 minute and 1 second later
    clock.tick(3600000 + 60000 + 1000);
    now = new Date();
    assert.equal(digitalClock.date.getTime(), now.getTime());
    assert.equal(elements.hoursUnitsDigit.textContent, '1');
    assert.equal(elements.minutesUnitsDigit.textContent, '1');
    assert.equal(elements.secondsUnitsDigit.textContent, '1');
  });
});
