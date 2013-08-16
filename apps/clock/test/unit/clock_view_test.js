requireApp('clock/js/alarm_list.js');
requireApp('clock/js/clock_view.js');
requireApp('clock/js/utils.js');

requireApp('clock/test/unit/mocks/mock_alarm_list.js');
requireApp('clock/test/unit/mocks/mock_asyncstorage.js');

suite('ClockView', function() {
  var al;

  suiteSetup(function() {

    // Load before clock_view to ensure elements are initialized properly.
    loadBodyHTML('/index.html');

    al = AlarmList;
    AlarmList = MockAlarmList;

    ClockView.init();

    // The timestamp for "Tue Jul 16 2013 06:00:00" according to the local
    // system's time zone
    this.sixAm = 1373954400000 + (new Date()).getTimezoneOffset() * 60 * 1000;
  });

  suiteTeardown(function() {
    AlarmList = al;
  });

  test('ClockView.isInitialized ', function() {
    assert.ok(ClockView.isInitialized);
  });

  suite('updateDayDate', function() {

    suiteSetup(function() {
      ClockView.dayDate = document.getElementById('clock-day-date');
    });

    setup(function() {
      this.clock = this.sinon.useFakeTimers(this.sixAm);
    });

    teardown(function() {
      ClockView.dayDate.innerHTML = '';
    });

    test('date element is updated with the current time', function() {
      ClockView.updateDayDate();
      assert.equal(Date.parse(ClockView.dayDate.textContent), this.sixAm);
    });

    test('date element is not updated twice in the same day', function() {
      ClockView.updateDayDate();
      this.clock.tick(18 * 60 * 60 * 1000 - 1);
      assert.equal(Date.parse(ClockView.dayDate.textContent), this.sixAm);
    });

    test('date element is updated each day', function() {
      ClockView.updateDayDate();
      this.clock.tick(18 * 60 * 60 * 1000);
      assert.equal(Date.parse(ClockView.dayDate.textContent),
        this.sixAm + 18 * 60 * 60 * 1000);
    });

  });

  suite('updateDigitalClock', function() {

    setup(function() {
      this.clock = sinon.useFakeTimers(this.sixAm + 1000);
    });

    teardown(function() {
      ClockView.time.innerHTML = '';
      ClockView.hourState.innerHTML = '';
      this.clock.restore();
    });

    test('time and hourState elements are updated immediately',
      function() {
      ClockView.updateDigitalClock();
      assert.equal(Date.parse(ClockView.time.innerHTML), this.sixAm + 1000);
      assert.equal(ClockView.hourState.innerHTML, '&nbsp;&nbsp;');
    });

    test('time and hourState elements are not updated twice in the same ' +
      'minute', function() {
      ClockView.updateDigitalClock();
      this.clock.tick(59 * 1000 - 1);
      assert.equal(Date.parse(ClockView.time.innerHTML), this.sixAm + 1000);
      assert.equal(ClockView.hourState.innerHTML, '&nbsp;&nbsp;');
    });

    test('time and hourState elements are updated each minute', function() {
      ClockView.updateDigitalClock();
      this.clock.tick(59 * 1000);
      assert.equal(Date.parse(ClockView.time.innerHTML),
        this.sixAm + 60 * 1000);
      assert.equal(ClockView.hourState.innerHTML, '&nbsp;&nbsp;');
    });

  });

  suite('updateAnalogClock', function() {

    suiteSetup(function() {
      this.second = document.getElementById('secondhand');
      this.minute = document.getElementById('minutehand');
      this.hour = document.getElementById('hourhand');
    });

    setup(function() {
      this.clock = sinon.useFakeTimers(this.sixAm + 1200);
    });



    test('second-, minute-, and hour- hands are updated immediately',
      function() {
      var rotate;
      ClockView.updateAnalogClock();

      rotate = this.second;
      assert.ok(rotate, 'Second hand rotation element exists');
      assert.equal(rotate.getAttribute('transform'), 'rotate(6,135,135)');

      rotate = this.minute;
      assert.ok(rotate, 'Minute hand rotation element exists');
      assert.equal(rotate.getAttribute('transform'), 'rotate(-180,135,135)');

      rotate = this.hour;
      assert.ok(rotate, 'Hour hand rotation element exists');
      assert.equal(rotate.getAttribute('transform'), 'rotate(0,135,135)');
    });

    test('second-, minute-, and hour- hands are not updated twice in the ' +
      'same second', function() {
      var rotate;
      ClockView.updateAnalogClock();
      this.clock.tick(799);

      rotate = this.second;
      assert.ok(rotate, 'Second hand rotation element exists');
      assert.equal(rotate.getAttribute('transform'), 'rotate(6,135,135)');

      rotate = this.minute;
      assert.ok(rotate, 'Minute hand rotation element exists');
      assert.equal(rotate.getAttribute('transform'), 'rotate(-180,135,135)');

      rotate = this.hour;
      assert.ok(rotate, 'Hour hand rotation element exists');
      assert.equal(rotate.getAttribute('transform'), 'rotate(0,135,135)');
    });

    test('second-, minute-, and hour- hands are updated each second',
      function() {
      var rotate;
      ClockView.updateAnalogClock();
      this.clock.tick(800);

      rotate = this.second;
      assert.ok(rotate, 'Second hand rotation element exists');
      assert.equal(rotate.getAttribute('transform'), 'rotate(12,135,135)');

      rotate = this.minute;
      assert.ok(rotate, 'Minute hand rotation element exists');
      assert.equal(rotate.getAttribute('transform'), 'rotate(-180,135,135)');

      rotate = this.hour;
      assert.ok(rotate, 'Hour hand rotation element exists');
      assert.equal(rotate.getAttribute('transform'), 'rotate(0,135,135)');
    });

  });

  suite('show', function() {
    var as;

    suiteSetup(function() {
      as = asyncStorage;
      asyncStorage = MockAsyncStorage;
    });

    suiteTeardown(function() {
      asyncStorage = as;
    });

    setup(function() {
      ClockView.mode = 'analog';
      window.location.hash = 'alarm-view';
    });

    teardown(function() {
      ClockView.mode = 'analog';
    });

    test('show() [no mode, no settings, defer to default] ', function() {
      this.sinon.spy(asyncStorage, 'setItem');
      this.sinon.stub(asyncStorage, 'getItem', function() {
        return null;
      });

      // Clear the locally stored "mode"
      ClockView.mode = null;

      ClockView.show();

      // null => analog (default), asyncStorage.setItem should be called
      assert.ok(asyncStorage.setItem.called);

      // analog is the default, analog is visible
      assert.ok(
        ClockView.analog.classList.contains('visible')
      );

      // analog is the default, digital is not visible
      assert.isFalse(
        ClockView.digital.classList.contains('visible')
      );
    });

    test('show() [no mode, defer to settings] ', function() {
      this.sinon.spy(asyncStorage, 'setItem');

      ClockView.show();

      // Nothing changed, asyncStorage.setItem should not be called
      assert.isFalse(asyncStorage.setItem.called);

      // Nothing changed, analog is still visible
      assert.ok(
        ClockView.analog.classList.contains('visible')
      );

      // Nothing changed, digital is NOT visible
      assert.isFalse(
        ClockView.digital.classList.contains('visible')
      );
    });

    test('show(analog) [no mode, defer to settings] ', function() {
      this.sinon.spy(asyncStorage, 'setItem');

      ClockView.show('analog');

      // Nothing changed, asyncStorage.setItem should not be called
      assert.isFalse(asyncStorage.setItem.called);

      // Nothing changed, analog is still visible
      assert.ok(
        ClockView.analog.classList.contains('visible')
      );

      // Nothing changed, digital is NOT visible
      assert.isFalse(
        ClockView.digital.classList.contains('visible')
      );
    });

    test('show(analog) ', function() {
      ClockView.mode = 'digital';

      this.sinon.spy(asyncStorage, 'setItem');

      ClockView.show('analog');

      // Nothing changed, asyncStorage.setItem should not be called
      assert.ok(asyncStorage.setItem.called);

      assert.equal(
        asyncStorage.setItem.args[0][0],
        'settings_clockoptions_mode'
      );

      assert.equal(
        asyncStorage.setItem.args[0][1],
        'analog'
      );

      // Nothing changed, analog is still visible
      assert.ok(
        ClockView.analog.classList.contains('visible')
      );

      // Nothing changed, digital is NOT visible
      assert.isFalse(
        ClockView.digital.classList.contains('visible')
      );
    });

    test('show(digital) ', function() {
      ClockView.mode = 'analog';

      this.sinon.spy(asyncStorage, 'setItem');

      ClockView.show('digital');

      // Updated, asyncStorage.setItem IS called
      assert.ok(asyncStorage.setItem.called);

      assert.equal(
        asyncStorage.setItem.args[0][0],
        'settings_clockoptions_mode'
      );

      assert.equal(
        asyncStorage.setItem.args[0][1],
        'digital'
      );

      // Updated, analog is NOT visible
      assert.isFalse(
        ClockView.analog.classList.contains('visible')
      );

      // Updated, digital IS visible
      assert.ok(
        ClockView.digital.classList.contains('visible')
      );
    });


    test('ClockView.analog.click() shows digital ', function(done) {
      this.sinon.spy(asyncStorage, 'setItem');

      this.sinon.stub(ClockView, 'show', function(mode) {
        ClockView.show.restore();

        assert.equal(mode, 'digital');

        done();
      });

      ClockView.analog.click();
    });

    test('ClockView.digital.click() shows analog ', function(done) {
      ClockView.mode = 'digital';

      this.sinon.spy(asyncStorage, 'setItem');

      this.sinon.stub(ClockView, 'show', function(mode) {
        ClockView.show.restore();

        assert.equal(mode, 'analog');

        done();
      });

      ClockView.digital.click();
    });
  });
});
