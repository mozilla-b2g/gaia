'use strict';

var Ftu = require('../lib/ftu');

marionette('First Time Use >', function() {
  var ftu;
  var client = marionette.client(Ftu.clientOptions);

  setup(function() {
    ftu = new Ftu(client);
  });

  test('FTU comes up on profile generation', function() {
    client.apps.switchToApp(Ftu.URL);
  });

  test('FTU click thru', function() {
    client.apps.switchToApp(Ftu.URL);
    ftu.clickThruPanel('#languages', '#forward');
    ftu.clickThruPanel('#wifi', '#forward');
    ftu.clickThruPanel('#date_and_time', '#forward');
    ftu.clickThruPanel('#geolocation', '#forward');
    ftu.clickThruPanel('#import_contacts', '#forward');
    ftu.clickThruPanel('#firefox_accounts', '#forward');
    ftu.clickThruPanel('#welcome_browser', '#forward');
    ftu.clickThruPanel('#browser_privacy', '#forward');
    ftu.clickThruPanel('#finish-screen', undefined);
  });

});
