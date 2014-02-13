/* jshint node: true */
'use strict';

marionette('First Time Use >', function() {
  var assert = require('assert');
  var FTU = require('./lib/ftu_test_lib').FTU;
  var client = marionette.client();
  var ftu = new FTU(client);

  test('FTU comes up on profile generation', function() {
    ftu.waitForFTU();
  });

  test('FTU click thru', function() {
    ftu.waitForFTU();
    ftu.clickThruPanel('#languages', '#forward');
    ftu.clickThruPanel('#wifi', '#forward');
    ftu.clickThruPanel('#date_and_time', '#forward');
    ftu.clickThruPanel('#geolocation', '#forward');
    ftu.clickThruPanel('#import_contacts', '#forward');
    ftu.clickThruPanel('#welcome_browser', '#forward');
    ftu.clickThruPanel('#browser_privacy', '#forward');
    ftu.clickThruPanel('#finish-screen', undefined);
  });

  test('FTU Wifi Scanning Tests', function() {
    ftu.waitForFTU();
    ftu.clickThruPanel('#languages', '#forward');
    ftu.clickThruPanel('#wifi', '#forward');
    ftu.clickThruPanel('#date_and_time', '#back');
    ftu.clickThruPanel('#wifi', undefined);
  });

});
