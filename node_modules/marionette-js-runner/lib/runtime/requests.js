/**
 * Singleton helper for dispatching messages from the child process mocha and
 * the parent process "child" management code.
 */
var Requests = {
  _nextId: 1,

  pending: {},

  init: function() {
    process.on('message', function(event) {
      if (event[0] !== 'response')
        return;

      var id = event[1];
      var payload = event.slice(2);

      // if there is a pending callback
      if (this.pending[id]) {
        // remove it from the queue
        var callback = this.pending[id];
        delete this.pending[id];

        // and fire it.
        callback.apply(this, payload);
      }
    }.bind(this));
  },

  /**
   * Send a request to the main thread.
   *
   *    Requests.emit('createHost', function(hostId) {
   *      // ... yey works?
   *    });
   *
   * @param {String} name of IPC method.
   */
  emit: function() {
    var args = Array.prototype.slice.call(arguments),
        name = args.shift(),
        callback = args.pop(),
        pendingId = this._nextId++;

    if (typeof callback !== 'function')
      throw new Error('must pass callback (function) as final argument');

    // add the pending item to the list.
    this.pending[pendingId] = callback;

    process.send([name, pendingId].concat(args));
  }

};

Requests.init();

module.exports.Requests = Requests;
