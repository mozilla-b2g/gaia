'use strict';
/*global __dirname */

var Settings = require('../app/app');
var assert = require('assert');

marionette('Date time', function() {
  var client = marionette.client();
  var settingsApp;
  var datetimePanel;
  setup(function() {
    settingsApp = new Settings(client);
    client.contentScript.inject(__dirname +
      '/../app/mocks/mock_navigator_moz_time.js');
    settingsApp.launch();
    // Navigate to the Hotspot Settings menu
    datetimePanel = settingsApp.datetimePanel;
  });

  function leadingZero(num) {
    return (num > 9) ? '' + num : '0' + num;
  }

  function dateForm() {
    var d = new Date();
    return leadingZero(d.getMonth() + 1) + '/' +
           leadingZero(d.getDate()) + '/' +
           leadingZero(d.getFullYear());
  }

  function timeForm() {
    var d = new Date();
    var hr = d.getHours();
    var amPm = hr >= 12 ? 'PM' : 'AM';
    hr = (hr === 0 ? '12' : hr);
    return (hr > 12 ? hr - 12 : hr) + ':' +
           leadingZero(d.getMinutes()) + ' ' + amPm;
  }

  test('current date and time', function() {
    assert.equal(
      datetimePanel.clockDate,
      dateForm()
    );
    assert.equal(
      datetimePanel.clockTime,
      timeForm()
    );
  });

  test('change date', function() {
    var testDate = '1986-09-24';
    datetimePanel.setClockDate(testDate);
    assert.notEqual(datetimePanel.getSystemTime().indexOf(testDate), -1);
  });

  test('change time', function() {
    var now = new Date();
    var testTime = now.getHours() + ':12';
    var UTCTestTime = leadingZero(now.getUTCHours()) + ':12';
    datetimePanel.setClockTime(testTime);
    datetimePanel.findElement('clockTimePicker').getAttribute('value');
    console.log('time is ' + datetimePanel.getSystemTime());
    assert.notEqual(
      datetimePanel.getSystemTime().indexOf(UTCTestTime), -1);

  });
  test('select City and Region', function() {
    var key = 'time.timezone';
    var region = 'Europe';
    var city = 'Belgrade';
    datetimePanel.selectRegionOption(region);
    datetimePanel.selectCityOption(city);
    assert.equal(client.settings.get(key), region + '/' + city);
  });
});
