Calendar.ns('Worker').Manager = (function(global) {

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
    this._lastWorkerId = 0;

    Calendar.Responder.call(this);

    this._workerQueue = Object.create(null);
    this.roles = Object.create(null);
    this.workers = Object.create(null);

    this.on('log', this._onLog.bind(this));
  }

  Manager.prototype = {

    Worker: Worker,

    __proto__: Calendar.Responder.prototype,

    _onLog: function(e) {
      console.log(
        '[', e.name, ']',
        e.message,
        '(', e.stack[0].trim(), ')'
      );
    },

    _getId: function() {
      return this._lastId++;
    },

    _workerReady: function(worker, id) {
      var items = this._workerQueue[id];
      delete this._workerQueue[id];

      worker.addEventListener('message', this);
      worker.addEventListener('error', this);

      items.forEach(function(request) {
        this._send(id, request);
      }, this);
    },

    _formatData: function(data) {
      if (data[1] && data[1].stack && data[1].constructorName) {
        var err = data[1];
        var builtErr;

        if (global[err.constructorName]) {
          builtErr = Object.create(global[err.constructorName].prototype);
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

    handleEvent: function(e) {
      switch (e.type) {
        case 'error':
          // worker error
          break;
        case 'message':
          this.respond(this._formatData(e.data));
          break;
      }
    },

    _send: function(id, data) {
      var worker = this.workers[id];

      worker.postMessage(['_dispatch', data]);
    },

    _queue: function(id, data) {
      this._workerQueue[id].push(data);
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
    add: function(role, worker) {
      var id = this._lastWorkerId++;

      if (typeof(worker) === 'string') {
        worker = new this.Worker(
          worker + '?time=' + Date.now()
        );
      }

      this.workers[id] = worker;

      var roles = [].concat(role);

      var self = this;

      this._workerQueue[id] = [];

      worker.onerror = function() {
        // startup errors may be fatal?
      };

      worker.onmessage = function workerReady(e) {
        var data = e.data;
        if (e.data[0] === 'ready') {
          worker.onmessage = null;
          worker.onerror = null;

          self._workerReady(worker, id);
        }
      };

      var domain = document.location.protocol + '//';
      domain += document.location.host;

      worker.postMessage({ url: domain });

      roles.forEach(function(role) {
        if (!(role in this.roles)) {
          this.roles[role] = [];
        }
        this.roles[role].push(id);
      }, this);
    },

    _findWorker: function(role) {
      if (role in this.roles) {
        var workers = this.roles[role];
        if (workers.length > 1) {
          var rand = Math.floor(Math.random() * workers.length);
          return workers[rand];
        } else {
          return workers[0];
        }
      } else {
        throw new Error('no such role: "' + role + '"');
      }
    },

    _sendToRole: function(role, data) {
      var id = this._findWorker(role);

      if (this._workerQueue[id]) {
        this._queue(id, data);
      } else {
        this._send(id, data);
      }
    },

    request: function() {
      var args = Array.prototype.slice.call(arguments);
      var role = args.shift();
      var callback = args.pop();

      var data = {
        id: this._lastId++,
        role: role,
        payload: args
      };

      this.once(data.id + ' end', callback);
      this._sendToRole(role, data);
    },

    stream: function() {
      var args = Array.prototype.slice.call(arguments);
      var role = args.shift();
      var stream = new Calendar.Responder();

      var data = {
        role: role,
        payload: args,
        type: 'stream'
      };

      var id = data.id = this._lastId++;
      var streamData = function(data) {
        stream.respond(data);
      };

      this.on(id + ' stream', streamData);

      stream.send = function(callback) {
        this.once(id + ' end', function() {
          this.removeEventListener(id + ' stream', streamData);
          callback.apply(this, arguments);
        }.bind(this));
        this._sendToRole(role, data);
      }.bind(this);

      return stream;
    }

  };

  return Manager;

}(this));
