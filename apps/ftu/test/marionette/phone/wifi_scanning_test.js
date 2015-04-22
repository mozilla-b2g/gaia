'use strict';

var Ftu = require('../lib/ftu');

marionette('First Time Use > Wifi Scanning Test', function() {
  var ftu;
  var client = marionette.client(Ftu.clientOptions);

  setup(function() {
    ftu = new Ftu(client);
  });

  test('FTU Wifi Scanning Tests', function() {
    client.apps.switchToApp(Ftu.URL);
    ftu.clickThruPanel('#languages', '#forward');
    ftu.clickThruPanel('#wifi', '#forward');
    ftu.clickThruPanel('#date_and_time', '#back');
    ftu.clickThruPanel('#wifi', undefined);
  });
});
