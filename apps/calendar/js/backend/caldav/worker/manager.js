define(function(require, exports, module) {
'use strict';

var Responder = require('common/responder');
var debug = require('common/debug')('worker/manager');

const IDLE_CLEANUP_TIME = 5000;

/**
 * Worker manager. Each worker/thread
 * is assigned one or more roles.
 *
 * There may be one or more workers for
 * each role and there is a contract
 * that assumes all roles are stateless
 * requests/streams are routed to workers
 * and will be completed eventually
 * but without order guarantees.
 */
function Manager() {
  this._lastId = 0;

  Responder.call(this);

  this.roles = Object.create(null);
  this.workers = [];
}
module.exports = Manager;

Manager.prototype = {
  // So that we can mock out Worker API in unit tests...
  Worker: Worker,

  __proto__: Responder.prototype,

  _onLog: debug,

  _formatData: function(data) {
    if (data[1] && data[1].stack && data[1].constructorName) {
      var err = data[1];
      var builtErr;

      if (self[err.constructorName]) {
        builtErr = Object.create(self[err.constructorName].prototype);
      } else {
        builtErr = Object.create(Error.prototype);
      }

      var key;

      for (key in err) {
        if (err.hasOwnProperty(key)) {
          builtErr[key] = err[key];
        }
      }

      data[1] = builtErr;
    }

    return data;
  },

  _onWorkerError: function(worker, err) {
    if (/reference to undefined property/.test(err.message)) {
      // This is a warning spewed out by javascript.options.strict,
      // the worker actually didn't crash at all, so ignore it.
      return;
    }

    console.error(
      'Caldav Worker Error:', err.message, '@', err.file, ':',
      err.line, err.stack
    );

    if (worker.instance) {
      worker.instance.terminate();
      worker.instance = null;
    }
    var pending = worker.pending;
    worker.pending = Object.create(null);
    for (var id in pending) {
      if (pending[id].stream) {
        pending[id].stream.emit('error', err);
      }
      pending[id].callback(err);
    }
  },

  _onWorkerMessage: function(worker, event) {
    var data = this._formatData(event.data);
    var type = data.shift();
    var match = type.match(/^(\d+) (end|stream)$/);

    if (type == 'log') {
      this._onLog.apply(this, data);

    } else if (match) {
      var pending = worker.pending[match[1]];
      if (pending) {
        this._dispatchMessage(worker, pending, match[2], data);
      } else {
        throw new Error('Message arrived for unknown consumer: ' +
                        type + ' ' + JSON.stringify(data));
      }
    } else {
      this.respond([type].concat(data));
    }
  },

  _dispatchMessage: function(worker, pending, type, data) {
    if (type == 'stream') {
      pending.stream.respond(data);
    } else { // 'end'
      pending.callback.apply(null, data);
      delete worker.pending[pending.id];
      // Bail out if there are other pending requests.
      if (Object.keys(worker.pending).length) {
        return;
      }
      // If none are left, schedule cleanup
      this._scheduleCleanup(worker);
    }
  },

  _addPending: function(worker, pending) {
    worker.pending[pending.id] = pending;
    clearTimeout(worker.cleanup);
  },

  _scheduleCleanup: function(worker) {
    clearTimeout(worker.cleanup);
    worker.cleanup = setTimeout(function() {
      // Ensure we don't have a race condition where someone just
      // added a request but the timeout fired anyway.
      if (Object.keys(worker.pending).length) {
        return;
      }
      if (!worker.instance) {
        return;
      }

      worker.instance.terminate();
      worker.instance = null;
    }, IDLE_CLEANUP_TIME);
  },

  /**
   * Adds a worker to the manager.
   * Worker is associated with one or
   * more roles. Workers are assumed
   * stateless.
   *
   *
   * @param {String|Array} role one or more roles.
   * @param {String} worker url.
   */
  add: function(role, workerURL) {
    debug('Will add', role, 'worker at', workerURL);
    var worker = {
      // Actual Worker instance, when active
      instance: null,
      // Handlers that are waiting for a response from this worker
      pending: Object.create(null),
      // Script URL
      url: workerURL,
      // Timeout set to disable the worker when it hasn't been used
      // for a given period of time
      cleanup: null
    };

    this.workers.push(worker);
    [].concat(role).forEach(function(role) {
      if (!(role in this.roles)) {
        this.roles[role] = [worker];
      } else {
        this.roles[role].push(worker);
      }
    }, this);
  },

  _ensureActiveWorker: function(role) {
    if (role in this.roles) {
      var workers = this.roles[role];
      var worker = workers[Math.floor(Math.random() * workers.length)];
      if (worker.instance) {
        return worker;
      } else {
        this._startWorker(worker);
        return worker;
      }
    } else {
      throw new Error('no worker with role "' + role + '" active');
    }
  },

  _startWorker: function(worker) {
    worker.instance = new this.Worker(
      // ?time= is for cache busting in development...
      // there have been cases where nightly would not
      // clear the cache of the worker.
      worker.url + '?time=' + Date.now()
    );

    worker.instance.onerror = this._onWorkerError.bind(this, worker);
    worker.instance.onmessage = this._onWorkerMessage.bind(this, worker);
    this._scheduleCleanup(worker);
  },

  request: function(role /*, args..., callback*/) {
    var args = Array.prototype.slice.call(arguments, 1);
    var callback = args.pop();
    var worker = null;

    try {
      worker = this._ensureActiveWorker(role);
    } catch (e) {
      callback(e);
      return;
    }

    var data = {
      id: this._lastId++,
      role: role,
      payload: args
    };

    this._addPending(worker, {
      id: data.id,
      callback: callback
    });

    worker.instance.postMessage(['_dispatch', data]);
  },

  stream: function(role /*, args...*/) {
    var args = Array.prototype.slice.call(arguments, 1);
    var stream = new Responder();
    var self = this;

    var data = {
      id: this._lastId++,
      role: role,
      payload: args,
      type: 'stream'
    };

    stream.request = function(callback) {
      var worker = null;

      stream.request = function() {
        throw new Error('stream request has been sent');
      };

      try {
        worker = self._ensureActiveWorker(role);
      } catch (e) {
        callback(e);
        return;
      }

      self._addPending(worker, {
        id: data.id,
        stream: stream,
        callback: callback
      });
      worker.instance.postMessage(['_dispatch', data]);
    };
    return stream;
  }
};

});
