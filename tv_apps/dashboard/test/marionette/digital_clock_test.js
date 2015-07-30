'use strict';

var APP_URL = 'app://dashboard.gaiamobile.org';

var assert = require('chai').assert;

marionette('Test Digital Clock', function() {

  var opts = {
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  var client = marionette.client({ profile: opts });

  setup(function() {
    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);
  });

  test('Should display the current time',
       { devices: ['tv'] }, function () {
    var element = client.helper.waitForElement('body');

    var hoursTens = element.findElement('#hours-tens-digit');
    assert.ok(hoursTens.scriptWith(function(elem) {
      var now = new Date();
      return parseInt(elem.textContent, 10) ===
             Math.floor(now.getHours() / 10);
    }));

    var hoursUnits = element.findElement('#hours-units-digit');
    assert.ok(hoursUnits.scriptWith(function(elem) {
      var now = new Date();
      return parseInt(elem.textContent, 10) === now.getHours() % 10;
    }));

    var minutesTens = element.findElement('#minutes-tens-digit');
    assert.ok(minutesTens.scriptWith(function(elem) {
      var now = new Date();
      return parseInt(elem.textContent, 10) ===
             Math.floor(now.getMinutes() / 10);
    }));

    var minutesUnits = element.findElement('#minutes-units-digit');
    assert.ok(minutesUnits.scriptWith(function(elem) {
      var now = new Date();
      return parseInt(elem.textContent, 10) === now.getMinutes() % 10;
    }));

    var secondsTens = element.findElement('#seconds-tens-digit');
    assert.ok(secondsTens.scriptWith(function(elem) {
      var now = new Date();
      return parseInt(elem.textContent, 10) ===
             Math.floor(now.getSeconds() / 10);
    }));

    var secondsUnits = element.findElement('#seconds-units-digit');
    assert.ok(secondsUnits.scriptWith(function(elem) {
      var now = new Date();
      return parseInt(elem.textContent, 10) === now.getSeconds() % 10;
    }));
  });

  test('Should display the month, date and weekday info',
       { devices: ['tv'] }, function () {
    var element = client.helper.waitForElement('body');

    var today = element.findElement('#today-is');
    assert.ok(today.scriptWith(function(elem) {
      var weekday = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      ];

      var month = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ];
      var now = new Date();
      var dateString = 'Today is ' + weekday[now.getDay()] + ', ' +
        month[now.getMonth()] + ' ' + now.getDate();
      return elem.textContent === dateString;
    }));
  });

});
