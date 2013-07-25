'use strict';

mocha.globals(['ValuePicker']);

requireApp('system/js/value_selector/value_picker.js');

suite('value selector/value picker', function() {
  var subject;

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    // <div class="value-picker-month-wrapper">
    //     <div class="value-picker-month" class="animation-on"></div>
    // </div>
    var testMarkup = '<div class="value-picker-month" ' +
                     'class="animation-on"></div>';
    var div = document.createElement('div');
    div.id = 'test';
    div.className = 'value-picker-month-wrapper';
    div.innerHTML = testMarkup;
    document.body.appendChild(div);

    // month value picker
    var monthUnitStyle = {
      valueDisplayedText: ['1', '2', '3', '4'],
      className: 'value-picker-month'
    };

    var monthPickerContainer =
      document.querySelector('.value-picker-month');
    subject = new ValuePicker(monthPickerContainer, monthUnitStyle);
  });

  test('#getSelectedIndex', function() {
    subject._currentIndex = 2;
    assert.equal(subject.getSelectedIndex(), 2);
  });

  test('#getSelectedDisplayedText', function() {
    assert.equal(subject.getSelectedDisplayedText(), '1');
  });

  test('#setSelectedDisplayedText', function() {
    subject._currentIndex = 3;
    assert.equal(subject.getSelectedDisplayedText(), '4');
  });

  test('#setRange', function() {
    var GLOBAL_MIN_YEAR = 1900;
    subject.setRange(1998 - GLOBAL_MIN_YEAR,
                               2013 - GLOBAL_MIN_YEAR);
    assert.equal(subject._lower, 98);
    assert.equal(subject._upper, 113);
  });
});
