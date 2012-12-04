Calendar.Loader = (function() {

  function Loader(map) {
    this.map = map;
    this.cssBase = '/style/';
    this.jsBase = '/js/';

     // Keep track of resources, and only load once.
    // If the lookup has a .queue property we've received an action during loading
    // If the object has a .complete property, we've finished loading.
    this._loaded = {};
  }

  Loader.prototype = {

    /**
     * Add a queue property to our _loaded object
     */
    queue: function(config, cb) {
      var lookup = config.type + '.' + config.name;
      this._loaded[lookup] = this._loaded[lookup] || {queue: []};

      this._loaded[lookup].queue.push(cb);
    },

    /**
     * Runs the queue of callbacks after a resource is loaded
     */
    runQueue: function(config) {
      var lookup = config.type + '.' + config.name;
      var queue = this._loaded[lookup].queue;
      this._loaded[lookup].complete = true;

      var item;
      while ((item = queue.shift())) {
        item();
      }
    },

    /**
     * Returns true if we NEED to include the script
     * @return {Boolean} need to include the script.
     */
    checkQueue: function(config) {
      var lookup = config.type + '.' + config.name;

      if (!this._loaded[lookup])
        return true;

      return (!this._loaded[lookup].complete && !this._loaded[lookup].queue);
    },

    /**
     * Appends a stylesheet to the document
     */
    includeStyle: function(config, cb) {
      var script = document.createElement('link');
      script.type = 'text/css';
      script.rel = 'stylesheet';
      script.href = this.cssBase + config.file + '.css';
      document.head.appendChild(script);

      return this.runQueue(config);
    },

    /**
     * Appends a script to the document
     */
    includeScript: function(config, cb) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = this.jsBase + config.type.toLowerCase() +
        '/' + config.file + '.js';
      script.onload = function() {
        this.runQueue(config);
      }.bind(this);
      document.head.appendChild(script);
    },

    /**
     * Initializes a database store
     */
    includeStoreLoad: function(config, cb) {
      var self = this;

      function complete() {
        var store = Calendar.App.db.getStore(config.name);
        store.load(function(err) {
          if (err) {
            throw err;
          }

          self.runQueue(config);
        });
      }

      if (Calendar.App.db.connection) {
        complete();
      } else {
        Calendar.App.db.addEventListener('open', function() {
          complete();
        });
      }
    },

    /**
     * Gets a resource asynchronously based on the config
     */
    getResource: function(config, cb) {

      // lowercase_and_underscore the view to get the filename
      if (!config.file) {
        config.file = config.name.replace(/([A-Z])/g, '_$1')
          .replace(/^_/, '').toLowerCase();
      }

      var method = config.type;

      if (!this['include' + method]) {
        method = 'Script';
      }

      if (this.checkQueue(config, cb)) {
        this.queue(config, cb);
        this['include' + method](config, cb);
      } else {
        this.queue(config, cb);
      }
    },

    /**
     * Loads a resource and all of it's dependencies
     * @param {String} type of resource to load (folder name).
     * @param {String} name view name.
     * @param {Function} callback after all resources are loaded.
     */
    load: function(node, cb) {
      if (!node || !this.map[node.type] ||
          (Calendar[node.type] && Calendar[node.type][node.name])) {
        return cb();
      }

      var self = this;

      var dependencies = this.map[node.type][node.name];
      var numDependencies = dependencies ? dependencies.length : 0;
      var counter = 0;

      if (numDependencies > 0) {
        !function processRemaining() {
          var toProcess = dependencies.shift();
          self.load(toProcess, function() {
            counter++;
            if (counter >= numDependencies) {
              self.getResource(node, cb);
            } else {
              processRemaining();
            }
          });
        }();

      } else {
        self.getResource(node, cb);
      }
    },

    /**
     * Triggers a callback after localized
     */
    onLocalized: function(cb) {
      if (navigator.mozL10n && navigator.mozL10n.readyState == 'complete') {
        // document is already localized
        cb();
      } else {
        // waiting for the document to be localized (= standard case)
        window.addEventListener('localized', function() {
          cb();
        });
      }
    },

    /**
     * Triggers a callback when we are ready to render
     * We are ready to render when we have a DB and localized
     */
    onRenderReady: function(cb) {
      var left = 2;

      function complete() {
        if (!left) {
          cb();
        }
      }

      this.onLocalized(function() {
        left--;
        complete();
      });

      if (Calendar.App.db.connection) {
        left--;
        complete();
      } else {
        Calendar.App.db.addEventListener('open', function() {
          left--;
          complete();
        });
      }
    }
  };

  return Loader;

}());
