'use strict';
var assert = require('assert');

suite('MarionetteHelper.fillInputFieldAndtapSelectOption', function() {

  // Require needed files.
  var FakeApp = require('./lib/fake_app');
  marionette.plugin('helper', require('../index'));
  marionette.plugin('apps', require('marionette-apps'));

  var helper;
  var fakeApp;
  var FAKE_APP_ORIGIN = 'fakeapp.gaiamobile.org';

  var apps = {};
  apps[FAKE_APP_ORIGIN] = __dirname + '/fakeapp';

  var testTime;
  var client = marionette.client({
    profile: {
      settings: {
        'ftu.manifestURL': null,
        'lockscreen.enabled': false
      },
      apps: apps
    }
  });

  // We add lead zero on single digit. ex: 1 -> 01, 9 -> 09.
  function addLeadZero(num) {
    return num >= 10 ? num : ('0' + num);
  }

  setup(function(done) {
    helper = client.helper;
    fakeApp = new FakeApp(client, 'app://' + FAKE_APP_ORIGIN);
    fakeApp.launch();
    testTime = new Date();
    setTimeout(done, 2500);  // Instead of using the BootWatcher.
  });

  test('should set on option', function() {
    var optionValue = 'option2';
    helper.tapSelectOption('#select', optionValue);
    assert.ok(fakeApp.isSpecificSelectOptionSelected(optionValue));
  });

  test('should set value on input', function() {
    var inputValue = 'inputtest';
    helper.fillInputField('#input', inputValue);
    assert.equal(fakeApp.inputElementValue, inputValue);
  });

  test('should set date on input', function() {
    var inputValue =
      testTime.getFullYear() + '-' + addLeadZero(testTime.getMonth()) + '-' +
      addLeadZero(testTime.getDate());
    helper.fillInputField('#input-date', testTime);
    assert.equal(fakeApp.inputDateElementValue, inputValue);
  });

  test('should set time on input', function() {
    var inputValue = addLeadZero(testTime.getHours()) + ':' +
                     addLeadZero(testTime.getMinutes());
    helper.fillInputField('#input-time', testTime);
    assert.equal(fakeApp.inputTimeElementValue, inputValue);
  });

  test('should set datetime on input', function() {
    var inputValue = testTime.toISOString();

    helper.fillInputField('#input-datetime', testTime);
    assert.equal(fakeApp.inputDatetimeElementValue, inputValue);
  });

  test('should set datetime-local on input', function() {
    var inputValue = testTime.getFullYear() + '-' +
                     addLeadZero(testTime.getMonth()) + '-' +
                     addLeadZero(testTime.getDate()) + 'T' +
                     addLeadZero(testTime.getHours()) + ':' +
                     addLeadZero(testTime.getMinutes()) + ':' +
                     addLeadZero(testTime.getSeconds()) + '.' +
                     testTime.getMilliseconds();

    helper.fillInputField('#input-datetime-local', testTime);
    assert.equal(fakeApp.inputDatetimeLocalElementValue, inputValue);
  });
});
