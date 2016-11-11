
let Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");

let GAIA_PREF_NAME = 'gaia.debug.webSocket';

let socket = null;

var ConsoleAPI = {
  observe: function(subject, topic, data) {
    if (!socket)
      return;

    let message = subject.wrappedJSObject;
    // do not re-enter the loop
    if (message.filename == 'chrome://gaia/content/console.js')
      return;

    //XXX do a special path for the 'trace' command 
    var json = {
      "type": message.level.toString(),
      "arguments": message.arguments,
      "filename": message.filename,
      "lineNumber": message.lineNumber,
      "functionName" : message.functionName
    };
    socket.send(JSON.stringify(json));
  }
};

try {
  if (!Services.prefs.getBoolPref(GAIA_PREF_NAME, false)) {
    Services.prefs.setBoolPref(GAIA_PREF_NAME, true);
    window.addEventListener('unload', function() {
      Services.prefs.setBoolPref(GAIA_PREF_NAME, false);
    });

    Services.obs.addObserver(ConsoleAPI, 'console-api-log-event', false);
    messageManager.loadFrameScript('chrome://gaia-client/content/content.js', true);

    createWebSocket('ws://localhost:6789');
  }
} catch(e) {
  dump(e + '\n');
}

let debug = false;
function log(str) {
  if (!debug)
    return;

  dump('Console Gaia: ' + str + '\n');
};

function createWebSocket(server) {
  window.setInterval(function () {
    if (socket)
      return;

    socket = new WebSocket(server)

    log('looking for a server to connect to...');
    socket.onopen = function ws_open() {
      log('websocket opened');
    };

    socket.onclose = function ws_close() {
      log('websocket closed');
      socket = null;
    };

    socket.onerror = function ws_error(evt) {
      log('websocket error');
      socket = null;
    };

    socket.onmessage = function ws_message(msg) {
      log('websocket message: ' + msg.data);
      let json = JSON.parse(msg.data);
      messageManager.sendAsyncMessage('gaia_exec', json);
    };
  }, 2000);
}

messageManager.addMessageListener('gaia_exec:reply', function (msg) {
  if (!socket)
    return;

  socket.send(JSON.stringify(msg.json));
});

