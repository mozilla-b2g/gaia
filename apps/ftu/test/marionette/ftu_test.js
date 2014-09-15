'use strict';

var Ftu = require('./lib/ftu');

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
    clickThruPanel('#languages', '#languages .nav-item');
    clickThruPanel('#wifi', '#wifi .forward');
    clickThruPanel('#date_and_time', '#date_and_time .forward');
    clickThruPanel('#geolocation', '#disable-geolocation');
    clickThruPanel('#import_contacts', '#import_contacts .forward');
    clickThruPanel('#firefox_accounts', '#fxa-wo-account li.forward');
    clickThruPanel('#welcome_browser', '#welcome_browser .forward');
    clickThruPanel('#browser_privacy', '#browser_privacy .forward');
    clickThruPanel('#finish-screen', undefined);
  });

  suite('FTU Languages', function() {
    var quickly;

    setup(function() {
      // allow findElement to fail quickly
      quickly = client.scope({ searchTimeout: 50 });
      quickly.helper.client = quickly;
    });

    test('FTU Languages without pseudo localization', function() {
      quickly.settings.set('devtools.qps.enabled', false);
      quickly.apps.switchToApp(FTU);
      quickly.helper.waitForElement('#languages');
      // the input is hidden so we can't use waitForElement
      quickly.findElement('#en-US');
      quickly.helper.waitForElementToDisappear('#qps-ploc');
    });

    test('FTU Languages with pseudo localization', function() {
      quickly.settings.set('devtools.qps.enabled', true);
      quickly.apps.switchToApp(FTU);
      quickly.helper.waitForElement('#languages');
      quickly.findElement('#en-US');
      quickly.findElement('#qps-ploc');
    });
  });

  test('FTU Wifi Scanning Tests', function() {
    client.apps.switchToApp(FTU);
    clickThruPanel('#languages', '#languages .nav-item');
    clickThruPanel('#wifi', '#wifi .forward');
    clickThruPanel('#date_and_time', '#back-button');
    clickThruPanel('#wifi', undefined);
  });

  test('Wi-Fi hidden network password 64 characters', function() {
    client.apps.switchToApp(FTU);
    clickThruPanel('#languages', '#languages .nav-item');
    clickThruPanel('#wifi', '#join-hidden-button');

    var input = client.findElement('#hidden-wifi-password');
    var password = input.getAttribute('value');
    assert.equal(password.length, 0);
    input.sendKeys(wifiPassword64);
    password = input.getAttribute('value');
    assert.equal(password.length, 63);
  });
>>>>>>> Bug 1067462 - Change nav-bar to list navigation
});
