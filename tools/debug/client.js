
(function() {
  try {
    var server = getServer();
    if (!server) {
      dump('Please use <script type="application/x-javascript" ' +
           'data-server="ws://myserver.org:port" src="client.js">');
      return;
    }

    var socket = createWebSocket(server);

    remoteMethods(socket);

  } catch (e) {
    dump(e + '\n');
  }


  var debug = true;
  function log(str) {
    if (!debug)
      return;

    dump('Console Gaia: ' + str + '\n');
  };


  function getServer() {
    var scripts = document.scripts;
    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i];
      var server = script.dataset.server;
      if (script.getAttribute('src') != 'client.js' || !server)
        continue;
    
      return server;
    };

    return null;
  }


  function createWebSocket(server) {
    var ws = new WebSocket(server)

    ws.onopen = function ws_open() {
      log('websocket opened');
    };

    ws.onclose = function ws_close() {
      log('websocket closed');
    };

    ws.onerror = function ws_error(evt) {
      log('websocket error');
    };

    ws.onmessage = function ws_message(msg) {
      log('websocket message: ' + msg.data);
      var json = {
        'type': 'reply',
        'rv': ''
      };
      try {
        json.rv = new String(eval(msg.data));
      } catch(e) {
        json.rv = new String(e);
      }
      ws.send(JSON.stringify(json));
    };

    return ws;
  }


  function remoteMethods(socket) {
    var methods = ['log', 'debug', 'info', 'warn', 'error',
                   'time', 'timeEnd',
                   'group', 'groupCollapsed', 'groupEnd'];
    methods.forEach(function(method) {
      console[method] = function() {
        var json = {
          "type": method,
          "arguments": arguments
        };

        socket.send(JSON.stringify(json));
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
  }
})()


//////////////////////////////////////////////////////////////////////////
// JS Completer
//////////////////////////////////////////////////////////////////////////

const STATE_NORMAL = 0;
const STATE_QUOTE = 2;
const STATE_DQUOTE = 3;

const OPEN_BODY = '{[('.split('');
const CLOSE_BODY = '}])'.split('');
const OPEN_CLOSE_BODY = {
  '{': '}',
  '[': ']',
  '(': ')'
};

/**
 * Analyses a given string to find the last statement that is interesting for
 * later completion.
 *
 * @param   string aStr
 *          A string to analyse.
 *
 * @returns object
 *          If there was an error in the string detected, then a object like
 *
 *            { err: "ErrorMesssage" }
 *
 *          is returned, otherwise a object like
 *
 *            {
 *              state: STATE_NORMAL|STATE_QUOTE|STATE_DQUOTE,
 *              startPos: index of where the last statement begins
 *            }
 */
function findCompletionBeginning(aStr)
{
  var bodyStack = [];

  var state = STATE_NORMAL;
  var start = 0;
  var c;
  for (var i = 0; i < aStr.length; i++) {
    c = aStr[i];

    switch (state) {
      // Normal JS state.
      case STATE_NORMAL:
        if (c == '"') {
          state = STATE_DQUOTE;
        }
        else if (c == '\'') {
          state = STATE_QUOTE;
        }
        else if (c == ';') {
          start = i + 1;
        }
        else if (c == ' ') {
          start = i + 1;
        }
        else if (OPEN_BODY.indexOf(c) != -1) {
          bodyStack.push({
            token: c,
            start: start
          });
          start = i + 1;
        }
        else if (CLOSE_BODY.indexOf(c) != -1) {
          var last = bodyStack.pop();
          if (!last || OPEN_CLOSE_BODY[last.token] != c) {
            return {
              err: "syntax error"
            };
          }
          if (c == '}') {
            start = i + 1;
          }
          else {
            start = last.start;
          }
        }
        break;

      // Double quote state > " <
      case STATE_DQUOTE:
        if (c == '\\') {
          i ++;
        }
        else if (c == '\n') {
          return {
            err: "unterminated string literal"
          };
        }
        else if (c == '"') {
          state = STATE_NORMAL;
        }
        break;

      // Single quoate state > ' <
      case STATE_QUOTE:
        if (c == '\\') {
          i ++;
        }
        else if (c == '\n') {
          return {
            err: "unterminated string literal"
          };
          return;
        }
        else if (c == '\'') {
          state = STATE_NORMAL;
        }
        break;
    }
  }

  return {
    state: state,
    startPos: start
  };
}

function JSPropertyProvider(aInputValue)
{
  var obj = window;

  // Analyse the aInputValue and find the beginning of the last part that
  // should be completed.
  var beginning = findCompletionBeginning(aInputValue);

  // There was an error analysing the string.
  if (beginning.err) {
    return null;
  }

  // If the current state is not STATE_NORMAL, then we are inside of an string
  // which means that no completion is possible.
  if (beginning.state != STATE_NORMAL) {
    return null;
  }

  var completionPart = aInputValue.substring(beginning.startPos);

  // Don't complete on just an empty string.
  if (completionPart.trim() == "") {
    return null;
  }

  var properties = completionPart.split('.');
  var matchProp;
  if (properties.length > 1) {
    matchProp = properties.pop().trimLeft();
    for (var i = 0; i < properties.length; i++) {
      var prop = properties[i].trim();

      // If obj is undefined or null, then there is no chance to run completion
      // on it. Exit here.
      if (typeof obj === "undefined" || obj === null) {
        return null;
      }

      // Check if prop is a getter function on obj. Functions can change other
      // stuff so we can't execute them to get the next object. Stop here.
      if (isNonNativeGetter(obj, prop)) {
        return null;
      }
      try {
        obj = obj[prop];
      }
      catch (ex) {
        return null;
      }
    }
  }
  else {
    matchProp = properties[0].trimLeft();
  }

  // If obj is undefined or null, then there is no chance to run
  // completion on it. Exit here.
  if (typeof obj === "undefined" || obj === null) {
    return null;
  }

  // Skip Iterators and Generators.
  if (isIteratorOrGenerator(obj)) {
    return null;
  }

  var matches = [];
  for (var prop in obj) {
    if (prop.indexOf(matchProp) == 0) {
      matches.push(prop);
    }
  }

  matches = matches.sort();
  matches.push(matchProp);
  return matches;
}

function isIteratorOrGenerator(aObject)
{
  if (aObject === null) {
    return false;
  }

  if (typeof aObject == "object") {
    if (typeof aObject.__iterator__ == "function" ||
        aObject.constructor && aObject.constructor.name == "Iterator") {
      return true;
    }

    try {
      var str = aObject.toString();
      if (typeof aObject.next == "function" &&
          str.indexOf("[object Generator") == 0) {
        return true;
      }
    }
    catch (ex) {
      // window.history.next throws in the typeof check above.
      return false;
    }
  }

  return false;
}

function isNonNativeGetter(aObject, aProp) {
  if (typeof aObject != "object") {
    return false;
  }
  var desc;
  while (aObject) {
    try {
      if (desc = Object.getOwnPropertyDescriptor(aObject, aProp)) {
        break;
      }
    }
    catch (ex) {
      // Native getters throw here. See bug 520882.
      if (ex.name == "NS_ERROR_XPC_BAD_CONVERT_JS" ||
          ex.name == "NS_ERROR_XPC_BAD_OP_ON_WN_PROTO") {
        return false;
      }
      throw ex;
    }
    aObject = Object.getPrototypeOf(aObject);
  }
  if (desc && desc.get && !isNativeFunction(desc.get)) {
    return true;
  }
  return false;
}

