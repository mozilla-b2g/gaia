/* jshint loopfunc: true */
define(function(require, exports, module) {
'use strict';

var COPY_METHODS = ['start', 'stop', 'show'];

var page = require('ext/page');

function Router() {
  var i = 0;
  var len = COPY_METHODS.length;

  this.page = page;
  this._activeObjects = [];

  for (; i < len; i++) {
    this[COPY_METHODS[i]] = page[COPY_METHODS[i]].bind(page);
  }

  this._lastState = this._lastState.bind(this);
}

Router.prototype = {

  go: function(path, context) {
    this.show(path, context);
  },

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
  clearObjects: function() {
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

    function loadAllViews(ctx, next) {
      var len = views.length;
      var numViews = len;
      var i;

      // Reset our views
      viewObjs = [];

      /*jshint loopfunc: true */
      for (i = 0; i < numViews; i++) {
        self.app.view(views[i], function(view) {
          viewObjs.push(view);
          len--;

          if (!len) {
            next();
          }
        });
      }
    }

    function setPath(ctx, next) {
      // set the theme color based on the view
      var meta = document.querySelector('meta[name="theme-color"]');
      meta.setAttribute('content', meta.dataset[options.color || 'default']);

      // Only set the dataset path after the view has loaded
      // its resources. Otherwise, there is some flash and
      // jank while styles start to apply and the view is only
      // partially loaded.
      if (options.path !== false) {
        document.body.dataset.path = ctx.canonicalPath;
        // Need to trigger the DOM to accept the new style
        // right away. Otherwise, once manageObject is called,
        // any styles/animations it triggers may be delayed
        // or dropped as the browser coalesces style changes
        // into one visible change. Example is the settings
        // drawer animation getting chopped so it is not smooth.
        document.body.clientWidth;
      }
      next();
    }

    function handleViews(ctx, next) {

      // Clear views if needed
      if (options.clear !== false) {
        self.clearObjects();
      }

      // Activate objects
      for (var i = 0; i < viewObjs.length; i++) {
        self.mangeObject(viewObjs[i], ctx);
      }

      // Set the current path
      if (options.appPath !== false) {
        self.currentPath = ctx.canonicalPath;
      }

      next();
    }

    this.page(path, loadAllViews, setPath, handleViews, this._lastState);
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

// router is singleton to simplify dependency graph, specially since it's
// needed by notifications and it could get into weird race conditions
module.exports = new Router();

});
