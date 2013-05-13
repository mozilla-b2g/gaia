/** @namespace */
(function(module, ns) {

  var Abstract = ns.require('drivers/abstract'),
      Xhr = ns.require('xhr');

  Httpd.Xhr = Xhr;

  /**
   * Creates instance of http proxy backend.
   *
   * @deprecated
   * @class Marionette.Drivers.Httpd
   * @extends Marionette.Drivers.Abstract
   * @param {Object} options key/value pairs to add to prototype.
   */
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

  /** @scope Marionette.Drivers.Httpd.prototype */

  /**
   * Location of the http server that will proxy to marionette
   * @memberOf Marionette.Drivers.Httpd#
   * @name proxyUrl
   * @type String
   */
  proto.proxyUrl = '/marionette';

  /**
   * Port that proxy should connect to.
   *
   * @name port
   * @memberOf Marionette.Drivers.Httpd#
   * @type Numeric
   */
  proto.port = 2828;

  /**
   * Server proxy should connect to.
   *
   *
   * @name server
   * @memberOf Marionette.Drivers.Httpd#
   * @type String
   */
  proto.server = 'localhost';

  /**
   * Sends command to server for this connection
   *
   * @name _sendCommand
   * @memberOf Marionette.Drivers.Httpd#
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
   *
   * @name _close
   * @memberOf Marionette.Drivers.Httpd#
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
   *
   * @name _connect
   * @memberOf Marionette.Drivers.Httpd#
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
   * @memberOf Marionette.Drivers.Httpd#
   * @name _request
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
   * @name _onQueueResponse
   * @memberOf Marionette.Drivers.Httpd#
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


  module.exports = Httpd;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers/httpd-polling'), Marionette] :
    [module, require('../marionette')]
));
