(function(module, ns) {

  var Element = ns.require('element'),
      Exception = ns.require('error');

  var key;
  var searchMethods = {
    CLASS: 'class name',
    SELECTOR: 'css selector',
    ID: 'id',
    NAME: 'name',
    LINK_TEXT: 'link text',
    PARTIAL_LINK_TEXT: 'partial link text',
    TAG: 'tag name',
    XPATH: 'xpath'
  };

  function isFunction(value) {
    return typeof(value) === 'function';
  }

  /**
   * Initializes client.
   * You must create and initialize
   * a driver and pass it into the client before
   * using the client itself.
   *
   *     // all drivers conform to this api
   *
   *     var driver = new Marionette.Dirver.MozTcp({});
   *     var client;
   *
   *     driver.connect(function(err) {
   *       if (err) {
   *         // handle error case...
   *       }
   *
   *       client = new Marionette.Client(driver, {
   *           // optional default callback can be used to implement
   *           // a generator interface or other non-callback based api.
   *          defaultCallback: function(err, result) {
   *            console.log('CALLBACK GOT:', err, result);
   *          }
   *       });
   *
   *       // by default commands run in a queue.
   *       // assuming there is not a fatal error each command
   *       // will execute sequentially.
   *       client.startSession().
   *              goUrl('http://google.com').
   *              executeScript(function() {
   *                alert(document.title);
   *              });
   *       }
   *     });
   *
   *
   * @class Marionette.Client
   * @constructor
   * @param {Marionette.Drivers.Abstract} driver fully initialized client.
   * @param {Object} options options for driver.
   */
  function Client(driver, options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }
    this.driver = driver;
    this.defaultCallback = options.defaultCallback || false;
  }

  Client.prototype = {

    Element: Element,

    /**
     * Constant for chrome context.
     *
     * @type {String}
     * @property CHROME
     */
    CHROME: 'chrome',

    /**
     * Constant for content context.
     *
     * @type {String}
     * @property CONTENT
     */
    CONTENT: 'content',

    /**
     * Actor id for instance
     *
     * @property actor
     * @type String
     */
    actor: null,

    /**
     * Session id for instance.
     *
     * @property session
     * @type String
     */
    session: null,

    /**
     * Sends a command to the server.
     * Adds additional information like actor and session
     * to command if not present.
     *
     *
     * @method send
     * @chainable
     * @param {Function} cb executed when response is sent.
     */
    send: function send(cmd, cb) {
      if (!cmd.to) {
        cmd.to = this.actor || 'root';
      }

      if (this.session) {
        cmd.session = cmd.session || this.session;
      }

      if (!cb && this.defaultCallback) {
        cb = this.defaultCallback();
      }

      this.driver.send(cmd, cb);

      return this;
    },

    _handleCallback: function() {
      var args = Array.prototype.slice.call(arguments),
          callback = args.shift();

      if (!callback) {
        callback = this.defaultCallback;
      }

      // handle error conversion
      if (args[0]) {
        args[0] = Exception.error(args[0]);
      }

      callback.apply(this, args);
    },

    /**
     * Sends request and formats response.
     *
     *
     * @private
     * @method _sendCommand
     * @chainable
     * @param {Object} command marionette command.
     * @param {String} responseKey the part of the response to pass \
     *                             unto the callback.
     * @param {Object} callback wrapped callback.
     */
    _sendCommand: function(command, responseKey, callback) {
      var self = this;

      this.send(command, function(data) {
        var value = self._transformResultValue(data[responseKey]);
        self._handleCallback(callback, data.error, value);
      });
      return this;
    },

    /**
     * Finds the actor for this instance.
     *
     * @private
     * @method _getActorId
     * @param {Function} callback executed when response is sent.
     */
    _getActorId: function _getActorId(callback) {
      var self = this, cmd;

      cmd = { type: 'getMarionetteID' };

      return this._sendCommand(cmd, 'id', function(err, actor) {
        self.actor = actor;
        if (callback) {
          callback(err, actor);
        }
      });
    },

    /**
     * Starts a remote session.
     *
     * @private
     * @method _newSession
     * @param {Function} callback optional.
     */
    _newSession: function _newSession(callback) {
      var self = this;

      function newSession(data) {
        self.session = data.value;
        self._handleCallback(callback, data.error, data);
      }

      this.send({ type: 'newSession' }, newSession);
    },

    /**
     * Finds actor and creates connection to marionette.
     * This is a combination of calling getMarionetteId and then newSession.
     *
     * @method startSession
     * @param {Function} callback executed when session is started.
     */
    startSession: function startSession(callback) {
      var self = this;
      return this._getActorId(function() {
        //actor will not be set if we send the command then
        self._newSession(callback);
      });
    },

    /**
     * Destroys current session.
     *
     *
     * @chainable
     * @method deleteSession
     * @param {Function} callback executed when session is destroyed.
     */
    deleteSession: function destroySession(callback) {
      var cmd = { type: 'deleteSession' },
          self = this;

      this._sendCommand(cmd, 'ok', function(err, value) {
        self.driver.close();
        self._handleCallback(callback, err, value);
      });

      return this;
    },

    /**
     * Callback will receive the id of the current window.
     *
     * @chainable
     * @method getWindow
     * @param {Function} callback executed with id of current window.
     * @return {Object} self.
     */
    getWindow: function getWindow(callback) {
      var cmd = { type: 'getWindow' };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Callback will receive an array of window ids.
     *
     * @method getWindow
     * @chainable
     * @param {Function} callback executes with an array of ids.
     */
    getWindows: function getWindows(callback) {
      var cmd = { type: 'getWindows' };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Switches context of marionette to specific window.
     *
     *
     * @method switchToWindow
     * @chainable
     * @param {String} id window id you can find these with getWindow(s).
     * @param {Function} callback called with boolean.
     */
    switchToWindow: function switchToWindow(id, callback) {
      var cmd = { type: 'switchToWindow', value: id };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Imports a script into the marionette
     * context for the duration of the session.
     *
     * Good for prototyping new marionette commands.
     *
     * @method importScript
     * @chainable
     * @param {String} script javascript string blob.
     * @param {Function} callback called with boolean.
     */
    importScript: function(script, callback) {
      var cmd = { type: 'importScript', script: script };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Switches context of marionette to specific iframe.
     *
     *
     * @method switchToFrame
     * @chainable
     * @param {String|Marionette.Element} id iframe id or element.
     * @param {Function} callback called with boolean.
     */
    switchToFrame: function switchToFrame(id, callback) {
      if (typeof(id) === 'function') {
        callback = id;
        id = null;
      }

      var cmd = { type: 'switchToFrame' };

      if (id instanceof this.Element) {
        cmd.element = id.id;
      } else if (
        id !== null &&
        typeof(id) === 'object' &&
        id.ELEMENT
      ) {
        cmd.element = id.ELEMENT;
      } else if (id) {
        cmd.value = id;
      }

      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Switches context of window.
     *
     * @method setContext
     * @chainable
     * @param {String} context either: 'chome' or 'content'.
     * @param {Function} callback receives boolean.
     */
    setContext: function setContext(content, callback) {
      if (content !== this.CHROME && content !== this.CONTENT) {
        throw new Error('content type must be "chrome" or "content"');
      }

      var cmd = { type: 'setContext', value: content };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Sets the script timeout
     *
     * @method setScriptTimeout
     * @chainable
     * @param {Numeric} timeout max time in ms.
     * @param {Function} callback executed with boolean status.
     * @return {Object} self.
     */
    setScriptTimeout: function setScriptTimeout(timeout, callback) {
      var cmd = { type: 'setScriptTimeout', value: timeout };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * setSearchTimeout
     *
     * @method setSearchTimeout
     * @chainable
     * @param {Numeric} timeout max time in ms.
     * @param {Function} callback executed with boolean status.
     * @return {Object} self.
     */
    setSearchTimeout: function setSearchTimeout(timeout, callback) {
      var cmd = { type: 'setSearchTimeout', value: timeout };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Gets url location for device.
     *
     * @method getUrl
     * @chainable
     * @param {Function} callback receives url.
     */
    getUrl: function getUrl(callback) {
      var cmd = { type: 'getUrl' };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Refreshes current window on device.
     *
     * @method refresh
     * @param {Function} callback boolean success.
     * @return {Object} self.
     */
    refresh: function refresh(callback) {
      var cmd = { type: 'refresh' };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Drives browser to a url.
     *
     * @method goUrl
     * @chainable
     * @param {String} url location.
     * @param {Function} callback executes when finished driving browser to url.
     */
    goUrl: function goUrl(url, callback) {
      var cmd = { type: 'goUrl', value: url };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Drives window forward.
     *
     *
     * @method goForward
     * @chainable
     * @param {Function} callback receives boolean.
     */
    goForward: function goForward(callback) {
      var cmd = { type: 'goForward' };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Drives window back.
     *
     * @method goBack
     * @chainable
     * @param {Function} callback receives boolean.
     */
    goBack: function goBack(callback) {
      var cmd = { type: 'goBack' };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Logs a message on marionette server.
     *
     *
     * @method log
     * @chainable
     * @param {String} message log message.
     * @param {String} level arbitrary log level.
     * @param {Function} callback receives boolean.
     * @return {Object} self.
     */
    log: function log(msg, level, callback) {
      var cmd = { type: 'log', level: level, value: msg };
      return this._sendCommand(cmd, 'ok', callback);
    },

    /**
     * Retrieves all logs on the marionette server.
     * The response from marionette is an array of arrays.
     *
     *     device.getLogs(function(err, logs){
     *       //logs => [
     *         [
     *           'msg',
     *           'level',
     *           'Fri Apr 27 2012 11:00:32 GMT-0700 (PDT)'
     *         ]
     *       ]
     *     });
     *
     *
     * @method getLogs
     * @chainable
     * @param {Function} callback receive an array of logs.
     */
    getLogs: function getLogs(callback) {
      var cmd = { type: 'getLogs' };
      return this._sendCommand(cmd, 'value', callback);
    },

    /**
     * Executes a remote script will block.
     * Script is *not* wrapped in a function.
     *
     * @method executeJsScript
     * @chainable
     * @param {String} script script to run.
     * @param {Array} [args] optional args for script.
     * @param {Array} [timeout] optional args for timeout.
     * @param {Function} callback will receive result of the return \
     *                            call in the script if there is one.
     * @return {Object} self.
     */
    executeJsScript: function executeJsScript(script, args, timeout, callback) {
      if (typeof(timeout) === 'function') {
        callback = timeout;
        timeout = null;
      }
      if (typeof(args) === 'function') {
        callback = args;
        args = null;
      }

      timeout = (typeof(timeout) === 'boolean') ? timeout : true;

      return this._executeScript({
        type: 'executeJSScript',
        value: script,
        timeout: timeout,
        args: args
      }, callback || this.defaultCallback);
    },

    /**
     * Executes a remote script will block. Script is wrapped in a function.
     *
     *     // its is very important to remember that the contents of this
     *     // method are "stringified" (Function#toString) and sent over the
     *     // wire to execute on the device. So things like scope will not be
     *     // the same. If you need to pass other information in arguments
     *     // option should be used.
     *
     *     // assume that this element is the result of findElement
     *     var element;
     *     var config = {
     *        event: 'magicCustomEvent',
     *        detail: { foo: true  }
     *     };
     *
     *     var remoteArgs = [element, details];
     *
     *     // unlike other callbacks this one will execute _on device_
     *     function remoteFn(element, details) {
     *        // element in this context is a real dom element now.
     *        var event = document.createEvent('CustomEvent');
     *        event.initCustomEvent(config.event, true, true, event.detail);
     *        element.dispatchEvent(event);
     *
     *        return { success: true };
     *     }
     *
     *     client.executeJsScript(remoteFn, remoteArgs, function(err, value) {
     *       // value => { success: true }
     *     });
     *
     *
     * @method executeScript
     * @chainable
     * @param {String} script script to run.
     * @param {Array} [args] optional args for script.
     * @param {Function} callback will receive result of the return \
     *                            call in the script if there is one.
     * @return {Object} self.
     */
    executeScript: function executeScript(script, args, callback) {
      if (typeof(args) === 'function') {
        callback = args;
        args = null;
      }
      return this._executeScript({
        type: 'executeScript',
        value: script,
        args: args
      }, callback || this.defaultCallback);
    },

    /**
     * Script is wrapped in a function and will be executed asynchronously.
     *
     * NOTE: that setScriptTimeout _must_ be set prior to using this method
     *       as the timeout defaults to zero.
     *
     *
     *     function remote () {
     *       window.addEventListener('someevent', function() {
     *         // special method to notify that async script is complete.
     *         marionetteScriptFinished({ fromRemote: true })
     *       });
     *     }
     *
     *     client.executeAsyncScript(remote, function(err, value) {
     *       // value === { fromRemote: true }
     *     });
     *
     *
     * @method executeAsyncScript
     * @chainable
     * @param {String} script script to run.
     * @param {Array} [args] optional args for script.
     * @param {Function} callback will receive result of the return \
     *                            call in the script if there is one.
     * @return {Object} self.
     */
    executeAsyncScript: function executeAsyncScript(script, args, callback) {
      if (typeof(args) === 'function') {
        callback = args;
        args = null;
      }
      return this._executeScript({
        type: 'executeAsyncScript',
        value: script,
        args: args
      }, callback || this.defaultCallback);
    },

    /**
     * Finds element.
     *
     * @method _findElement
     * @private
     * @param {String} type type of command to send like 'findElement'.
     * @param {String} query search query.
     * @param {String} method search method.
     * @param {String} elementId id of element to search within.
     * @param {Function} callback executes with element uuid(s).
     */
    _findElement: function _findElement(type, query, method, id, callback) {
      var cmd, self = this;

      if (isFunction(id)) {
        callback = id;
        id = undefined;
      }

      if (isFunction(method)) {
        callback = method;
        method = undefined;
      }

      callback = callback || this.defaultCallback;

      cmd = {
        type: type || 'findElement',
        using: method || 'css selector',
        value: query,
        element: id
      };

      if (this.searchMethods.indexOf(cmd.using) === -1) {
        throw new Error(
          'invalid option for using: \'' + cmd.using + '\' use one of : ' +
          this.searchMethods.join(', ')
        );
      }

      //proably should extract this function into a private
      return this._sendCommand(cmd, 'value',
                               function processElements(err, result) {
        var element;

        if (result instanceof Array) {
          element = [];
          result.forEach(function(el) {
            element.push(new this.Element(el, self));
          }, this);
        } else {
          element = new this.Element(result, self);
        }
        self._handleCallback(callback, err, element);
      });
    },

    /**
     * Attempts to find a dom element (via css selector, xpath, etc...)
     * "elements" returned are instances of
     * {{#crossLink "Marionette.Element"}}{{/crossLink}}
     *
     *
     *     // with default options
     *     client.findElement('#css-selector', function(err, element) {
     *        if (err) {
     *          // handle case where element was not found
     *        }
     *
     *        // see element interface for all methods, etc..
     *        element.click(function() {
     *
     *        });
     *     });
     *
     *
     *
     * @method findElement
     * @chainable
     * @param {String} query search query.
     * @param {String} method search method.
     * @param {String} elementId id of element to search within.
     * @param {Function} callback executes with element uuid.
     */
    findElement: function findElement() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('findElement');
      return this._findElement.apply(this, args);
    },

    /**
     * Finds multiple elements in the dom. This method has the same
     * api signature as {{#crossLink "findElement"}}{{/crossLink}} the
     * only difference is where findElement returns a single element
     * this method will return an array of elements in the callback.
     *
     *
     *     // find all links in the document
     *     client.findElements('a[href]', function(err, element) {
     *     });
     *
     *
     * @method findElements
     * @chainable
     * @param {String} query search query.
     * @param {String} method search method.
     * @param {String} elementId id of element to search within.
     * @param {Function} callback executes with an array of element uuids.
     */
    findElements: function findElements() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('findElements');
      return this._findElement.apply(this, args);
    },


    /**
     * Converts an function into a string
     * that can be sent to marionette.
     *
     * @private
     * @method _convertFunction
     * @param {Function|String} fn function to call on the server.
     * @return {String} function string.
     */
    _convertFunction: function _convertFunction(fn) {
      if (typeof(fn) === 'function') {
        var str = fn.toString();
        return 'return (' + str + '.apply(this, arguments));';
      }
      return fn;
    },

    /**
     * Processes result of command
     * if an {'ELEMENT': 'uuid'} combination
     * is returned a Marionette.Element
     * instance will be created and returned.
     *
     *
     * @private
     * @method _transformResultValue
     * @param {Object} value original result from server.
     * @return {Object|Marionette.Element} processed result.
     */
    _transformResultValue: function _transformResultValue(value) {
      if (value && typeof(value.ELEMENT) === 'string') {
        return new this.Element(value.ELEMENT, this);
      }
      return value;
    },

    /**
     * Prepares arguments for script commands.
     * Formats Marionette.Element's sod
     * marionette can use them in script commands.
     *
     *
     * @private
     * @method _prepareArguments
     * @param {Array} arguments list of args for wrapped function.
     * @return {Array} processed arguments.
     */
    _prepareArguments: function _prepareArguments(args) {
      if (args.map) {
        return args.map(function(item) {
          if (item instanceof this.Element) {
            return {'ELEMENT': item.id };
          }
          return item;
        }, this);
      } else {
        return args;
      }
    },

    /**
     * Executes a remote string of javascript.
     * the javascript string will be wrapped in a function
     * by marionette.
     *
     *
     * @method _executeScript
     * @private
     * @param {Object} options objects of execute script.
     * @param {String} options.type command type like 'executeScript'.
     * @param {String} options.value javascript string.
     * @param {String} options.args arguments for script.
     * @param {Boolean} options.timeout timeout only used in 'executeJSScript'.
     * @param {Function} callback executes when script finishes.
     * @return {Object} self.
     */
    _executeScript: function _executeScript(options, callback) {
      var timeout = options.timeout,
          self = this,
          cmd = {
            type: options.type,
            value: this._convertFunction(options.value),
            args: this._prepareArguments(options.args || [])
          };

      if (timeout === true || timeout === false) {
        cmd.timeout = timeout;
      }

      return this._sendCommand(cmd, 'value', callback);
    }

  };


  //gjslint: ignore
  var proto = Client.prototype;
  proto.searchMethods = [];

  for (key in searchMethods) {
    if (searchMethods.hasOwnProperty(key)) {
      Client.prototype[key] = searchMethods[key];
      Client.prototype.searchMethods.push(searchMethods[key]);
    }
  }

  module.exports = Client;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('client'), Marionette] :
    [module, require('./marionette')]
));
