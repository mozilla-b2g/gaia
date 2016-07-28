!((define)=>{define((require,exports,module)=>{

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[ClientStream]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Exports
 */

module.exports = (client, utils) => {
  client._activeStreams = [];
  client.on('streamevent', onStreamEvent);

  client.stream = function(name) {
    debug('stream open', name);
    var args = [].slice.call(arguments, 1);
    var stream = new ClientStream(client, utils);
    var self = this;

    this.method('_stream', name, stream.id, this.id, args)
      .then(() => {
        debug('stream connected', name);
        stream._connected.resolve();
      })

      .catch(err => {
        debug('error', err);
        onStreamEvent({
          type: 'abort',
          id: stream.id,
          data: err
        });
      });

    this._activeStreams[stream.id] = stream;
    stream.emitter.on('cancel', onEnd);
    stream.emitter.on('abort', onEnd);
    stream.emitter.on('close', onEnd);

    function onEnd() {
      debug('end');
      delete self._activeStreams[stream.id];
      stream.destroy();
    }

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

  function onStreamEvent(data) {
    debug('stream event', data.type);
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
  this.client = client;
  this.emitter = new utils.Emitter();
  this.emitter.on('close', this.onClose.bind(this));
  this.emitter.on('abort', this.onAbort.bind(this));
  this._connected = defer();
  this.connected = this._connected.promise;
  this._closed = defer();
  this.closed = this._closed.promise;
  debug('initialized');
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
    return this.client.method('_streamcancel', this.id, reason)
      .then(result => {
        debug('cancelled', result);
        this.emitter.emit('cancel');
        return result;
      })

      .catch(e => {
        this.emitter.emit('cancel');
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

function defer() {
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