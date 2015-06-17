'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('settings', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch();
  });

  test('theme color', function() {
    assert.equal(app.themeColor, '#ff7d14', 'index');
    app.openSettingsView();
    assert.equal(app.themeColor, '#ff7d14', 'settings');
    app.closeSettingsView();
    app.openDayView();
    assert.equal(app.themeColor, '#ff7d14', 'day view');
    app.openAdvancedSettingsView();
    assert.equal(app.themeColor, '#eeeeee', 'advanced settings');
    app.closeAdvancedSettingsView();
    assert.equal(app.themeColor, '#ff7d14', 'settings #2');
    app.closeSettingsView();
    assert.equal(app.themeColor, '#ff7d14', 'day view #2');
  });

});
