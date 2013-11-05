mocha.setup({ globals: ['GestureDetector'] });

suite('Picker', function() {
  var Picker, Spinner;

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');

    testRequire(['picker/picker', 'mocks/mock_picker/spinner'], {
        mocks: ['picker/spinner']
      }, function(picker, mockSpinner) {
        Picker = picker;
        Spinner = mockSpinner;
        done();
      });
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

    assert.equal(picker.value, '0:0');
  });


  test('isPadded = true', function() {
    Spinner.args.length = 0;

    var picker = new Picker({
      element: document.getElementById('time-picker'),
      pickers: {
        list: {
          range: [9, 10],
          isPadded: true
        }
      }
    });
    assert.equal(Spinner.args.length, 1);

    var args = Spinner.args[0][0];

    assert.include(args, 'element');
    assert.include(args, 'values');

    assert.deepEqual(args.values, ['09', 10]);
  });
});
