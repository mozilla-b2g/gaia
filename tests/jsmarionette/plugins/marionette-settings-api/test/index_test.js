'use strict';
var assert = require('assert');

marionette('public interface', function() {
  var skipError = require('./support/skip_error');
  var client = marionette.client();
  marionette.plugin('SettingsAPI', require('../index'));

  skipError(client);

  suite('#getSetting', function() {
    test('should get single setting', function() {
      var value = client.SettingsAPI.get('language.current');
      assert(value.length > 0);
    });
  });

  suite('#setSetting', function() {
    test('should set single setting', function() {
      var startValue = client.SettingsAPI.get('accessibility.screenreader');
      client.SettingsAPI.set('accessibility.screenreader', !startValue);
      var newValue = client.SettingsAPI.get('accessibility.screenreader');
      assert.notEqual(startValue, newValue);
    });
  });

});
