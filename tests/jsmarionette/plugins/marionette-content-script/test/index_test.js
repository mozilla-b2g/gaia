'use strict';
var assert = require('assert');

marionette('index', function() {
  var CLOCK_APP = 'app://clock.gaiamobile.org';
  var CALENDAR_APP = 'app://calendar.gaiamobile.org';

  marionette.plugin('apps', require('marionette-apps'));
  marionette.plugin('contentScript', require('../'));

  var client = marionette.client();

  suite('#inject', function() {
    setup(function() {
      client.contentScript.inject(__dirname + '/fixtures/load_everywhere.js');
      client.apps.launch(CLOCK_APP);
      client.apps.switchToApp(CLOCK_APP);
    });

    function getCustomProperty() {
      return client.executeScript(function() {
        return window.wrappedJSObject.navigator.I_AM_HACKED;
      });
    }

    function updatesCustomProperty(message) {
      var expectedValue = 'UNIQUE';
      assert.equal(
        getCustomProperty(),
        expectedValue,
        message
      );
    }

    test('in a single app', function() {
      updatesCustomProperty('I_AM_HACKED is exposed');
    });

    test('multiple apps', function() {
      // back to root frame
      client.switchToFrame();
      // so we can launch another app
      client.apps.launch(CALENDAR_APP);
      client.apps.switchToApp(CALENDAR_APP);

      updatesCustomProperty('I_AM_HACKED is exposed');
    });

    suite('system app', function() {
      setup(function() {
        // go to system app
        client.switchToFrame();
      });

      test('system app is not modified ', function() {
        // sanity check
        assert.ok(!getCustomProperty(), 'system app is not modified');
      });

      test('next reload of system app will be modified', function() {
        // reload!
        client.goUrl(client.getUrl());

        updatesCustomProperty();
      });
    });
  });

});
