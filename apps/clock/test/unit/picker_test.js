requireApp('clock/js/picker/spinner.js');
requireApp('clock/js/picker/picker.js');
requireApp('clock/test/unit/mocks/mock_spinner.js');

suite('Picker', function() {
  var s;

  suiteSetup(function() {
    loadBodyHTML('/index.html');

    s = Spinner;

    Spinner = MockSpinner;
  });

  suiteTeardown(function() {
    Spinner = s;
  });

  test('shape:prototype ', function() {
    assert.ok(Picker);
    assert.ok(Picker.prototype.reset);
  });

  test('shape:instance ', function() {
    var picker = new Picker({
      element: document.getElementById('time-picker'),
      pickers: {
        hours: {
          range: [0, 23]
        },
        minutes: {
          range: [0, 59],
          isPadded: true
        }
      }
    });

    assert.include(picker, 'nodes');
    assert.include(picker, 'spinners');
    assert.include(picker, 'pickers');

    assert.include(picker.nodes, 'hours');
    assert.include(picker.nodes, 'minutes');

    assert.include(picker.spinners, 'hours');
    assert.include(picker.spinners, 'minutes');

    assert.deepEqual(picker.pickers, ['hours', 'minutes']);
  });

  test('values ', function() {
    var picker = new Picker({
      element: document.getElementById('time-picker'),
      pickers: {
        hours: {
          range: [0, 23]
        },
        minutes: {
          range: [0, 59],
          isPadded: true
        }
      }
    });
    var spinners = picker.spinners;

    assert.equal(spinners.hours.lower, 0);
    assert.equal(spinners.hours.upper, 23);
    assert.equal(spinners.hours.range, 24);

    assert.equal(spinners.minutes.lower, 0);
    assert.equal(spinners.minutes.upper, 59);
    assert.equal(spinners.minutes.range, 60);
  });


  test('isPadded = true', function() {
    this.sinon.spy(window, 'Spinner');

    var picker = new Picker({
      element: document.getElementById('time-picker'),
      pickers: {
        list: {
          range: [9, 10],
          isPadded: true
        }
      }
    });
    assert.isTrue(Spinner.called);

    var args = Spinner.getCall(0).args[0];

    assert.include(args, 'element');
    assert.include(args, 'values');

    assert.deepEqual(args.values, ['09', 10]);
  });
});
