define(function(require, exports, module) {
'use strict';

var debug = require('common/debug')('viewFactory');
var nextTick = require('common/next_tick');
var snakeCase = require('snake_case');

// FIXME: app is injected later, we can only remove this after Bug 1154988
exports.app = null;
exports._instances = Object.create(null);

/**
 * Initializes a view and stores
 * a internal reference so when
 * view is called a second
 * time the same view is used.
 *
 * Makes an asynchronous call to
 * load the script if we do not
 * have the view cached.
 *
 *    // for example if you have
 *    // a calendar view Foo
 *
 *    viewFactory.get('Foo', function(view) {
 *      (view instanceof require('views/foo')) === true
 *    });
 *
 * @param {String} name view name.
 * @param {Function} view loaded callback.
 */
exports.get = function(name, cb) {
  if (this._registered(name)) {
    debug(`Found view named ${name}`);
    this._get(name, cb);
    return;
  }

  var path = `views/${snakeCase(name)}`;

  try {
    // we try sync require first since it should be faster (skip an extra
    // "tick"); our modules are bundled into few files during build time, so
    // sync require should work in almost all the calls (will only fail if
    // module was not defined/loaded before)
    var Ctor = require(path);
    debug(`Initializing view ${name} registered as ${path}`);
    this._initView(name, Ctor, cb);
  } catch(e) {
    debug(`Will try to load view ${name} at ${path}`);
    // we need to grab the global `require` because the async require is not
    // part of the AMD spec and is not implemented by all loaders
    window.require([path], Ctor => {
      debug(`Loaded view ${name}`);
      this._initView(name, Ctor, cb);
    });
  }
},

exports._registered = function(name) {
  return name in this._instances;
};

exports._get = function(name, cb) {
  var view = this._instances[name];
  cb && nextTick(() => cb.call(null, view));
};

exports._initView = function(name, Ctor, cb) {
  if (this._registered(name)) {
    // need to safeguard in case async load is triggered multiple times before
    // we can save a reference to the Constructor and/or view instance (would
    // trigger the window.require callback multiple times)
    return;
  }
  var view = new Ctor({ app: exports.app });
  this._instances[name] = view;
  this._get(name, cb);
};

});
