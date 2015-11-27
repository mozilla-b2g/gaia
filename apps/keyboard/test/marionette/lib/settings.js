'use strict';

var Base = require('./base');


function Settings(client) {
  Base.call(this, client, Settings.ORIGIN, Settings.Selectors);
}

module.exports = Settings;

Settings.ORIGIN = 'app://settings.gaiamobile.org';
Settings.Selectors = {};

Settings.prototype = {
  __proto__: Base.prototype
};
