var EventEmitter = require('events').EventEmitter,
    debug = require('debug')('traverse-directory'),
    fs = require('graceful-fs'),
    fsPath = require('path');

/**
 * Initiates a traverse object. The use of `new` is optional:
 *
 *    var traverseDir = require('traverse-directory');
 *    var dir = traverseDir();
 *
 * @constructor
 * @param {String} source to traverse.
 * @param {String} target of the traverse.
 */
function Traverse(source, target) {
  if (!(this instanceof Traverse))
    return new Traverse(source, target);

  EventEmitter.call(this);
  debug('init', { source: source, target: target });

  this.source = source;
  this.target = target;
}

/**
 * `readdir` action designed to continue descent into a given directory.
 *
 * @param {Traverse} traverse instance.
 * @param {String} source directory.
 * @param {String} target directory.
 * @param {Function} callback initiates the next action.
 */
Traverse.readdir = function(traverse, source, target, callback) {
  debug('readdir', source, target);
  // next is our magic state tracking not callback.
  var next = traverse.next.bind(traverse);

  // number of remaining operations
  var pending = 0;

  /**
   * Check if we are done waiting for operations.
   * @private
   */
  function checkComplete() {
    if (pending === 0) {
      callback && callback();
      return;
    }
  }

  /**
   * If given argument is truthy send argument to callback.
   *
   * @private
   * @param {Object|Null} err to validate.
   * @return {Boolean} true on error false otherwise
   */
  function handleError(err) {
    if (err) {
      debug('err', err);
      callback(err);
      callback = null;
      return true;
    }

    return false;
  }

  /**
   * Wrapper around fs.stat which decides how to process a given leaf.
   *
   *
   * @param {String} pathSource for next action.
   * @param {String} pathTarget for next action.
   * @private
   */
  function stat(pathSource, pathTarget) {
    // stat the leaf
    fs.stat(pathSource, function(err, stat) {
      if (handleError(err))
        return;

      // deal with the file vs directory handlers.
      if (stat.isFile()) {
        traverse.handleFile(pathSource, pathTarget, next);
      } else if(stat.isDirectory()) {
        traverse.handleDirectory(pathSource, pathTarget, next);
      }

      // remove a pending item from the stack.
      --pending;

      // maybe we are done now?
      checkComplete();
    });
  }

  // read the source directory and build paths
  fs.readdir(source, function(err, list) {
    if (handleError(err))
      return false;

    pending = list.length;

    list.forEach(function(path) {
      // readdir returns a relative path for each item so join to the root.
      var pathSource = fsPath.join(source, path);
      var pathTarget = fsPath.join(target, path);

      // and initialize the stat
      stat(pathSource, pathTarget);
    });

    checkComplete();
  });
};

/**
 * Copies a single directory (no contents) from source to target [mkdir].
 * Additionally the directory is read for future actions.
 *
 * @param {Traverse} traverse for action.
 * @param {String} source for action.
 * @param {String} target for action.
 * @param {Function} callback for this action.
 */
Traverse.copydir = function(traverse, source, target, callback) {
  debug('copydir', source, target);
  fs.mkdir(target, function(err) {
    // if a directory already exists thats fine
    if (err && err.code !== 'EEXIST') {
      callback(err);
      return;
    }

    Traverse.readdir(traverse, source, target, callback);
  });
};

/**
 * Copies a file from source to dest.
 *
 * @param {Traverse} traverse for action.
 * @param {String} source for action.
 * @param {String} target for action.
 * @param {Function} callback for this action.
 */
Traverse.copyfile = function(traverse, source, target, callback) {
  var read = fs.createReadStream(source);
  var write = fs.createWriteStream(target);

  read.pipe(write);
  write.on('error', callback);
  write.on('close', callback);
};

/**
 * Symlink a file from source to target.
 *
 * @param {Traverse} traverse for action.
 * @param {String} source for action.
 * @param {String} target for action.
 * @param {Function} callback for this action.
 */
Traverse.symlinkfile = function(traverse, source, target, callback) {
  fs.symlink(source, target, 'file', callback);
};

/**
 * Symlink a directory from source to target.
 *
 * @param {Traverse} traverse for action.
 * @param {String} source for action.
 * @param {String} target for action.
 * @param {Function} callback for this action.
 */
Traverse.symlinkdir = function(traverse, source, target, callback) {
  fs.symlink(source, target, 'dir',callback);
};

Traverse.prototype = {
  __proto__: EventEmitter.prototype,

  /**
   * @type {Number} remaining pending items.
   */
  pending: 0,

  /**
   * @type {Object|Null} last error.
   */
  error: null,

  /**
   * Runs the next item in the stack.
   *
   * If the handler is falsy this will abort in success.
   *
   * @param {Function} handler for this item in the stack.
   * @param {String} source of traverse.
   * @param {String} target of traverse.
   */
  next: function(handler, source, target) {
    if (!handler) {
      return;
    }

    this.pending++;

    handler(this, source, target, function(err) {
      if (err) {
        this.error = err;
      }

      if (--this.pending === 0) {
        if (this.error) {
          this.emit('error', this.error);
          return;
        }

        this.emit('complete');
      }
    }.bind(this));
  },

  /**
   * Default handler for files.
   */
  handleFile: function() {
    throw new Error('call .file to add a file handler');
  },

  /**
   * Default directory handler.
   */
  handleDirectory: function() {
    throw new Error('call .directory to add a diectory handler');
  },

  /**
   * Add the file handler method.
   *
   * @param {Function} handler for files.
   */
  file: function(handler) {
    if (typeof handler !== 'function')
      throw new Error('handler must be a function.');

    this.handleFile = handler;
  },

  /**
   * Add the directory handler method.
   *
   * @param {Function} handler for directories.
   */
  directory: function(handler) {
    if (typeof handler !== 'function')
      throw new Error('handler must be a function.');

    this.handleDirectory = handler;
  },

  /**
   * Begin traversal process.
   *
   * @param {Function} callback [Error err].
   */
  run: function(callback) {
    if (callback) {
      this.once('error', callback);
      this.once('complete', callback);
    }

    this.handleDirectory(this.source, this.target, this.next.bind(this));
  }
};

module.exports = Traverse;
