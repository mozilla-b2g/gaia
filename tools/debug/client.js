
try {
var server = "ws://localhost:6789/";
var ws = new WebSocket(server)
ws.onopen = function ws_open() {
  dump('client: opened: ' + ws.readyState + '\n');
  ws.send('test');
};

ws.onclose = function ws_close() {
  dump('client: closed: ' + ws.readyState + '\n');
};

ws.onerror = function ws_error(evt) {
  dump('client: error: \n');
  dump(evt.message);
  dump('\n');
};

ws.onmessage = function ws_message(msg) {
  dump('client: message: ' + msg.data + '\n');
};


for (var method in console) {
  switch (method) {
    case 'dir':
    case 'group':
    case 'groupCollapsed':
    case 'groupEnd':
    case 'log':
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
    case 'trace':
    case 'time':
    case 'timeEnd':
      break;
  }
}
} catch (e) {
  dump(e);
  dump('\n');
}
