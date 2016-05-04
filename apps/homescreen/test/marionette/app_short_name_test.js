/* global __dirname */
'use strict';

var assert = require('assert');

marionette('Homescreen - App manifest', function() {
  var manifestName = 'shortnameapp';
  var manifestUrl = 'chrome://gaia/content/' +
                    manifestName +
                    '/manifest.webapp';

  var clientOptions = require(__dirname + '/client_options.js');
  clientOptions.apps = {};
  clientOptions.apps[manifestName] = __dirname + '/fixtures/short_name_app';
  var client = marionette.client({ profile: clientOptions });

  var home, system;

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    client.apps.launch(home.URL);
  });

  test('short_name', function() {
    assert.equal(home.getIconText(home.getIcon(manifestUrl)), 'Short name');
  });
});

