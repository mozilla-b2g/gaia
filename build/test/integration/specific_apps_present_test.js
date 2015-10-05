'use strict';

var assert = require('chai').assert;
var path = require('path');
var helper = require('./helper');
var _ = require('lodash');
var AdmZip = require('adm-zip');

suite('Specific apps should be present in given build configuration [Network Require]', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  var REGULAR_APPS = [
    'Phone', 'Messages', 'Contacts', 'Browser', 'Marketplace', 'Camera',
    'Gallery', 'Music', 'Video', 'Settings', 'Clock', 'E-Mail',
    'Calendar', 'Usage'
  ];

  var SPARK_APPS = [
    'Customizer', 'Hackerplace', 'Studio', 'Sharing', 'Webmaker', 'Bugzilla Lite',
    'Facebook', 'Twitter', 'RunWhatsApp (Preview)', 'BuddyUp', 'Notes', 'Calculator',
    'SWOOOP'
  ];

  var ENGINEERING_APPS = [
    'Dev', 'In-app Payment', 'Stage', 'Mochitest', 'Device Storage', 'Geoloc',
    'L20n Example', 'Membuster', 'Test Agent', 'Test Container', 'Test IAC Publisher',
    'Test IAC Subscriber', 'Test OTASP'
  ];

  var MAKE_COMMAND = 'make'
  var SPARK_CONFIG = 'GAIA_DISTRIBUTION_DIR=distros/spark ';
  var PRODUCTION_CONFIG = 'PRODUCTION=1 ';

  var SCENARIOS = [
    // Engineerings apps are not described in any file of the homescreen. These scenarios
    // don't work currently. See bug 1187330 for details
    // {command: MAKE_COMMAND, expectedApps: _.union(REGULAR_APPS, ENGINEERING_APPS)},
    // {command: SPARK_CONFIG + MAKE_COMMAND, expectedApps: _.union(REGULAR_APPS, SPARK_APPS, ENGINEERING_APPS)},
    {command: PRODUCTION_CONFIG + MAKE_COMMAND, expectedApps: _.union(REGULAR_APPS)},
    {command: PRODUCTION_CONFIG + SPARK_CONFIG + MAKE_COMMAND, expectedApps: _.union(REGULAR_APPS, SPARK_APPS)}
  ];

  SCENARIOS.forEach(function(scenario) {
    test(scenario.command, function(done) {
      var cmd = scenario.command;
      helper.exec(cmd, function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        validateHomescreen(scenario.expectedApps);
        done();
      });
    });
  });

  function validateHomescreen(expectedApps) {
    var appZip = new AdmZip(path.join(process.cwd(), 'profile',
      'webapps', 'verticalhome.gaiamobile.org', 'application.zip'));
    var config = JSON.parse(appZip.readAsText(appZip.getEntry('js/init.json')));

    var appList = _.flattenDeep(config.grid);
    appList = appList.filter(_filterCollection).map(_getAppName);

    expectedApps.forEach(function(app) {
      assert.include(appList, app);
    });
  }

  function _filterCollection(appOrCollection) {
    return appOrCollection.name !== undefined;
  }

  function _getAppName(app) {
    return app.name;
  }

});
