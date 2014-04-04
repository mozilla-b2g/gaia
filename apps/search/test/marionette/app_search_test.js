'use strict';

var Search = require('./lib/search');
var Calendar = require('../../../calendar/test/marionette/calendar');

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

  test('search app with entry point', function() {
    search.doSearch('phone');

    search.goToResults();

    search.checkResult('firstApp', 'Phone');

    search.goToApp('app://communications.gaiamobile.org', 'dialer');
  });

});
