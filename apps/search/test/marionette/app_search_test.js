var Search = require('./lib/search');
var Calendar = require('../../../calendar/test/marionette/calendar');
var assert = require('assert');

marionette('app search', function() {
  var client = marionette.client(Search.ClientOptions);

  var search;

  setup(function() {
    search = new Search(client);
  });

  test('able to search apps from rocketbar', function() {
    search.doSearch('calendar');

    search.goToResults();

    search.checkResult('firstApp', 'Calendar');

    search.goToApp(Calendar.ORIGIN);
  });

});
