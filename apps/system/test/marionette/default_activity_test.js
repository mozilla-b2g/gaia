/* global __dirname */
'use strict';

(function() {
  var Server = require('../../../../shared/test/integration/server');
  var AppInstall = require('./lib/app_install');
  var assert = require('assert');

  var CALLER_APP = 'app://activitycaller.gaiamobile.org';
  var CALLEE_APP = 'app://activitycallee.gaiamobile.org';

  var appInstall,
      system,
      server;

  var setDefaultSelector = '[data-action=set-default-action]';

  marionette('Triggering activity shows Set As Default option >', function() {
    var client = marionette.client({
      profile: {
        apps: {
          'activitycaller.gaiamobile.org': __dirname +
                                           '/../apps/activitycaller',
          'activitycallee.gaiamobile.org': __dirname + '/../apps/activitycallee'
        }
      }
    });

    function getDisplayAppOrigin() {
      return client.executeScript(function() {
        var app = window.wrappedJSObject.Service.currentApp;
        return app.getTopMostWindow().origin;
      });
    }

    suiteSetup(function(done) {
      var appToInstall = __dirname + '/../apps/fakeinstalledapp/';
      Server.create(appToInstall, function(err, _server) {
        server = _server;
        done();
      });
    });

    suiteTeardown(function() {
      server.stop();
    });

    setup(function() {
      appInstall = new AppInstall(client);
      system = client.loader.getAppClass('system');
      system.waitForStartup();
    });

    test('Default Activity chosen >', function() {
      client.apps.launch(CALLER_APP);

      // Try to launch CALLEE from CALLER
      client.apps.switchToApp(CALLER_APP);
      client.findElement('#testdefaultactivity').click();
      client.switchToFrame();

      // Check that app choice appear, showing default activity checkbox
      system.waitForActivityMenu();
      var checkbox = client.findElement(setDefaultSelector);
      assert.ok(checkbox.displayed);

      // Activate 'Use as default' for the future
      checkbox.click();

      // Launch CALLEE from the selection
      var selector = '[data-manifest="' + CALLEE_APP + '/manifest.webapp"]';
      client.findElement(selector).click();

      client.switchToFrame();

      // Check that CALLEE is open
      assert.equal(getDisplayAppOrigin(), CALLEE_APP);
      client.apps.switchToApp(CALLEE_APP);
      assert.ok(client.findElement('#default-test').displayed());

      client.apps.close(CALLEE_APP);

      // Try to launch CALLEE from CALLER again
      client.apps.switchToApp(CALLER_APP);
      client.findElement('#testdefaultactivity').click();
      client.switchToFrame();

      // the app choice doesn't appear this time
      try {
        client.findElement(setDefaultSelector);
      } catch (exception) {
        assert(exception.name === 'NoSuchElement');
      }


      // Check that CALLEE is open
      client.apps.switchToApp(CALLEE_APP);
      assert.ok(client.findElement('#default-test').displayed());
    });

    test('Default Activity ignored >', function() {
      client.apps.launch(CALLER_APP);

      // Try to launch CALLEE from CALLER
      client.apps.switchToApp(CALLER_APP);
      client.findElement('#testdefaultactivity').click();
      client.switchToFrame();

      // Check that app choice appear, showing default activity checkbox
      system.waitForActivityMenu();
      var checkbox = client.findElement(setDefaultSelector);
      assert.ok(checkbox.displayed);

      // Don't activate 'Use as default'

      // Launch CALLEE from the selection
      var selector = '[data-manifest="' + CALLEE_APP + '/manifest.webapp"]';
      client.findElement(selector).click();

      // Check that CALLEE is open
      client.apps.switchToApp(CALLEE_APP);
      assert.ok(client.findElement('#default-test').displayed());

      client.apps.close(CALLEE_APP);
      client.switchToFrame();

      // Try to launch CALLEE from CALLER again
      client.apps.switchToApp(CALLER_APP);
      client.findElement('#testdefaultactivity').click();
      client.switchToFrame();

      // the app choice appears again
      checkbox = client.findElement(setDefaultSelector);
      assert.ok(checkbox.displayed);
    });

    test('Reset after new app is installed >', function() {
      client.apps.launch(CALLER_APP);

      // Try to launch CALLEE from CALLER
      client.apps.switchToApp(CALLER_APP);
      client.findElement('#testdefaultactivity').click();
      client.switchToFrame();

      // Check that app choice appear, showing default activity checkbox
      system.waitForActivityMenu();
      var checkbox = client.findElement(setDefaultSelector);
      assert.ok(checkbox.displayed);

      // Activate 'Use as default' for the future
      checkbox.click();

      // Launch CALLEE from the selection
      var selector = '[data-manifest="' + CALLEE_APP + '/manifest.webapp"]';
      client.findElement(selector).click();

      client.switchToFrame();

      // Check that CALLEE is open
      assert.equal(getDisplayAppOrigin(), CALLEE_APP);
      client.apps.switchToApp(CALLEE_APP);
      assert.ok(client.findElement('#default-test').displayed());

      client.apps.close(CALLEE_APP);

      // Try to launch CALLEE from CALLER again
      client.apps.switchToApp(CALLER_APP);
      client.findElement('#testdefaultactivity').click();
      client.switchToFrame();

      // the app choice doesn't appear this time
      try {
        client.findElement(setDefaultSelector);
      } catch (exception) {
        assert(exception.name === 'NoSuchElement');
      }

      // Check that CALLEE is open
      client.apps.switchToApp(CALLEE_APP);
      assert.ok(client.findElement('#default-test').displayed());

      client.apps.close(CALLEE_APP);
      client.apps.close(CALLER_APP);
      // Now we install the new app (with same activity receiver)
      var serverManifestURL = server.url('manifest.webapp');
      appInstall.install(serverManifestURL);

      client.apps.launch(CALLER_APP);
      client.apps.switchToApp(CALLER_APP);
      client.findElement('#testdefaultactivity').click();
      client.switchToFrame();

      // Check that app choice appears again
      checkbox = client.findElement(setDefaultSelector);
      assert.ok(checkbox.displayed);
    });
  });
}());

