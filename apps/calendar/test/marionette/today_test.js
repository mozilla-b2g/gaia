// var Calendar = require('./calendar'),
//     assert = require('assert'),
//     moment = require('moment');

// const DATE_FORMAT = 'YYYY-MM-DD';

// marionette('today item', function() {
//   var client = marionette.client({
//         settings: { 'keyboard.ftu.enabled': false }
//       }),
//       app = null;

//   setup(function() {
//     app = new Calendar(client);
//     app.launch(true);
//   });

//   test.skip('should highlight today item in month view', function() {
//     var currentMonthYearHeader = app.findElement('monthYearHeader')
//                                     .getAttribute('data-date'),
//         currentDate = app.findElement('monthViewpresent')
//                          .findElement('.day').text(),
//         expectedDate = new Date();

//     assert.deepEqual(currentDate, expectedDate.getDate());
//     assert.deepEqual(
//       moment(currentMonthYearHeader).format(DATE_FORMAT),
//       moment(expectedDate).format(DATE_FORMAT)
//     );
//   });

//   test('should back to today', function() {
//     var currentMonthYearHeader = '',
//         selectedDate = '',
//         expectedDate = new Date();

//     app.swipe();
//     app.findElement('todayTabItem').click();
//     currentMonthYearHeader = app.findElement('monthYearHeader')
//                                 .getAttribute('data-date');
//     selectedDate = app.findElement('monthViewselected')
//                       .findElement('.day').text();

//     assert.deepEqual(selectedDate, expectedDate.getDate());
//     assert.deepEqual(
//       moment(currentMonthYearHeader).format(DATE_FORMAT),
//       moment(expectedDate).format(DATE_FORMAT)
//     );
//   });
// });
