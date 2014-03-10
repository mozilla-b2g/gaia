'use strict';

mocha.globals(['ValueSelector']);

require('/shared/js/input_parser.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/apps/system/js/value_selector/value_picker.js');
require('/apps/system/js/value_selector/value_selector.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/apps/system/test/unit/mock_l10n.js');

suite('value selector/value selector', function() {
  var realL10n;
  var realKeyboard;
  var realSettings;
  var stubMozl10nGet;
  var element;
  var timePickerContainer;
  var timeSeparator;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    loadBodyHTML('/index.html');

    timePickerContainer =
      document.querySelector('#time-picker .picker-container');
    timeSeparator = document.getElementById('hours-minutes-separator');

    realKeyboard = window.navigator.mozKeyboard;
    window.navigator.mozKeyboard = sinon.stub();
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    navigator.mozL10n = realL10n;
    window.navigator.mozKeyboard = realKeyboard;
    document.body.innerHTML = '';
  });

  setup(function() {
    ValueSelector.init();
    element = document.getElementById('value-selector');
  });

  teardown(function() {
    // remove classes added by tests
    timePickerContainer.className = 'picker-container';
  });

  test('show', function() {
    ValueSelector.show();
    assert.isFalse(element.hidden);
  });

  test('hide', function() {
    ValueSelector.hide();
    assert.isTrue(element.hidden);
  });

  test('Time Picker (en-US)', function() {
    stubMozl10nGet =
      this.sinon.stub(navigator.mozL10n, 'get').returns('%I:%M %p');
    ValueSelector.showTimePicker();
    assert.isTrue(TimePicker.timePicker.is12hFormat);
    assert.equal('time', ValueSelector._currentPickerType);
    assert.equal(':', timeSeparator.textContent);
    assert.ok(timePickerContainer.classList.contains('format12h'));
  });

  test('Time Picker (pt-BR)', function() {
    stubMozl10nGet =
      this.sinon.stub(navigator.mozL10n, 'get').returns('%Hh%M');
    TimePicker.initTimePicker();
    assert.isFalse(TimePicker.timePicker.is12hFormat);
    assert.equal('h', timeSeparator.textContent);
    assert.ok(timePickerContainer.classList.contains('format24h'));
  });

  test('Time Picker (zh-CN)', function() {
    stubMozl10nGet =
      this.sinon.stub(navigator.mozL10n, 'get').returns('%p %I:%M');
    TimePicker.initTimePicker();
    assert.isTrue(TimePicker.timePicker.is12hFormat);
    assert.equal(':', timeSeparator.textContent);
    assert.ok(timePickerContainer.classList.contains('format12hrev'));
  });

});
