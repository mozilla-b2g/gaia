(function(window) {

  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var Loader = window.TestAgent.Loader = function Loader(options) {
    this._cached = {};
    this._queue = 0;
    this.doneCallbacks = [];

    if (typeof options !== 'object') {
      options = {};
    }

    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  };

  Loader.prototype = {

    /**
     * Queue for script loads.
     */
    _queue: null,

    /**
     * Used for queue identification.
     */
    _currentId: null,

    /**
     * Prefix for all loaded files
     *
     * @type String
     */
    prefix: '',

    /**
     * javascript content type.
     *
     *
     * @type String
     */
    type: 'text/javascript',

    /**
     * When true will add timestamps to required urls via query param
     *
     * @type Boolean
     */
    bustCache: true,

    /**
     * Current window in which required files will be injected.
     *
     * @private
     * @type Window
     */
    _targetWindow: window,

    /**
     * Cached urls
     *
     * @type Object
     * @private
     */
    _cached: null,

    get targetWindow() {
      return this._targetWindow;
    },

    set targetWindow(value) {
      this._targetWindow = value;
      this._cached = {};
    },

    _fireCallbacks: function _fireCallbacks() {
      var callback;
      while ((callback = this.doneCallbacks.shift())) {
        callback();
      }
    },

    /**
     * Adds a done callback.
     * You may call this function multiple times.
     *
     * @param {Function} callback called after all scripts are loaded.
     */
    done: function done() {
      return new Promise((accept, reject) => {
        if (this._queue === 0) {
          return accept();
        }

        this.doneCallbacks.push(accept);
      });
    },


    /**
     * Moves to the next item in the queue.
     */
    _next: function() {
      this._queue--;
      if (this._queue === 0) {
        this._fireCallbacks();
      }
    },

    /**
     * Loads given script into current target window.
     * If file has been previously loaded it will not
     * be loaded again.
     *
     * @param {String} url location to load script from.
     * @param {String} callback callback when script loading is complete.
     */
    require: function(url, callback, options) {
      this._queue++;
      var next = this._next.bind(this);
      return this._require(url, options)
      .then(() => callback && callback())
      .catch(() => console.error('Error while loading: ', url))
      .then(next);
    },

    /**
     * Function that does the actual require work work.
     * Handles calling ._next on cached file or on onload
     * success.
     *
     * @private
     */
    _require: function require(url, options) {
      if (url in this._cached) {
        // Return a promise that represents the loading state
        // for the cached resource.
        return this._cached[url];
      }

      var suffix = this.bustCache ? ('?time=' + Date.now()) : '';
      var fullUrl = this.prefix + url + suffix;

      var doc = this.targetWindow.document;
      var element = doc.createElement('script');
      element.src = fullUrl;
      element.async = false;
      element.type = this.type;

      if (typeof options === 'object' && !Array.isArray(options)) {
        for (var key in options) {
          if (options.hasOwnProperty(key)) {
            element.setAttribute(key, options[key]);
          }
        }
      }

      var promise = new Promise((accept, reject) => {
        element.onload = accept;
        // XXX: Should we report missing files differently?
        //     Maybe fail the whole test case when a file is missing...?
        element.onerror = () => {
          console.error('Error while loading: ', url);
          accept();
        };
        doc.getElementsByTagName('head')[0].appendChild(element);
      });

      this._cached[url] = promise;
      return promise;
    }
  };

}(this));
