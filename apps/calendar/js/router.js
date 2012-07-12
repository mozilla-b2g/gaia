(function(window) {
  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

  var COPY_METHODS = ['start', 'stop', 'show'];

  function Router(page) {
    var i = 0;
    var len = COPY_METHODS.length;

    this.page = page;
    this._activeObjects = [];
    this._clearObjects = this._clearObjects.bind(this);

    for (; i < len; i++) {
      this[COPY_METHODS[i]] = this.page[COPY_METHODS[i]].bind(this.page);
    }
  }

  Router.prototype = {

    /**
     * Creates a view callback
     *
     * @param {Object} object object to wrap as a function.
     */
    _wrapObject: function(object) {
      var self = this;

      return function viewResponder(ctx, next) {
        self._activeObjects.push(object);

        if ('onactive' in object) {
          if (!object.__routerActive) {
            object.onactive();
            object.__routerActive = true;
          }
        }

        next();
      }
    },

    /**
     * Clears active objects, calls oninactive
     * on object if available.
     */
    _clearObjects: function(ctx, next) {
      var item;
      while (item = this._activeObjects.pop()) {
        if ('oninactive' in item) {
          if ('__routerActive' in item) {
            if (item.__routerActive) {
              item.oninactive();
            }
          } else {
            item.oninactive();
          }
        }
        if ('__routerActive' in item) {
          item.__routerActive = false;
        }
      }
      next();
    },

    //needed so next works correctly
    _noop: function() {},

    _route: function() {
      var args = Array.prototype.slice.call(arguments);

      //add noop so next works correctly...
      args.push(this._noop);

      var len = args.length;
      var i = 0;
      var item;

      for (; i < len; i++) {
        item = args[i];
        if (typeof(item) === 'object') {
          args[i] = this._wrapObject(item);
        }
      }

      this.page.apply(this.page, args);
    },

    /**
     * Adds a state modifier
     *
     */
    modifier: function() {
      this._route.apply(this, arguments);
    },

    /**
     * Adds a route that represents a state of the page.
     * The theory is that a page can only enter
     * one state at a time (basically yield control to some
     * view or other object).
     *
     * Modifiers can be used to alter the behaviour
     * of a given state (without exiting it)
     *
     * @param {String} path path as defined by page.js.
     * @param {Function|Object...} args unlimited number of objects or function
     *                                  callbacks.
     */
    state: function() {
      var args = Array.prototype.slice.call(arguments);
      args.splice(1, 0, this._clearObjects);

      this._route.apply(this, args);
    }

  };

  Calendar.Router = Router;

}(this));
