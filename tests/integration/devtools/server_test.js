'use strict';
/* global Cu, DebuggerServer, marionette, require, setup, test */
var assert = require('assert');

marionette('Dev Tools server', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'devtools.debugger.prompt-connection': false,
        'devtools.debugger.forbid-certified-apps': false,
        'devtools.debugger.unix-domain-socket': '6080'
      },
      settings: {
        'debugger.remote-mode': 'adb-devtools'
      }
    }
  });
  client = client.scope({ context: 'chrome' });

  setup(function() {
    var remoteMode = client.settings.get('debugger.remote-mode');
    assert.equal(remoteMode, 'adb-devtools', 'Remote mode setting verified');
  });

  test('is running and listening', function() {
    var debuggerServerInited = client.executeScript(function() {
      Cu.import('resource://gre/modules/devtools/dbg-server.jsm');
      return DebuggerServer.initialized;
    });
    assert.ok(debuggerServerInited, 'Debugger server initialized');
    var debuggerServerSockets = client.executeScript(function() {
      Cu.import('resource://gre/modules/devtools/dbg-server.jsm');
      return DebuggerServer.listeningSockets;
    });
    assert.equal(debuggerServerSockets, 1, 'Debugger server listening');
  });

});
