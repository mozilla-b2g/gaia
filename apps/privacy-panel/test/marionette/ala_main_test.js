'use strict';

var assert = require('assert');
var AlaMainPanel = require('./lib/panels/ala_main');

marionette('adjustable location accuracy panel', function() {
  var client = marionette.client({
    profile: {
      settings: {
        'privacy-panel-gt-complete': true,
        'geolocation.enabled': false,
        'ala.settings.enabled': false,
        'geolocation.type': 'no-location'
      }
    }
  });
  var subject;

  setup(function() {
    subject = new AlaMainPanel(client);
    subject.init();
  });

  test('ability to set geolocation and location adjustment', function() {
    var useLocationBlurBox = client.findElement('.show-when-geolocation-on');
    var geolocationTypeBox = client.findElement('.geolocation-type-box');
    var description1 = client.findElement('.hide-when-ala-on');
    var description2 = client.findElement('.show-when-ala-on .description');
    var addExceptionBox = client.findElement('.add-exception-box');
    var typeBlur = client.findElement('.type-blur');
    var typeCustom = client.findElement('.type-custom-location');
    var geolocationSwitcher = client.findElement(
      'span[data-l10n-id="geolocation"]');
    var alaSwitcher = client.findElement(
      'span[data-l10n-id="location-adjustment"]');

    assert.ok(!useLocationBlurBox.displayed());


    // turn geolocation on
    geolocationSwitcher.tap();
    client.waitFor(function() {
      return useLocationBlurBox.displayed();
    });
    assert.ok(description1.displayed());
    assert.ok(!description2.displayed());


    // turn location adjustment on
    alaSwitcher.click();
    client.waitFor(function() {
      return geolocationTypeBox.displayed();
    });
    assert.ok(!description1.displayed());
    assert.ok(description2.displayed());
    assert.ok(!typeBlur.displayed());
    assert.ok(!typeCustom.displayed());


    /**@todo: test select values change */


    // turn geolocation off
    geolocationSwitcher.click();
    client.waitFor(function() {
      return !useLocationBlurBox.displayed();
    });
    assert.ok(!geolocationTypeBox.displayed());


    // turn geolocation on
    geolocationSwitcher.click();
    client.waitFor(function() {
      return useLocationBlurBox.displayed();
    });
    assert.ok(geolocationTypeBox.displayed());


    // turn location adjustment off
    alaSwitcher.click();
    client.waitFor(function() {
      return !geolocationTypeBox.displayed();
    });
    assert.ok(description1.displayed());
    assert.ok(!description2.displayed());
    assert.ok(!typeBlur.displayed());
    assert.ok(!typeCustom.displayed());
    assert.ok(!addExceptionBox.displayed());


    // turn geolocation off
    geolocationSwitcher.click();
    client.waitFor(function() {
      return !useLocationBlurBox.displayed();
    });
  });
});
