/**
 * xpc module system designed
 * for extending the capabilities
 * of xpcwindow.
 *
 *
 * Designed to be mostly api compatible
 * with nodejs.
 *
 * Inspiration taken from the actual node module
 * loader codebase...
 */
window.xpcModule = (function() {

  var cache = require.cache = {};
  var nativeModules = {
    'fs': _ROOT + '/lib/modules/fs.js',
    'mkdirp': _ROOT + '/lib/modules/mkdirp.js',
    'debug': _ROOT + '/lib/modules/debug.js',
    'process': _ROOT + '/lib/modules/process.js',
    'mocha-bin': _ROOT + '/lib/modules/mocha-bin.js',
    'events': _ROOT + '/lib/modules/events.js',
    'env': _ROOT + '/lib/modules/env.js',
    'path': _ROOT + '/lib/modules/path.js',
    'tty': _ROOT + '/lib/modules/tty.js',
    'mocha-formatting': _ROOT + '/lib/modules/mocha-formatting.js'
  };

  function lazyDefine(obj, prop, fn) {
    Object.defineProperty(obj, prop, {
      configurable: true,
      get: function() {
        delete obj[prop];
        return obj[prop] = fn();
      }
    });
  }

  function Module(filename, parent) {
    this.filename = filename;
    this.exports = {};
  }

  Module.handlers = {};
  Module.handlers['.js'] = function(parent, path) {
    if (path in cache)
      return cache[path];

    // create new module...
    var module = new Module(path);

    if (fsPath) {
      module.dirname = fsPath.resolve(module.filename, '../');
    }

    var sandbox = {};

    // copy global state over into the sandbox
    // values...
    for (var key in window) {
      sandbox[key] = window[key];
    }

    function require(path) {
      return module.require(path);
    }

    lazyDefine(sandbox, 'process', function() {
      return require('process');
    });

    sandbox.require = require;
    sandbox.__filename = module.filename;
    sandbox.__dirname = module.dirname;
    sandbox.module = module;
    sandbox.window = window;
    sandbox.global = window;
    sandbox.exports = module.exports;

    try {
      mozIJSSubScriptLoader.loadSubScript('file://' + path, sandbox);
    } catch (e) {
      throw new Error('cannot require: "' + path + '"\n\n' + e.toString());
    }

    return cache[path] = module.exports;
  }

  Module.handlers['.json'] = function(module, path) {
    var contents = require('fs').readFileSync(path);
    try {
      return JSON.parse(contents);
    } catch (e) {
      console.log('could not parse json from: "' + path + '"');
    }
  };

  Module.prototype = {

    require: function(path) {
      // load the native module
      // when its name is provided...
      if (path in nativeModules) {
        return this.require(nativeModules[path]);
      }

      // check if path is absolute
      if (path[0] !== '/') {
        path = fsPath.resolve(this.dirname, path);
      }

      var handler = '.js';

      if (fsPath) {
        handler = fsPath.extname(path);
        if (!handler) {
          handler = '.js';
          path += handler;
        }
      }

      if (!(handler in Module.handlers)) {
        throw new Error('can\'t load file "' + path +
                        '" no handler for "' + handler + '"');
      }

      // fire the correct handler for the type
      // of content we are trying to load...
      return Module.handlers[handler](this, path);
    }

  };


  var top = new Module(null, {
    __dirname: _IMPORT_ROOT
  });

  var fsPath = require('path');

  function require(path) {
    return top.require(path);
  }

  window.require = require;

  return {
    require: require
  };

}());
