requireApp('clock/js/clock_view.js');
requireApp('clock/js/utils.js');

describe('ClockView', function() {

  suite('updateDaydate', function() {

    suiteSetup(function() {
      this.dayDateElem = document.createElement('div');
      this.dayDateElem.id = 'clock-day-date';
      document.body.appendChild(this.dayDateElem);
    });

    setup(function() {
      this.clock = sinon.useFakeTimers(1373968800000);
    });

    teardown(function() {
      this.dayDateElem.innerHTML = '';
      this.clock.restore();
    });

    suiteTeardown(function() {
      this.dayDateElem.parentNode.removeChild(this.dayDateElem);
    });

    test('date element is updated with the current time', function() {
      ClockView.updateDaydate();
      assert.equal(this.dayDateElem.innerHTML,
        'Tue Jul <b>16</b> 2013 06:00:00 GMT-0400 (EDT)');
    });

    test('date element is not updated twice in the same day', function() {
      ClockView.updateDaydate();
      this.clock.tick(18 * 60 * 60 * 1000 - 1);
      assert.equal(this.dayDateElem.innerHTML,
        'Tue Jul <b>16</b> 2013 06:00:00 GMT-0400 (EDT)');
    });

    test('date element is updated each day', function() {
      ClockView.updateDaydate();
      this.clock.tick(18 * 60 * 60 * 1000);
      assert.equal(this.dayDateElem.innerHTML,
        'Wed Jul <b>17</b> 2013 00:00:00 GMT-0400 (EDT)');
    });

  });

  suite('updateDigitalClock', function() {

    suiteSetup(function() {
      this.timeElem = document.createElement('div');
      this.timeElem.id = 'clock-time';
      document.body.appendChild(this.timeElem);
      this.hourStateElem = document.createElement('div');
      this.hourStateElem.id = 'clock-hour24-state';
      document.body.appendChild(this.hourStateElem);
    });

    setup(function() {
      this.clock = sinon.useFakeTimers(1373968801000);
    });

    teardown(function() {
      this.timeElem.innerHTML = '';
      this.hourStateElem.innerHTML = '';
      this.clock.restore();
    });

    suiteTeardown(function() {
      this.timeElem.parentNode.removeChild(this.timeElem);
      this.hourStateElem.parentNode.removeChild(this.hourStateElem);
    });

    test('time and hourState elements are updated immediately',
      function() {
      ClockView.updateDigitalClock();
      assert.equal(this.timeElem.innerHTML,
        'Tue Jul 16 2013 06:00:01 GMT-0400 (EDT)');
      assert.equal(this.hourStateElem.innerHTML, '&nbsp;&nbsp;');
    });

    test('time and hourState elements are not updated twice in the same ' +
      'minute', function() {
      ClockView.updateDigitalClock();
      this.clock.tick(59 * 1000 - 1);
      assert.equal(this.timeElem.innerHTML,
        'Tue Jul 16 2013 06:00:01 GMT-0400 (EDT)');
      assert.equal(this.hourStateElem.innerHTML, '&nbsp;&nbsp;');
    });

    test('time and hourState elements are updated each minute', function() {
      ClockView.updateDigitalClock();
      this.clock.tick(59 * 1000);
      assert.equal(this.timeElem.innerHTML,
        'Tue Jul 16 2013 06:01:00 GMT-0400 (EDT)');
      assert.equal(this.hourStateElem.innerHTML, '&nbsp;&nbsp;');
    });

  });

});
