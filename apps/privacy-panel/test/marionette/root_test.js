'use strict';

var assert = require('assert');
var PRIVACYPANEL_TEST_APP = 'app://privacy-panel.gaiamobile.org';

marionette('check main page', function() {
  var client = marionette.client({
    settings: {
      'lockscreen.enabled': false
    }
  });

  setup(function() {
    client.apps.launch(PRIVACYPANEL_TEST_APP);
    client.apps.switchToApp(PRIVACYPANEL_TEST_APP);
    client.helper.waitForElement('body');
  });

  test('root page elements', function() {
    var menuItems = client.findElements('#root li');
    assert.ok(menuItems.length === 3);
  });

  test('ability to load ala panel', function() {
    var alaMenuItem = client.findElement('#menu-item-ala');
    var alaPanel = client.findElement('#ala-main');
    alaMenuItem.click();
    assert.ok(alaPanel.displayed());
  });

  test('ability to load rpp panel', function() {
    var rppMenuItem = client.findElement('#menu-item-rpp');
    var rppPanel = client.findElement('#rpp-main');
    rppMenuItem.click();
    assert.ok(rppPanel.displayed());
  });

  test('ability to load guided tour panel', function() {
    var gtMenuItem = client.findElement('#menu-item-gt');
    var gtPanel = client.findElement('#gt-main');
    gtMenuItem.click();
    assert.ok(gtPanel.displayed());
  });
});
