requireApp('clock/js/clock_view.js');
requireApp('clock/js/utils.js');

suite('ClockView', function() {

  suiteSetup(function() {
    // The timestamp for "Tue Jul 16 2013 06:00:00" according to the local
    // system's time zone
    this.sixAm = 1373954400000 + (new Date()).getTimezoneOffset() * 60 * 1000;
  });

  suite('updateDaydate', function() {

    suiteSetup(function() {
      this.dayDateElem = document.createElement('div');
      this.dayDateElem.id = 'clock-day-date';
      document.body.appendChild(this.dayDateElem);
    });

    setup(function() {
      this.clock = sinon.useFakeTimers(this.sixAm);
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
      assert.equal(Date.parse(this.dayDateElem.textContent), this.sixAm);
    });

    test('date element is not updated twice in the same day', function() {
      ClockView.updateDaydate();
      this.clock.tick(18 * 60 * 60 * 1000 - 1);
      assert.equal(Date.parse(this.dayDateElem.textContent), this.sixAm);
    });

    test('date element is updated each day', function() {
      ClockView.updateDaydate();
      this.clock.tick(18 * 60 * 60 * 1000);
      assert.equal(Date.parse(this.dayDateElem.textContent),
        this.sixAm + 18 * 60 * 60 * 1000);
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
      this.clock = sinon.useFakeTimers(this.sixAm + 1000);
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
      assert.equal(Date.parse(this.timeElem.innerHTML), this.sixAm + 1000);
      assert.equal(this.hourStateElem.innerHTML, '&nbsp;&nbsp;');
    });

    test('time and hourState elements are not updated twice in the same ' +
      'minute', function() {
      ClockView.updateDigitalClock();
      this.clock.tick(59 * 1000 - 1);
      assert.equal(Date.parse(this.timeElem.innerHTML), this.sixAm + 1000);
      assert.equal(this.hourStateElem.innerHTML, '&nbsp;&nbsp;');
    });

    test('time and hourState elements are updated each minute', function() {
      ClockView.updateDigitalClock();
      this.clock.tick(59 * 1000);
      assert.equal(Date.parse(this.timeElem.innerHTML),
        this.sixAm + 60 * 1000);
      assert.equal(this.hourStateElem.innerHTML, '&nbsp;&nbsp;');
    });

  });

  suite('updateAnalogClock', function() {

    suiteSetup(function() {
      this.secondHand = document.createElement('rect');
      this.secondHand.id = 'secondhand';
      document.body.appendChild(this.secondHand);
      this.minuteHand = document.createElement('rect');
      this.minuteHand.id = 'minutehand';
      document.body.appendChild(this.minuteHand);
      this.hourHand = document.createElement('rect');
      this.hourHand.id = 'hourhand';
      document.body.appendChild(this.hourHand);
    });

    setup(function() {
      this.clock = sinon.useFakeTimers(this.sixAm + 1200);
    });

    teardown(function() {
      var attrs, rotate;

      // The method under test caches the SVG `animateTransform` elements it
      // creates, meaning that simply clearing the contents of the "-hand"
      // elements will not prevent state leakage.
      rotate = this.secondHand.childNodes[0];
      attrs = Array.prototype.slice.call(rotate.attributes);
      attrs.forEach(function(attr) {
        rotate.removeAttribute(attr.nodeName);
      });

      rotate = this.minuteHand.childNodes[0];
      attrs = Array.prototype.slice.call(rotate.attributes);
      attrs.forEach(function(attr) {
        rotate.removeAttribute(attr.nodeName);
      });

      rotate = this.hourHand.childNodes[0];
      attrs = Array.prototype.slice.call(rotate.attributes);
      attrs.forEach(function(attr) {
        rotate.removeAttribute(attr.nodeName);
      });

      this.clock.restore();
    });

    suiteTeardown(function() {
      this.secondHand.parentNode.removeChild(this.secondHand);
      this.minuteHand.parentNode.removeChild(this.minuteHand);
      this.hourHand.parentNode.removeChild(this.hourHand);
    });

    test('second-, minute-, and hour- hands are updated immediately',
      function() {
      var rotate;

      ClockView.updateAnalogClock();

      rotate = this.secondHand.childNodes[0];
      assert.ok(rotate, 'Second hand rotation element exists');
      assert.equal(rotate.getAttribute('from'), '0,135,135');
      assert.equal(rotate.getAttribute('to'), '6,135,135');

      rotate = this.minuteHand.childNodes[0];
      assert.ok(rotate, 'Minute hand rotation element exists');
      assert.equal(rotate.getAttribute('from'), '-186,135,135');
      assert.equal(rotate.getAttribute('to'), '-180,135,135');

      rotate = this.hourHand.childNodes[0];
      assert.ok(rotate, 'Hour hand rotation element exists');
      assert.equal(rotate.getAttribute('from'), '-30,135,135');
      assert.equal(rotate.getAttribute('to'), '0,135,135');
    });

    test('second-, minute-, and hour- hands are not updated twice in the ' +
      'same second', function() {
      var rotate;

      ClockView.updateAnalogClock();
      this.clock.tick(799);

      rotate = this.secondHand.childNodes[0];
      assert.ok(rotate, 'Second hand rotation element exists');
      assert.equal(rotate.getAttribute('from'), '0,135,135');
      assert.equal(rotate.getAttribute('to'), '6,135,135');

      rotate = this.minuteHand.childNodes[0];
      assert.ok(rotate, 'Minute hand rotation element exists');
      assert.equal(rotate.getAttribute('from'), '-186,135,135');
      assert.equal(rotate.getAttribute('to'), '-180,135,135');

      rotate = this.hourHand.childNodes[0];
      assert.ok(rotate, 'Hour hand rotation element exists');
      assert.equal(rotate.getAttribute('from'), '-30,135,135');
      assert.equal(rotate.getAttribute('to'), '0,135,135');
    });

    test('second-, minute-, and hour- hands are updated each second',
      function() {
      var rotate;

      ClockView.updateAnalogClock();
      this.clock.tick(800);

      rotate = this.secondHand.childNodes[0];
      assert.ok(rotate, 'Second hand rotation element exists');
      assert.equal(rotate.getAttribute('from'), '6,135,135');
      assert.equal(rotate.getAttribute('to'), '12,135,135');

      rotate = this.minuteHand.childNodes[0];
      assert.ok(rotate, 'Minute hand rotation element exists');
      assert.equal(rotate.getAttribute('from'), '-186,135,135');
      assert.equal(rotate.getAttribute('to'), '-180,135,135');

      rotate = this.hourHand.childNodes[0];
      assert.ok(rotate, 'Hour hand rotation element exists');
      assert.equal(rotate.getAttribute('from'), '-30,135,135');
      assert.equal(rotate.getAttribute('to'), '0,135,135');
    });

  });

});
