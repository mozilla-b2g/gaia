dump('======================= gaia content.js ======================\n');

(function RemoteHUDService() {
  let debug = true;
  function log(str) {
    if (debug)
      dump('RemoteHUDService: ' + str + '\n');
  };

  let Cu = Components.utils;
  let sandbox = null;
  let handler = {
    handleEvent: function(evt) {
      sandbox = new Cu.Sandbox(content, {
        sandboxPrototype: content,
        wantXrays: false
      });
      SandboxHelper(sandbox);
    },

    receiveMessage: function(msg) {
      let json = msg.json;
      let reply = {
        'id': json.id + 1,
        'replyTo': json.id,
        'type': 'reply'
      };

      let input = json.data;
      let result = null;
      try {
        switch (json.type) {
          case 'autocomplete':
            result = JSPropertyProvider(input);
            break;
          case 'inspect':
            result = Cu.evalInSandbox(input, sandbox, '1.8', 'Web Console', 1);

            let output = {};
            let pairs = namesAndValuesOf(unwrap(result));

            pairs.forEach(function(pair) {
              output[pair.name] = {
                'display': pair.display,
                'type': pair.type,
                'value': input + '["' + pair.name + '"]'
              }
            });
            result = JSON.stringify(output);
            break;
          default:
            result = Cu.evalInSandbox(input, sandbox, '1.8', 'Web Console', 1);
            break;
        }
      } catch(e) {
        result = e;
      }

      let type = this._getType(result);
      let data = null;
      let enumerable = false;
      switch (type) {
        case 'function': {
          let pairs = namesAndValuesOf(unwrap(result));
          enumerable = pairs.length;
          data = result.toSource();
          break;
        }
        case 'object': {
          let pairs = namesAndValuesOf(unwrap(result));
          enumerable = pairs.length;
          data = result;
          break;
        }
        default:
          data = result;
          break;
      }

      reply.result = {
        'type': type,
        'data': new String(data),
        'enumerable': enumerable
      };
      sendAsyncMessage('gaia_exec:reply', reply);
    },

    _getType: function getType(obj) {
      let type = obj === null ? "null" : typeof obj;
      if (type == 'object' && obj.constructor && obj.constructor.name)
        type = obj.constructor.name;
      return type.toLowerCase();
    }
  };

  addEventListener('DOMContentLoaded', handler);
  addMessageListener('gaia_exec', handler);
})();

/**
 * Convenience function to unwrap a wrapped object.
 *
 * @param aObject the object to unwrap
 */

function unwrap(aObject)
{
  try {
    return XPCNativeWrapper.unwrap(aObject);
  } catch(e) {
    return aObject;
  }
}

/**
 * SandboxHelper
 *
 * Defines a set of functions ("helper functions") that are available from the
 * WebConsole but not from the webpage.
 * A list of helper functions used by Firebug can be found here:
 *   http://getfirebug.com/wiki/index.php/Command_Line_API
 */
function SandboxHelper(sandbox)
{
  let window = sandbox.window;
  let document = window.document;
  let console = window.console;

  /**
   * Returns the result of document.getElementById(aId).
   *
   * @param string aId
   *        A string that is passed to document.getElementById.
   * @returns nsIDOMNode or null
   */
  sandbox.$ = function SH_$(aId)
  {
    try {
      return document.getElementById(aId);
    }
    catch (ex) {
      console.error(ex.message);
    }
  };

  /**
   * Returns the result of document.querySelectorAll(aSelector).
   *
   * @param string aSelector
   *        A string that is passed to document.querySelectorAll.
   * @returns array of nsIDOMNode
   */
  sandbox.$$ = function SH_$$(aSelector)
  {
    try {
      return document.querySelectorAll(aSelector);
    }
    catch (ex) {
      console.error(ex.message);
    }
  };

  /**
   * Runs a xPath query and returns all matched nodes.
   *
   * @param string aXPath
   *        xPath search query to execute.
   * @param [optional] nsIDOMNode aContext
   *        Context to run the xPath query on. Uses window.document if not set.
   * @returns array of nsIDOMNode
   */
  sandbox.$x = function SH_$x(aXPath, aContext)
  {
    let nodes = [];
    let aContext = aContext || document;

    try {
      let ANY_TYPE = Components.interfaces.nsIDOMXPathResult.ANY_TYPE;
      let results = document.evaluate(aXPath, aContext, null, ANY_TYPE, null);

      let node;
      while (node = results.iterateNext()) {
        nodes.push(node);
      }
    }
    catch (ex) {
      console.error(ex.message);
    }

    return nodes;
  };

  /**
   * Returns the currently selected object in the highlighter.
   *
   * @returns nsIDOMNode or null
   */
  Object.defineProperty(sandbox, "$0", {
    get: function() {
      console.error('Not implemented');
    },
    enumerable: true,
    configurable: false
  });

  /**
   * Clears the output of the JSTerm.
   */
  sandbox.clear = function SH_clear()
  {
    sendAsyncMessage('console', {
      'type': 'command',
      'command': 'clear'
    });
  };

  /**
   * Returns the result of Object.keys(aObject).
   *
   * @param object aObject
   *        Object to return the property names from.
   * @returns array of string
   */
  sandbox.keys = function SH_keys(aObject)
  {
    try {
      return Object.keys(unwrap(aObject));
    }
    catch (ex) {
      console.error(ex.message);
    }
  };

  /**
   * Returns the values of all properties on aObject.
   *
   * @param object aObject
   *        Object to display the values from.
   * @returns array of string
   */
  sandbox.values = function SH_values(aObject)
  {
    let arrValues = [];
    let obj = unwrap(aObject);

    try {
      for (let prop in obj) {
        arrValues.push(obj[prop]);
      }
    }
    catch (ex) {
      console.error(ex.message);
    }
    return arrValues;
  };

  /**
   * Opens a help window in MDC
   */
  sandbox.help = function SH_help()
  {
    sendAsyncMessage('console', {
      'type': 'command',
      'command': 'help',
      'language': window.navigator.language
    });
  };

  /**
   * Inspects the passed aObject. This is done by opening the PropertyPanel.
   *
   * @param object aObject
   *        Object to inspect.
   * @returns void
   */
  sandbox.inspect = function SH_inspect(aObject)
  {
    sendAsyncMessage('console', {
      'type': 'command',
      'command': 'inspect',
      'object': unwrap(aObject) // XXX jsonify it
    });
  };

  sandbox.inspectrules = function SH_inspectrules(aNode)
  {
    sendAsyncMessage('console', {
      'type': 'command',
      'command': 'inspectrules',
      'node': aNode // XXX jsonify it
    });
  }

  /**
   * Prints aObject to the output.
   *
   * @param object aObject
   *        Object to print to the output.
   * @returns void
   */
  sandbox.pprint = function SH_pprint(aObject)
  {
    if (aObject === null || aObject === undefined ||
        aObject === true || aObject === false) {
      // XXX get the string from a .properties
      //HUDService.getStr("helperFuncUnsupportedTypeError");
      console.error('Unsupported Type');
      return;
    }
    else if (typeof aObject === 'function') {
      sendAsyncMessage('console', {
        'type': 'command',
        'command': 'pprint',
        'data': aObject.toString()
      });
      return;
    }

    let output = [];
    let pairs = namesAndValuesOf(unwrap(aObject));

    pairs.forEach(function(pair) {
      output.push("  " + pair.display);
    });

    sendAsyncMessage('console', {
      'type': 'command',
      'command': 'pprint',
      'data': output.join('\n')
    });
  };

  /**
   * Print a string to the output, as-is.
   *
   * @param string aString
   *        A string you want to output.
   * @returns void
   */
  sandbox.print = function SH_print(aString)
  {
    sendAsyncMessage('console', {
      'type': 'command',
      'command': 'print',
      'data': '' + aString
    });
  };
}

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
  var obj = content;

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

/**
 * Tells if the given function is native or not.
 *
 * @param function aFunction
 *        The function you want to check if it is native or not.
 *
 * @return boolean
 *         True if the given function is native, false otherwise.
 */
function isNativeFunction(aFunction)
{
  return typeof aFunction == "function" && !("prototype" in aFunction);
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

const TYPE_OBJECT = 0, TYPE_FUNCTION = 1, TYPE_ARRAY = 2, TYPE_OTHER = 3;

/**
 * Get an array of property name value pairs for the tree.
 *
 * @param object aObject
 *        The object to get properties for.
 * @returns array of object
 *          Objects have the name, value, display, type, children properties.
 */
function namesAndValuesOf(aObject)
{
  let pairs = [];
  let value, presentable;

  let isDOMDocument = aObject instanceof Ci.nsIDOMDocument;

  for (var propName in aObject) {
    // See bug 632275: skip deprecated width and height properties.
    if (isDOMDocument && (propName == "width" || propName == "height")) {
      continue;
    }

    // Also skip non-native getters.
    if (isNonNativeGetter(aObject, propName)) {
      value = ""; // Value is never displayed.
      presentable = {type: TYPE_OTHER, display: "Getter"};
    }
    else {
      try {
        value = aObject[propName];
        presentable = presentableValueFor(value);
      }
      catch (ex) {
        continue;
      }
    }

    let pair = {};
    pair.name = propName;
    pair.display = propName + ": " + presentable.display;
    pair.type = presentable.type;
    pair.value = value;

    // Convert the pair.name to a number for later sorting.
    pair.nameNumber = parseFloat(pair.name)
    if (isNaN(pair.nameNumber)) {
      pair.nameNumber = false;
    }

    pairs.push(pair);
  }

  pairs.sort(function(a, b)
  {
    // Sort numbers.
    if (a.nameNumber !== false && b.nameNumber === false) {
      return -1;
    }
    else if (a.nameNumber === false && b.nameNumber !== false) {
      return 1;
    }
    else if (a.nameNumber !== false && b.nameNumber !== false) {
      return a.nameNumber - b.nameNumber;
    }
    // Sort string.
    else if (a.name < b.name) {
      return -1;
    }
    else if (a.name > b.name) {
      return 1;
    }
    else {
      return 0;
    }
  });

  return pairs;
}

/**
 * Figures out the type of aObject and the string to display in the tree.
 *
 * @param object aObject
 *        The object to operate on.
 * @returns object
 *          A object with the form:
 *            {
 *              type: TYPE_OBJECT || TYPE_FUNCTION || TYPE_ARRAY || TYPE_OTHER,
 *              display: string for displaying the object in the tree
 *            }
 */
function presentableValueFor(aObject)
{
  if (aObject === null || aObject === undefined) {
    return {
      type: TYPE_OTHER,
      display: aObject === undefined ? "undefined" : "null"
    };
  }

  let presentable;
  switch (aObject.constructor && aObject.constructor.name) {
    case "Array":
      return {
        type: TYPE_ARRAY,
        display: "Array"
      };

    case "String":
      return {
        type: TYPE_OTHER,
        display: "\"" + aObject + "\""
      };

    case "Date":
    case "RegExp":
    case "Number":
    case "Boolean":
      return {
        type: TYPE_OTHER,
        display: aObject
      };

    case "Iterator":
      return {
        type: TYPE_OTHER,
        display: "Iterator"
      };

    case "Function":
      presentable = aObject.toString();
      return {
        type: TYPE_FUNCTION,
        display: presentable.substring(0, presentable.indexOf(')') + 1)
      };

    default:
      presentable = aObject.toString();
      let m = /^\[object (\S+)\]/.exec(presentable);

      try {
        if (typeof aObject == "object" && typeof aObject.next == "function" &&
            m && m[1] == "Generator") {
          return {
            type: TYPE_OTHER,
            display: m[1]
          };
        }
      }
      catch (ex) {
        // window.history.next throws in the typeof check above.
        return {
          type: TYPE_OBJECT,
          display: m ? m[1] : "Object"
        };
      }

      if (typeof aObject == "object" && typeof aObject.__iterator__ == "function") {
        return {
          type: TYPE_OTHER,
          display: "Iterator"
        };
      }

      return {
        type: TYPE_OBJECT,
        display: m ? m[1] : "Object"
      };
  }
}

