'use strict';

var Ftu = require('./lib/ftu');
var assert = require('chai').assert;

marionette('First Time Use >', function() {
  var ftu;
  var client = marionette.client({
    profile: Ftu.clientOptions,
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

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

  test('FTU user timing', function() {
    client.apps.switchToApp(Ftu.URL);
    ftu.waitForL10nReady();
    ftu.waitForLanguagesToLoad();
    ftu.client.helper.waitForElement('#languages');

    var markersByName = client.executeScript(function() {
      var byName = {};
      var markers = window.wrappedJSObject.performance.getEntriesByType('mark');
      markers.forEach(function(mark) {
        byName[mark.name] = (byName[mark.name] || 0) + 1;
      });
      return byName;
    });

    console.log('user timing markers:', markersByName);

    assert.ok(markersByName.navigationLoaded);
    assert.ok(markersByName.navigationInteractive);
    assert.ok(markersByName.visuallyLoaded);
    assert.ok(markersByName.contentInteractive);
    assert.ok(markersByName.fullyLoaded);
  });
});
