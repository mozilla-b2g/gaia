'use strict';
var Base = require('../base');

/**
 * Abstraction around settings display panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function DisplayPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, DisplayPanel.Selectors);

}

module.exports = DisplayPanel;

DisplayPanel.Selectors = {
  'wallpaper': '#wallpaper',
  'lockOrientationCheckbox': '#display input[name="screen.orientation.lock"]',
  'lockOrientationSpan':
    '#display input[name="screen.orientation.lock"] ~ span',
  'autoBrightnessItem': '#brightness-auto',
  'autoBrightnessCheckbox':
    '#display input[name="screen.automatic-brightness"]',
  'autoBrightnessSpan':
    '#display input[name="screen.automatic-brightness"] ~ span',
  'manualBrightnessItem': '#brightness-manual',
  'screenTimeoutSelectorItem': '#screen-timeout',
  'screenTimeoutSelector': '#screen-timeout select'
};

DisplayPanel.prototype = {

  __proto__: Base.prototype,

  get isLockOrientationChecked() {
    return !!this.findElement('lockOrientationCheckbox')
      .getAttribute('checked');
  },

  get isAutoBrightnessChecked() {
    return !!this.findElement('autoBrightnessCheckbox').getAttribute('checked');
  },

  get isAutoBrightnessItemVisible() {
    return this.findElement('autoBrightnessItem').displayed();
  },

  get isBrightnessManualItemVisible() {
    return this.findElement('manualBrightnessItem').displayed();
  },

  get autoBrightnessSetting() {
    return this.client.settings.get('screen.automatic-brightness');
  },

  get screenOrientationSetting() {
    return this.client.settings.get('screen.orientation.lock');
  },

  get screenTimeoutSetting() {
    return this.client.settings.get('screen.timeout');
  },

  tapLockOrientationCheckbox: function() {
    this.waitForElement('lockOrientationSpan').tap();
  },

  tapWallpaper: function() {
    this.waitForElement('wallpaper').tap();
  },

  tapAutoBrightnessCheckbox: function() {
    this.waitForElement('autoBrightnessSpan').tap();
  },

  tapScreenTimeoutSelector: function() {
    this.waitForElement('screenTimeoutSelectorItem').tap();
  },

  tapScreenTimeoutSelectOption: function(optionText) {
    this.tapSelectOption('screenTimeoutSelector', optionText);
  }

};
