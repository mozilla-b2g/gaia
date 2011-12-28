
(function() {
  var debug = false;
  function log(str) {
    if (!debug)
      return;
    dump('Console Gaia: ' + str + '\n');
  };

  try {
    var server = "ws://localhost:6789/";
    var ws = new WebSocket(server)
    ws.onopen = function ws_open() {
      log('websocket opened');
    };

    ws.onclose = function ws_close() {
      log('websocket closed');
    };

    ws.onerror = function ws_error(evt) {
      log('websocket error: ' + evt.data);
    };

    ws.onmessage = function ws_message(msg) {
      log('websocket message: ' + evt.data);
    };

    // Override the 'console' methods
    var methods = ['log', 'debug', 'info', 'warn', 'error',
                   'time', 'timeEnd',
                   'group', 'groupCollapsed', 'groupEnd'];
    methods.forEach(function(method) {
      console[method] = function() {
        var json = {
          "type": method,
          "arguments": arguments
        };

        ws.send(JSON.stringify(json));
      };
    });

    // console.trace could be implemented by looping over the caller
    // stack and sending a json object summarizing it and displayed
    // via console.log.
    // It will be the same as console.trace from the web console
    // but this should be enought for simple debugging purpose.
    //
    // To access the caller: arguments.callee.caller.caller;
    // (this does not work in strict mode...)
    console['trace'] = function() {
      console.warn('console.trace is not implemented');
    };

    // Similarly to console.trace it can be implemented by iterating
    // over the property of the object and summarizing the result as
    // a JSON object displayed via console.log.
    console['dir'] = function() {
      console.warn('console.dir is not implemented');
    };
  } catch (e) {
    dump(e + '\n');
  }
})()

