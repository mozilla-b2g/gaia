'use strict';

Cu.import('resource://gre/modules/devtools/dbg-server.jsm');
Cu.import('resource://gre/modules/devtools/dbg-client.jsm');
const {devtools} = Cu.import('resource://gre/modules/devtools/Loader.jsm', {});
const {require} = devtools;
const {AppActorFront} = require('devtools/app-actor-front');

let client = new DebuggerClient(DebuggerServer.connectPipe());

let front;

let events = [];
function listener(type, app) {
  events.push({type: type, app: app});
}

// Start a local connection and retrieve the webapps actor
client.connect(function () {
  client.listTabs(function(resp) {
    front = new AppActorFront(client, resp);
    front.watchApps(listener)
         .then(() => {
           marionetteScriptFinished();
         });
  });
});

let tests = [
  function (onDone) {
    // Got at least multiple appOpen on register,
    // one per already opened app
    assert('ok', events.length > 0, 'get appOpen on connection');

    // If we register another listener, we get same appOpen events
    let count = 0;
    function listener2() count++;
    front.watchApps(listener2)
         .then(function () {
           assert('equal', events.length, count,
                  'get appOpen on next calls to watchApps');
           front.unwatchApps(listener2);
           onDone();
         });
  },
  function (onDone) {
    assert('ok', front.runningApps.size> 0, 'runningApps is non-empty');
    assert('ok', front.apps.size > front.runningApps.size,
           'apps is non-empty');
    onDone();
  },
  function (onDone) {
    events = [];
    let manifestURL;
    function check(type, app) {
      if (type == 'appOpen' && app.manifest.manifestURL == manifestURL) {
        assert('equal', events.length, 1, 'got appOpen for clock app being opened');
        assert('equal', events[0].type, 'appOpen', 'appOpen.type is correct');
        assert('equal', events[0].app.manifest.manifestURL, manifestURL,
               'appOpen.app looks good');
        app.getForm()
           .then(form => {
             assert('ok', 'consoleActor' in form, 'console actor is set');
             front.unwatchApps(check);
             onDone();
           });
      }
    }
    // Launch the clock app and expects appOpen to fire
    var req = navigator.mozApps.mgmt.getAll();
    req.onsuccess = function(evt) {
      var result = evt.target.result;
      for (let app of evt.target.result) {
        if (app.manifestURL.indexOf('clock') != -1) {
          manifestURL = app.manifestURL;
          front.watchApps(check);
          app.launch();
          break;
        }
      }
    };
  }
];

// Tests helpers
let asserts = [];
function assert() {
  asserts.push(Array.slice(arguments));
}
function nextTest(onDone) {
  let f = tests.shift();
  if (f) {
    f(function () {
      onDone(asserts);
      asserts = [];
    });
  } else {
    onDone('done');
  }
}

// We have to bind `nextTest` on the window in order
// to be able to call it on next executeAsyncScript calls...
window.nextTest = nextTest;

