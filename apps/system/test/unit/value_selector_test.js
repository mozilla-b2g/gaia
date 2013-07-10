'use strict';

mocha.globals(['ValueSelector']);

requireApp('system/js/value_selector/value_selector.js');
requireApp('system/test/unit/mock_l10n.js');

suite('value selector/value selector', function() {
  var element;

  var realL10n;
  var realKeyboard;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realKeyboard = window.navigator.mozKeyboard;
    window.navigator.mozKeyboard = sinon.stub();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    window.navigator.mozKeyboard = realKeyboard;
  });

  teardown(function() {
    var el = document.getElementById('value-selector');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var testMarkup = '<!-- popup of options for select element -->' +
        '<form id="select-option-popup" role="dialog"' +
        ' data-type="value-selector">' +
          '<section id="value-selector-container">' +
            '<h1 data-l10n-id="choose-option">Choose your option</h1>' +
            '<ol role="listbox">' +
            '</ol>' +
          '</section>' +
          '<menu id="select-options-buttons">' +
            '<button class="value-option-confirm affirmative full"' +
            ' data-type="ok" data-l10n-id="ok">Ok</button>' +
          '</menu>' +
        '</form>' +
        '<!-- Time Picker -->' +
        '<div id="time-picker-popup" hidden>' +
          '<h3 data-l10n-id="select-time">Select time</h3>' +
          '<div id="time-picker">' +
            '<div class="picker-container">' +
              '<div class="picker-bar-background"></div>' +
              '<div class="value-picker-hours-wrapper">' +
                '<div class="value-picker-hours" class="animation-on"></div>' +
              '</div>' +
              '<div class="value-picker-minutes-wrapper">' +
                '<div class="value-picker-minutes"' +
                ' class="animation-on"></div>' +
              '</div>' +
              '<div class="value-picker-hour24-wrapper">' +
                '<div class="value-picker-hour24-state"' +
                ' class="animation-on"></div>' +
              '</div>' +
              '<div class="value-indicator">' +
                '<div class="value-indicator-colon">:</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div id="time-picker-buttons">' +
            '<button class="value-selector-cancel"' +
            ' data-type="cancel" data-l10n-id="cancel">Cancel</button>' +
            '<button class="value-selector-confirm affirmative"' +
            ' data-type="ok" data-l10n-id="ok">Ok</button>' +
          '</div>' +
        '</div>' +
        '<!-- Spin Date Picker -->' +
        '<div id="spin-date-picker-popup" hidden>' +
          '<h3 data-l10n-id="select-day">Select day</h3>' +
          '<div id="spin-date-picker">' +
            '<div class="picker-container">' +
              '<div class="picker-bar-background"></div>' +
              '<div class="value-picker-date-wrapper">' +
                '<div class="value-picker-date animation-on"></div>' +
                '<div class="value-picker-date animation-on"></div>' +
                '<div class="value-picker-date animation-on"></div>' +
                '<div class="value-picker-date animation-on"></div>' +
              '</div>' +
              '<div class="value-picker-month-wrapper">' +
                '<div class="value-picker-month" class="animation-on"></div>' +
              '</div>' +
              '<div class="value-picker-year-wrapper">' +
                '<div class="value-picker-year" class="animation-on"></div>' +
              '</div>' +
              '<div class="value-indicator"></div>' +
            '</div>' +
          '</div>' +
          '<menu id="spin-date-picker-buttons" data-items="2">' +
            '<button class="value-selector-cancel"' +
            ' data-type="cancel" data-l10n-id="cancel">Cancel</button>' +
            '<button class="value-option-confirm affirmative"' +
            ' data-type="ok" data-l10n-id="ok">Ok</button>' +
          '</menu>' +
        '</div>';
    var div = document.createElement('div');
    div.id = 'value-selector';

    div.innerHTML = testMarkup;
    document.body.appendChild(div);

    ValueSelector.init();
    element = document.getElementById('value-selector');
  });

  test('#show', function() {
    ValueSelector.show();
    assert.isFalse(element.hidden);
  });

  test('#hide', function() {
    ValueSelector.hide();
    assert.isTrue(element.hidden);
  });
});
