'use strict';
var fs = require('fs');

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function SettingsApi(client) {
  this._client = client;
}

/**
 * Get a setting
 *
 * @param {String} name of the setting.
 * @return {String} value of the setting.
 */
SettingsApi.prototype.get = function(name) {
  var script = fs.readFileSync(
    __dirname + '/lib/scripts/getsetting.js',
    'utf8'
  );

  var result = this._client.executeAsyncScript(script, [name]);

  if (result.error) {
    throw new Error(result.error);
  }

  return result.value;
};

/**
 * Set a setting
 *
 * @param {String} name of the setting.
 * @param {String} value of the setting.
 */
SettingsApi.prototype.set = function(name, value) {
  var script = fs.readFileSync(
    __dirname + '/lib/scripts/setsetting.js',
    'utf8'
  );

  var result = this._client.executeAsyncScript(script, [name, value]);

  if (result.error) {
    throw new Error(result.error);
  }

};


module.exports = function(client) {
  return new SettingsApi(client);
};
