var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate hotspot wifi settings', function() {
  var client = marionette.client();
  var settingsApp;
  var hotspotPanel;
  var hotspotSettingsPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the Hotspot Settings menu
    hotspotPanel = settingsApp.hotspotPanel;
    hotspotSettingsPanel = settingsApp.hotspotSettingsPanel;
  });

  test('resets settings for second load', function() {
    var defaultSsid = hotspotSettingsPanel.ssid;

    assert.ok(
      defaultSsid,
      'ssid is provided by default'
    );

    hotspotSettingsPanel.ssid = 'Updated SSID ' + Date.now();

    hotspotSettingsPanel.back();

    hotspotSettingsPanel = settingsApp.hotspotSettingsPanel;

    assert.equal(
      defaultSsid,
      hotspotSettingsPanel.ssid,
      'ssid is reset to setting'
    );
  });

});
