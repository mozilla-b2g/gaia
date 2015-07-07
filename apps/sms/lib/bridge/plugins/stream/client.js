!((define)=>{define((require,exports,module)=>{

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[ClientStream]') : () => {};

/**
 * Exports
 */

module.exports = (client, utils) => {
  client._activeStreams = [];
  client.receiver.on('streamevent', onStreamEvent);

  client.stream = function(method) {
    var args = [].slice.call(arguments, 1);
    var stream = new ClientStream(client, utils);

    this._activeStreams[stream.id] = stream;

    // Don't attempt to establish a stream
    // until the client is connected.
    this.connect().then(() => {
      debug('stream', method, args);

      utils.message('stream')
        .set('data', {
          id: stream.id,
          clientId: client.id,
          name: method,
          args: args
        })

        .send(client.endpoint)
        .then(() => stream._connected.resolve())
        .catch(err => {
          onStreamEvent({
            type: 'abort',
            id: stream.id,
            data: err
          });
        });

      stream.emitter.on('cancel', onEnd);
      stream.emitter.on('abort', onEnd);
      stream.emitter.on('close', onEnd);

      function onEnd() {
        debug('end');
        delete client._activeStreams[stream.id];
        stream.destroy();
      }
    });

    return stream;
  };

  /**
   * Called every time the service calls
   * write/abort/close on the ServiceStream
   *
   * @param {Object} broadcast
   * @param {String} broadcast.id Stream ID
   * @param {String} broadcast.type Event type ('write', 'abort' or 'close')
   * @private
   */

  function onStreamEvent(message) {
    debug('stream event', message.data.type);
    var data = message.data;
    var stream = client._activeStreams[data.streamId];
    stream.emitter.emit(data.type, data.data);
  }
};

/**
 * Readable stream instance returned by
 * a `client.stream('methodName')` call.
 *
 * @param {Object} options
 * @param {String} options.id Stream Id, used to match client/service streams
 * @param {Client} options.client Client instance
 */

function ClientStream(client, utils) {
  this.id = utils.uuid();
  this.endpoint = client.endpoint;
  this.message = utils.message;
  this.emitter = new utils.Emitter();
  this.emitter.on('close', this.onClose.bind(this));
  this.emitter.on('abort', this.onAbort.bind(this));
  this._connected = deferred();
  this.connected = this._connected.promise;
  this._closed = deferred();
  this.closed = this._closed.promise;
  debug('initialized', this);
}

/**
 * Prototype assigned to variable
 * to improve compression.
 *
 * @type {Object}
 */

ClientStream.prototype = {

  /**
   * Add a listener that will be called
   * every time the service broadcasts
   * a new chunk of data.
   *
   * @param {Function} callback
   */

  listen(callback) {
    debug('listen', callback);
    this.emitter.on('write', callback);
  },

  /**
   * Removes 'data' listener
   *
   * @param {Function} callback
   */

  unlisten(callback) {
    debug('unlisten', callback);
    this.emitter.off('write', callback);
  },

  /**
   * Notify the service that
   * action should be canceled
   *
   * @param {*} [reason] Optional data to be sent to service.
   */

  cancel(reason) {
    debug('cancel', reason);
    return this.connected.then(() => {
      var promise = deferred();
      var data = {
        id: this.id,
        reason: reason
      };

      this.message('streamcancel')
        .set('data', data)
        .send(this.endpoint)
        .then(result => {
          debug('cancelled', result);
          this.emitter.emit('cancel');
          promise.resolve(result.value);
        })
        .catch(e => {
          this.emitter.emit('cancel');
          promise.reject(e);
        });

      return promise.promise;
    });
  },

  /**
   * Used internally by Client when
   * it receives an 'abort' event
   * from the service.
   *
   * @private
   */

  onAbort(reason) {
    debug('abort', reason);
    this._closed.reject(reason);
  },

  /**
   * Used internally by Client when
   * it receives a 'close' event
   * from the service.
   *
   * @private
   */

  onClose() {
    debug('close');
    this._closed.resolve();
  },

  destroy() {
    debug('destroy');
    this.emitter.off();
  }
};

/**
 * Utils
 */

function deferred() {
  var result = {};
  result.promise = new Promise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;
}

});})((typeof define)[0]=='f'&&define.amd?define:((n,w)=>{return(typeof
module)[0]=='o'?c=>{c(require,exports,module);}:(c)=>{var m={exports:{}};
c(n=>w[n],m.exports,m);w[n]=m.exports;};})('streamClient',this));