'use strict';

mocha.globals(['SpinDatePicker']);

require('/shared/test/unit/load_body_html_helper.js');
requireApp('system/js/value_selector/value_picker.js');
requireApp('system/test/unit/mock_l10n.js');

suite('value selector/spin date picker', function() {
  var subject;
  var realL10n;
  var dateContainer, yearButton;
  var IGNORED_YEAR = 9996;

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    loadBodyHTML('/index.html');
    dateContainer = document.getElementById('spin-date-picker');
    yearButton = document.querySelector('.spin-date-picker-button-year');

    requireApp('system/js/value_selector/spin_date_picker.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  setup(function() {
    subject = new SpinDatePicker(dateContainer);
  });

  teardown(function() {
    subject.uninit();
  });

  test('setValue in range', function() {
    subject.setRange();
    subject.value = new Date(2011, 9, 12);
    assert.equal(subject.year, 2011);
    assert.equal(subject.month, 9);
    assert.equal(subject.date, 12);
    assert.isFalse(dateContainer.classList.contains('year-hidden'));
  });

  test('setValue out of range', function() {
    subject.setRange();
    subject.value = new Date(3333, 9, 12);
    assert.equal(subject.year, 2099);
    assert.equal(subject.month, 9);
    assert.equal(subject.date, 12);
    assert.isFalse(dateContainer.classList.contains('year-hidden'));
  });

  test('setValue without year', function() {
    subject.setRange();
    subject.value = new Date(IGNORED_YEAR, 9, 12);
    assert.equal(subject.year, IGNORED_YEAR);
    assert.equal(subject.month, 9);
    assert.equal(subject.date, 12);
    assert.isTrue(dateContainer.classList.contains('year-hidden'));
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

  test('hiding and showing year column', function() {
    subject.setRange();
    subject.value = new Date(2011, 9, 12);
    assert.isFalse(dateContainer.classList.contains('year-hidden'));

    yearButton.click();

    assert.isTrue(dateContainer.classList.contains('year-hidden'));
    assert.equal(subject.year, IGNORED_YEAR);

    yearButton.click();

    assert.isFalse(dateContainer.classList.contains('year-hidden'));
    assert.equal(subject.year, 2011);
  });
});
