!((define)=>{define((require,exports,module)=>{

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 1 ? console.log.bind(console, '[ServiceStream]') : function() {};

module.exports = function(service, utils) {
  debug('attaching plugin');

  service
    .on('stream', onStream)
    .on('streamcancel', onStreamCancel);

  service.streamHandlers = {};
  service._activeStreams = [];

  service.stream = function(name, fn) {
    this.streamHandlers[name] = fn;
    return this;
  };

  function onStream(message) {
    debug('on stream', message);
    var data = message.data;
    var fn = service.streamHandlers[data.name];
    var clientId = data.clientId;

    // if (!fn) throw error(6, data.name);

    var stream = new ServiceStream(message.source, data.id, {
      client: service.clients[clientId],
      serviceId: service.id,
      clientId: clientId
    }, utils);

    service._activeStreams[data.id] = stream;

    // always pass stream object as first
    // argument to simplify the process
    fn.apply(service, [stream].concat(data.args));

    // stream doesn't return anything on purpose,
    // we create another stream object
    // on the client during request
    message.respond();
  }

  function onStreamCancel(message) {
    debug('stream cancel');
    var data = message.data;
    var id = data.id;
    var stream = service._activeStreams[id];
    delete service._activeStreams[id];
    message.respond(stream._cancel(data.reason));
  }
};

/**
 * Writable Stream instance passed to the
 * `service.stream` implementation
 *
 * @param {Object} options
 * @param {String} options.id Stream ID used to sync client and service streams
 * @param {BroadcastChannel} options.channel Channel used to postMessage
 * @param {String} options.serviceId ID of the service
 * @param {String} options.clientId ID of client that should receive message
 */

function ServiceStream(endpoint, id, data, utils) {
  this.id = id;
  this.endpoint = endpoint;
  this.clientId = data.clientId;
  this.message = utils.message;
  this.writable = true;
  debug('initialized');
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

var ServiceStreamPrototype = ServiceStream.prototype;

/**
 * Services that allows clients to
 * cancel the operation before it's
 * complete should override the
 * `stream.cancel` method.
 *
 * @param {*} [reason] Data sent from client about the cancellation
 * @returns {(Promise|*)}
 */

ServiceStreamPrototype.cancel = function(reason) {
  var err = new TypeError('service should implement stream.cancel()');
  return Promise.reject(err);
};

/**
 * Signal to client that action was
 * aborted during the process, this
 * should be used as a way to
 * communicate errors.
 *
 * @param {*} [data] Reason of failure
 * @returns {Promise}
 * @public
 */

ServiceStreamPrototype.abort = function(data) {
  debug('abort', data);
  return this._post('abort', data)
    .then(() => this.writable = false);
};

/**
 * Sends a chunk of data to the client.
 *
 * @param {*} data Chunk of data to be sent to client.
 * @returns {Promise}
 * @public
 */

ServiceStreamPrototype.write = function(data) {
  debug('write', data);
  return this._post('write', data);
};

/**
 * Closes the stream, signals that
 * action was completed with success.
 *
 * According to whatwg streams spec,
 * WritableStream#close() doesn't send data.
 *
 * @returns {Promise}
 */

ServiceStreamPrototype.close = function() {
  debug('close');
  return this._post('close')
    .then(() => this.writable = false);
};

/**
 * Validate the current state and
 * call cancel on the target stream.
 *
 * Called by the Service when client
 * sends a 'streamcancel' message.
 *
 * @param {*} [reason] Reason for cancelation sent by the client
 * @returns {Promise}
 * @private
 */

ServiceStreamPrototype._cancel = function(reason) {
  debug('cancel', reason);
  return this.cancel(reason)
    .then(result => {
      this.writable = false;
      return result;
    });
};

/**
 * Validate the current state and post message to client.
 *
 * @param {String} type 'write', 'abort' or 'close'
 * @param {String} state 'writable', 'aborted' or 'closed'
 * @param {*} [data] Data to be sent to the client
 * @returns {Promise}
 * @private
 */

ServiceStreamPrototype._post = function(type, data) {
  debug('post', type, data, this.writable);
  if (!this.writable) return Promise.reject();
  return this.message('streamevent')
    .set('noRespond', true)
    .set('recipient', this.clientId)
    .set('data', {
      streamId: this.id,
      type: type,
      data: data
    })
    .send(this.endpoint);
};

});})((typeof define)[0]=='f'&&define.amd?define:((n,w)=>{return(typeof
module)[0]=='o'?c=>{c(require,exports,module);}:(c)=>{var m={exports:{}};
c(n=>w[n],m.exports,m);w[n]=m.exports;};})('streamService',this));
