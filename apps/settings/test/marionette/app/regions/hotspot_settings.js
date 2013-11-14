var Base = require('../base');

/**
 * Abstraction around hotspot settings panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function HotspotSettingsPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, HotspotSettingsPanel.Selectors);

}

module.exports = HotspotSettingsPanel;

HotspotSettingsPanel.Selectors = {
  'body': 'body',
  'hotspotSettingsPanel': '#hotspot-wifiSettings',
  'hotspotSettingsNetworkName': 'input[data-setting="tethering.wifi.ssid"]',
  'hotspotSettingsBack': '#hotspot-wifiSettings button[type="reset"]'
};

HotspotSettingsPanel.prototype = {

  __proto__: Base.prototype,

  get ssid() {
    return this.findElement('hotspotSettingsNetworkName')
      .getAttribute('value');
  },

  set ssid(value) {
    return this.findElement('hotspotSettingsNetworkName')
      .sendKeys(value);
  },

  back: function() {
    var parentSection = this.waitForElement('hotspotSettingsPanel');
    this.findElement('hotspotSettingsBack').tap();

    var bodyWidth = this.findElement('body').size().width;
    this.client.waitFor(function() {
      return parentSection.location()['x'] >= bodyWidth;
    });
  }

};
