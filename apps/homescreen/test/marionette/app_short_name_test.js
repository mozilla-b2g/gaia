/* global __dirname */
'use strict';

var assert = require('assert');

marionette('Homescreen - App manifest', function() {
  var manifestName = 'shortnameapp.gaiamobile.org';
  var manifestUrl = 'app://' + manifestName + '/manifest.webapp';

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
    home.waitForLaunch();
  });

  test('short_name', function() {
    assert.equal(home.getIconText(home.getIcon(manifestUrl)), 'Short name');
  });
});

