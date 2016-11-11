var CALENDAR_ORIGIN = 'app://calendar.gaiamobile.org';

var MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

marionette('today date test', function() {
  var assert = require('assert');
  var client = marionette.client();

  setup(function() {
    client.apps.launch(CALENDAR_ORIGIN);
    client.apps.switchToApp(CALENDAR_ORIGIN);
  });

  test('check today date on agenda view', function() {
    var query = '#current-month-year';
    var element = client.findElement(query);

    client.waitFor(function() {
      return element.displayed();
    });

    var actualResult = element.text();

    var todayDate = new Date();
    var month = MONTHS[todayDate.getMonth()];
    var year = todayDate.getYear() + 1900;

    var expectedResult = month + ' ' + year;

    assert.equal(actualResult, expectedResult);
  });

});

