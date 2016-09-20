/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var Settings = require('/Users/alacroix/Projects/gaia/apps/settings/test/marionette/app/app');

marionette('Repeat', function() {

  var client = marionette.client();
  var settingsApp;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
  });

  suite('Repeat suite', function() {
    for (var i = 0; i < 50; i++) {
      test(i, function() {});
    }
  });
});
