(function(exports) {

  var Abstract, Xhr;

  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

  if (typeof(exports.Marionette.Drivers) === 'undefined') {
    exports.Marionette.Drivers = {};
  }

  if (typeof(window) === 'undefined') {
    Abstract = require('./abstract').Marionette.Drivers.Abstract;
    Xhr = require('../xhr').Marionette.Xhr;
  } else {
    Abstract = Marionette.Drivers.Abstract;
    Xhr = Marionette.Xhr;
  }

  Httpd.Xhr = Xhr;

  function Httpd(options) {
    var key;
    if (typeof(options) === 'undefined') {
      options = options;
    }

    Abstract.call(this);

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  var proto = Httpd.prototype = Object.create(Abstract.prototype);

  /**
   * Location of the http server that will proxy to marionette
   *
   * @type String
   */
  proto.proxyUrl = '/marionette';

  /**
   * Port that proxy should connect to.
   *
   * @type Numeric
   */
  proto.port = 2828;

  /**
   * Server proxy should connect to.
   *
   *
   * @type String
   */
  proto.server = 'localhost';

  /**
   * Sends command to server for this connection
   *
   * @this
   * @param {Object} command remote marionette command.
   */
  proto._sendCommand = function _sendCommand(command) {
    this._request('PUT', command, function() {
      //error handling?
    });
  };


  /**
   * Sends DELETE message to server to close marionette connection.
   * Aborts all polling operations.
   */
  proto._close = function _close() {

    if (this._pollingRequest) {
      this._pollingRequest.abort();
      this._pollingRequest = null;
    }

    this._request('DELETE', null, function() {
      //handle close errors?
    });
  };

  /**
   * Opens connection for device.
   * @this
   */
  proto._connect = function _connect() {
    var auth = {
      server: this.server,
      port: this.port
    };

    this._request('POST', auth, function(data, xhr) {
      var deviceResponse = this._onQueueResponse.bind(this);
      if (xhr.status === 200) {
        this.connectionId = data.id;
        this._pollingRequest = this._request('GET', deviceResponse);
      } else {
        //throw error
      }
    }.bind(this));
  };

  /**
   * Creates xhr request
   *
   *
   * @this
   * @param {String} method http method like 'POST' or 'GET'.
   * @param {Object} data optional.
   * @param {Object} callback after xhr completes \
   * receives parsed data as first argument and xhr object as second.
   * @return {Marionette.Xhr} xhr wrapper.
   */
  proto._request = function _request(method, data, callback) {
    var request, url;

    if (typeof(callback) === 'undefined' && typeof(data) === 'function') {
      callback = data;
      data = null;
    }

    url = this.proxyUrl;

    if (this.connectionId !== null) {
      url += '?' + String(this.connectionId) + '=' + String(Date.now());
    }

    request = new Xhr({
      url: url,
      method: method,
      data: data || null,
      callback: callback
    });

    request.send();

    return request;
  };

  /**
   * Handles response to multiple messages.
   * Requeues the _pollingRequest on success
   *
   *    {
   *      messages: [
   *        { id: 1, response: {} },
   *        ....
   *      ]
   *    }
   *
   * @this
   * @param {Object} queue list of messages.
   * @param {Marionette.Xhr} xhr xhr instance.
   */
  proto._onQueueResponse = function _onQueueResponse(queue, xhr) {
    var self = this;

    if (xhr.status !== 200) {
      throw new Error('XHR responded with code other then 200');
    }

    //TODO: handle errors
    if (queue && queue.messages) {
      queue.messages.forEach(function(response) {
        self._onDeviceResponse(response);
      });
    }

    //when we close the object _pollingRequest is destroyed.
    if (this._pollingRequest) {
      this._pollingRequest.send();
    }
  };


  exports.Marionette.Drivers.HttpdPolling = Httpd;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
