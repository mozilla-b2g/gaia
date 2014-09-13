'use strict';
mocha.setup({ globals: ['GestureDetector'] });

suite('Picker', function() {
  var Picker, Spinner;

  suiteSetup(function(done) {
    require(['picker/picker', 'picker/spinner'],
            function(picker, spinner) {
        Picker = picker;
        Spinner = spinner;
        done();
      });
  });

  test('shape:prototype ', function() {
    assert.ok(Picker);
    assert.include(Picker.prototype, 'reset_reset');
    expect(Picker.prototype).to.have.property('reset');
    expect(Picker.prototype).to.have.property('value');
    assert.isNull(Picker.prototype.value);
  });

  var picker;
  setup(function() {
    var pickerEl = document.createElement('div');
    pickerEl.appendChild(document.createElement('div'))
      .classList.add('picker-hours');
    pickerEl.appendChild(document.createElement('div'))
      .classList.add('picker-minutes');
    picker = new Picker({
      element: pickerEl,
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
  });

  test('shape:instance ', function() {
    expect(picker).to.have.property('nodes');
    expect(picker).to.have.property('spinners');
    expect(picker).to.have.property('pickers');

    expect(picker.nodes).to.have.property('hours');
    expect(picker.nodes).to.have.property('minutes');

    expect(picker.spinners).to.have.property('hours');
    expect(picker.spinners).to.have.property('minutes');

    assert.deepEqual(picker.pickers, ['hours', 'minutes']);
  });

  test('values ', function() {
    var spinners = picker.spinners;

    assert.equal(spinners.hours.values[0], 0);
    assert.equal(spinners.hours.values[23], 23);
    assert.equal(spinners.hours.values[24], undefined);

    assert.equal(spinners.minutes.values[0], 0);
    assert.equal(spinners.minutes.values[59], 59);
    assert.equal(spinners.minutes.values[60], undefined);

    assert.equal(picker.value, '0:00');
  });

  test('get and set value ', function() {
    picker.value = '1:59';

    var spinners = picker.spinners;

    assert.equal(spinners.hours.value, 1);
    assert.equal(spinners.minutes.value, 59);
  });
});
