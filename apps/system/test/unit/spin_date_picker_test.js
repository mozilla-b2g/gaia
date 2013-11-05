'use strict';

mocha.globals(['SpinDatePicker']);

requireApp('system/js/value_selector/value_picker.js');
requireApp('system/js/value_selector/spin_date_picker.js');
requireApp('system/test/unit/mock_l10n.js');

suite('value selector/spin date picker', function() {
  var subject;
  var realL10n;
  var stubById;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  teardown(function() {
    stubById.restore();
  });

  setup(function() {
    // mockup element
    function mock_obj() {};
    mock_obj.prototype.querySelector = function() {
      return document.createElement('div').
        appendChild(document.createElement('div'));
    };

    stubById = this.sinon.stub(document, 'getElementById')
                   .returns(new mock_obj());

    var DateContainer =
      document.getElementById('spin-date-picker');
    subject = new SpinDatePicker(DateContainer);
  });

  test('setValue', function() {
    subject.setRange();
    subject.value = new Date(2011, 9, 12);
    assert.equal(subject.year, 2011);
    assert.equal(subject.month, 9);
    assert.equal(subject.date, 12);
  });

  test('setRange default', function() {
    subject.setRange();

    assert.equal(subject.yearPicker._lower, 0);
    assert.equal(subject.yearPicker._upper, 199);
  });

  test('setRange in range', function() {
    subject.setRange(new Date(2011, 9, 12), new Date(2013, 5, 21));
    assert.equal(subject.yearPicker._lower, 111);
    assert.equal(subject.yearPicker._upper, 113);
  });
});
