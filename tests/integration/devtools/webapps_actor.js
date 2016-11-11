'use strict';
var assert = require('assert');
var fs = require('fs');
var System = require('../../../apps/system/test/marionette/lib/system');

marionette('Dev Tools server', function() {

  var client = marionette.client({
    prefs: {
      'devtools.debugger.prompt-connection': false,
      'devtools.debugger.forbid-certified-apps': false,
      'devtools.debugger.unix-domain-socket': '6080'
    },
    settings: {
      'debugger.remote-mode': 'adb-devtools',
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var contentClient = client;
  client = client.scope({ context: 'chrome' });

  setup(function() {
    var system = new System(contentClient);
    system.waitForStartup();
  });

  test('devtools are turned on', function () {
    var remoteMode = client.settings.get('debugger.remote-mode');
    assert.equal(remoteMode, 'adb-devtools', 'Remote mode setting verified');
  });

  test('execute and assert gecko code', function() {
    // Initalize gecko code and register gecko tests
    // (This is just a workaround to be able to execute assertions
    // from a code executed within gecko)
    var testPath = './tests/integration/devtools/actor_helper.js';
    var testSources = fs.readFileSync(testPath, {encoding:'utf8'});
    client.executeAsyncScript(testSources);
    while(true) {
      // Run next test
      var r = client.executeAsyncScript('nextTest(marionetteScriptFinished);');
      if (r === 'done') {
        break;
      }
      r.forEach(function (a, j) {
        assert[a[0]].apply(assert, a.slice(1));
      });
    }
  });
});
