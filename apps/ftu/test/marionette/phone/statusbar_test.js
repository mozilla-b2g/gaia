/* global require */
'use strict';

var Ftu = require('../lib/ftu');

marionette('First Time Use >', function() {

  var client = marionette.client(Ftu.clientOptions);
  var ftu, system;

  setup(function() {
    system = client.loader.getAppClass('system');
    ftu = new Ftu(client);
  });

  test('statusbar icons should be dark', function() {
    client.waitFor(function() {
      return system.statusbar.displayed();
    });
    client.waitFor(function() {
      var className = system.statusbar.scriptWith(function(element) {
        return element.className;
      });
      var index = className.indexOf('light');
      return index > -1;
    });
  });

  test('statusbar icons should change', function() {
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
    client.switchToFrame();
    client.waitFor(function() {
      var className = system.statusbar.scriptWith(function(element) {
        return element.className;
      });
      var index = className.indexOf('light');
      return index <= -1;
    });
  });
});
