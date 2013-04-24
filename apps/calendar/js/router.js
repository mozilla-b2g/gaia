(function(window) {
  var COPY_METHODS = ['start', 'stop', 'show'];

  function Router(page) {
    var i = 0;
    var len = COPY_METHODS.length;

    this.page = page;
    this._activeObjects = [];

    for (; i < len; i++) {
      this[COPY_METHODS[i]] = this.page[COPY_METHODS[i]].bind(this.page);
    }

    this._lastState = this._lastState.bind(this);
  }

  Router.prototype = {

    /**
     * Tells router to manage the object.
     * This will call the 'onactive'
     * method if present on the object.
     *
     * When the route is changed all 'manged'
     * object will be cleared and 'oninactive'
     * will be fired.
     */
    mangeObject: function() {
      var args = Array.prototype.slice.call(arguments);
      var object = args.shift();

      this._activeObjects.push(object);
      // intentionally using 'in'
      if ('onactive' in object) {
        object.onactive.apply(object, args);
      }
    },

    /**
     * Clears active objects, calls oninactive
     * on object if available.
     */
    clearObjects: function(ctx) {
      var item;
      while ((item = this._activeObjects.pop())) {
        // intentionally using 'in'
        if ('oninactive' in item) {
          item.oninactive();
        }
      }
    },

    /**
     * This method serves two purposes.
     *
     * 1. to safely end the loop by _not_ calling next.
     * 2. to store the last location.
     *
     * This function is added to the end of every rule.
     */
    _lastState: function(ctx) {
      this.last = ctx;
    },

    resetState: function() {
      if (!this.currentPath) {
        this.currentPath = '/month/';
      }

      this.show(this.currentPath);
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
     * @param {String|Array} one or multiple view identifiers.
     * @param {Object} options (clear, path).
     */
    state: function(path, views, options) {

      options = options || {};
      if (!Array.isArray(views)) {
        views = [views];
      }

      var self = this;
      var viewObjs = [];

      function setPath(ctx, next) {

        // Reset our views
        viewObjs = [];

        if (options.path !== false) {
          document.body.dataset.path = ctx.canonicalPath;
        }
        next();
      }

      function loadAllViews(ctx, next) {
        var len = views.length;
        var numViews = len;
        var i;

        for (i = 0; i < numViews; i++) {
          Calendar.App.view(views[i], function(view) {
            viewObjs.push(view);
            len--;

            if (!len) {
              next();
            }
          });
        }
      }

      function handleViews(ctx, next) {

        // Clear views if needed
        if (options.clear !== false) {
          self.clearObjects();
        }

        // Activate objects
        for (var i = 0, view; view = viewObjs[i]; i++) {
          self.mangeObject(view, ctx);
        }

        // Set the current path
        if (options.appPath !== false) {
          self.currentPath = ctx.canonicalPath;
        }

        next();
      }

      this.page(path, setPath, loadAllViews, handleViews, this._lastState);
    },

    /**
     * Adds a modifier route
     * Modifiers are essentially views, without the currentPath updating
     */
    modifier: function(path, view, options) {
      options = options || {};
      options.appPath = false;
      options.clear = false;
      this.state(path, view, options);
    }
  };

  Calendar.Router = Router;

}(this));
