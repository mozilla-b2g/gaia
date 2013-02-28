(function(exports) {

  function Observer() {
    this._waiting = [];
    this.complete = false;
    this.pending = 0;

    this._resolve = this._resolve.bind(this);
  }

  Observer.prototype = {
    _err: null,

    _resolve: function(err) {
      if (err && 'function' === typeof this.onerror) {
        this.onerror(err);
      }

      if (!(--this.pending)) {
        this.complete = true;

        // wait to notify them all but notify
        // them immediately once this timeout
        // completes...
        Factory.nextTick(this._notifyAll.bind(this, true));
      }
    },

    _notifyAll: function(sync) {
      var item;
      var list = this._waiting;
      this._waiting = []; // ensure no conflicts

      while ((item = list.shift())) {
        if (sync) {
          item();
        } else {
          Factory.nextTick(function(waiting) {
            waiting();
          }.bind(this, item));
        }
      }
    },

    /**
     * Track a single item in the queue.
     *
     * @param {Function} action to execute must accept
     *  a final argument that is a callback in the err, result style.
     */
    track: function(action) {
      this.pending++;

      action(this._resolve);
    },

    /**
     * Fires callback when the task is complete.
     *
     * @param {Function} callback fired when task is complete.
     */
    notify: function(callback) {
      this._waiting.push(callback);

      if (this.complete) {
        this._notifyAll();
      }
    }
  };

  var defaultPlugins = {
    group: function(config, observer, callback) {
      var config = this.config.group[config];
      var key;

      // group is simply a way to aggregate
      // multiple plugin calls. We make those
      // plugin calls here and trigger completion
      // after they all are complete.
      for (var plugin in config) {
        var list = config[plugin];

        function handle(item) {
          var fn = this.load.bind(
            this,
            plugin,
            item
          );

          observer.track(fn);
        }

        list.forEach(handle, this);
      }

      // if we did not register more callbacks
      // we need to trigger the callback async.
      if (observer.pending > 1) {
        callback();
      } else {
        Factory.nextTick(callback);
      }
    }
  };

  function Factory(config) {
    if (!(this instanceof Factory))
      return new Factory(config);

    this.plugins = Object.create(defaultPlugins);

    if (config.plugins) {
      for (var key in config.plugins) {
        this.plugins[key] = config.plugins[key];
      }
    }

    this._assets = Object.create(null);
    this.config = config;

    this._onerror = this._onerror.bind(this);
  }

  Factory.nextTick = function(callback) {
    setTimeout(callback, 0);
  };

  Factory.prototype = {
    _onerror: function(err) {
      if ('function' === typeof this.onerror) {
        this.onerror(err);
      }
    },

    _createObserver: function(pluginFn, name) {
      var observer = new Observer();

      // unify all errors through the factory
      observer.onerror = this._onerror;

      pluginFn = pluginFn.bind(this, name, observer);
      observer.track(pluginFn);

      return observer;
    },

    load: function(plugin, id, name, callback) {
      if (typeof(name) === 'function') {
        callback = name;
        name = id;
      }

      var pluginFn = this.plugins[plugin];

      if (!pluginFn || 'function' !== typeof pluginFn) {
        throw new Error('plugin for :"' + plugin + '" not in config');
      }

      var assets = this._assets[plugin];

      if (!assets) {
        assets = this._assets[plugin] = Object.create(null);
      }

      var observer = assets[id];

      if (!observer) {
        observer = assets[id] = this._createObserver(
          pluginFn,
          name
        );
      }

      observer.notify(callback);

      return this;
    }
  };

  Factory.Observer = Observer;
  exports.NotAmd = Factory;
}(
  (typeof(window) !== 'undefined') ? window : exports
));

