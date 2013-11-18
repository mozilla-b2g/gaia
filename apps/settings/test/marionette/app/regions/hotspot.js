var Base = require('../base');

/**
 * Abstraction around settings hotspot panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function HotspotPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, HotspotPanel.Selectors);

}

module.exports = HotspotPanel;

HotspotPanel.Selectors = {
};

HotspotPanel.prototype = {

  __proto__: Base.prototype

};
