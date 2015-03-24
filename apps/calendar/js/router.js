/* jshint loopfunc: true */
define(function(require, exports, module) {
'use strict';

var page = require('ext/page');
var performance = require('performance');

function Router() {
  this.page = page;
  this._activeObjects = [];

  this._lastState = this._lastState.bind(this);
  this._onhashchange = this._onhashchange.bind(this);
}

function hashify(path) {
  return path.indexOf('#') === 0 ? path : '#' + path;
}

function unhashify(path) {
  return path.indexOf('#') === 0 ? path.substring(1) : path;
}

Router.prototype = {

  start: function() {
    this._setRoutes();
    this.currentPath = window.location.hash;
    this.resetState();

    // we are using location.hash instead of rewriting the whole URL because we
    // don't have a way to add HTML fallbacks/redirects for all the paths
    // there is no need to call page.start() since we don't want it to listen
    // for popstate and click events (we already handle it here through the
    // hashchange events)
    window.addEventListener('hashchange', this._onhashchange);

    // at this point the tabs should be interactive and the router ready to
    // handle the path changes (meaning the user can start interacting with
    // the app)
    performance.chromeInteractive();
  },

  _setRoutes: function() {
    this.state('/week/', 'Week');
    this.state('/day/', 'Day');
    this.state('/month/', ['Month', 'MonthDayAgenda']);
    this.modifier('/settings/', 'Settings', { clear: false });
    this.modifier('/advanced-settings/', 'AdvancedSettings', {
      color: 'settings'
    });

    this.state('/alarm-display/:id', 'ViewEvent', { path: false });

    this.state('/event/add/', 'ModifyEvent');
    this.state('/event/edit/:id', 'ModifyEvent');
    this.state('/event/show/:id', 'ViewEvent');

    this.modifier('/select-preset/', 'CreateAccount');
    this.modifier('/create-account/:preset', 'ModifyAccount');
    this.modifier('/update-account/:id', 'ModifyAccount');
  },

  stop: function() {
    window.removeEventListener('hashchange', this._onhashchange);
  },

  _onhashchange: function(e) {
    var hash = window.location.hash;
    if (!this.last || hash !== this.last.path) {
      this.show(hash);
    }
  },

  show: function(path, state) {
    path = hashify(path);

    // we use pushState and replaceState instead of setting location.hash
    // directly since we also need to store the state
    var method = window.location.hash !== path ? 'pushState' : 'replaceState';
    history[method](state, document.title, path);

    page.show(path, state);
  },

  go: function(path, state) {
    this.show(path, state);
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

    function unhandle(ctx, next) {
      // set unhandled to true to avoid the history.pushState call otherwise it
      // would add same URL twice to the history breaking the history.back
      // this should be first "middleware" since it needs to be set
      // synchronously
      ctx.unhandled = true;
      next();
    }

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
        document.body.dataset.path = unhashify(ctx.canonicalPath);
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

    this.page(hashify(path), unhandle, loadAllViews, setPath, handleViews,
      this._lastState);
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
