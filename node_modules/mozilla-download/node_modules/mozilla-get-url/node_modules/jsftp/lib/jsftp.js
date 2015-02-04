/* vim:set ts=2 sw=2 sts=2 expandtab */
/*global require: true module: true */
/*
 * @package jsftp
 * @copyright Copyright(c) 2012 Ajax.org B.V. <info@c9.io>
 * @author Sergi Mansilla <sergi.mansilla@gmail.com>
 * @license https://github.com/sergi/jsFTP/blob/master/LICENSE MIT License
 */

'use strict';

var Net = require('net');
var EventEmitter = require('events').EventEmitter;
var es = require('event-stream');
var ResponseParser = require('ftp-response-parser');
var ListingParser = require('parse-listing');
var util = require('util');
var fs = require('fs');
var once = require('once');

var FTP_PORT = 21;
var TIMEOUT = 10 * 60 * 1000;
var IDLE_TIME = 30000;
var NOOP = function() {};
var COMMANDS = [
  // Commands without parameters
  'abor', 'pwd', 'cdup', 'feat', 'noop', 'quit', 'pasv', 'syst',
  // Commands with one or more parameters
  'cwd', 'dele', 'list', 'mdtm', 'mkd', 'mode', 'nlst', 'pass', 'retr', 'rmd',
  'rnfr', 'rnto', 'site', 'stat', 'stor', 'type', 'user', 'xrmd', 'opts',
  // Extended features
  'chmod', 'size'
];

function getPasvPort(text, cb) {
  var RE_PASV = /([-\d]+,[-\d]+,[-\d]+,[-\d]+),([-\d]+),([-\d]+)/;
  var match = RE_PASV.exec(text);
  if (!match) {
    return cb(new Error('Bad passive host/port combination'));
  }

  cb(null, {
    host: match[1].replace(/,/g, '.'),
    port: (parseInt(match[2], 10) & 255) * 256 + (parseInt(match[3], 10) & 255)
  });
}

function runCmd(cmd) {
  var callback = NOOP;
  var args = [].slice.call(arguments);
  var completeCmd = args.shift();
  if (args.length) {
    if (typeof args[args.length - 1] === 'function')
      callback = args.pop();

    completeCmd += ' ' + args.join(' ');
  }
  this.execute(completeCmd.trim(), callback);
}

var Ftp = module.exports = function(cfg) {

  Object.keys(cfg).forEach(function(opt) {
    if (!this[opt]) this[opt] = cfg[opt];
  }, this);

  EventEmitter.call(this);

  // True if the server doesn't support the `stat` command. Since listing a
  // directory or retrieving file properties is quite a common operation, it is
  // more efficient to avoid the round-trip to the server.
  this.useList = false;
  this.port = this.port || FTP_PORT;
  this.pending = []; // Pending requests
  this.cmdBuffer_ = [];
  this.resParser = new ResponseParser();

  // Generate generic methods from parameter names. they can easily be
  // overriden if we need special behavior. they accept any parameters given,
  // it is the responsability of the user to validate the parameters.
  this.raw = (function() {
    return runCmd.apply(this, arguments);
  }).bind(this);
  COMMANDS.forEach(function(cmd) {
    this.raw[cmd] = runCmd.bind(this, cmd);
  }, this);

  var self = this;
  this.on('data', function(data) {
    if (self.debugMode) {
      self.emit('jsftp_debug', 'response', data || {});
    }
  });

  this.socket = this._createSocket(this.port, this.host);
};

util.inherits(Ftp, EventEmitter);

Ftp.prototype.setDebugMode = function(debugOn) {
  this.debugMode = (debugOn !== false);
};

Ftp.prototype.reemit = function(event) {
  var self = this;
  return function(data) {
    self.emit(event, data);
    if (self.debugMode) {
      self.emit('jsftp_debug', 'event:' + event, data || {});
    }
  };
};

Ftp.prototype._createSocket = function(port, host, firstAction) {
  if (this.socket && this.socket.destroy) {
    this.socket.destroy();
  }

  this.authenticated = false;
  var socket = Net.createConnection(port, host, firstAction || NOOP);
  socket.on('connect', this.reemit('connect'));
  socket.on('timeout', this.reemit('timeout'));

  this.pipeline = es.pipeline(socket, this.resParser);

  var self = this;
  this.pipeline.on('data', function(data) {
    self.emit('data', data);
    self.parseResponse.call(self, data);
  });
  this.pipeline.on('error', this.reemit('error'));

  return socket;
};

Ftp.prototype.parseResponse = function(data) {
  if (!this.cmdBuffer_.length)
    return;

  if ([220].indexOf(data.code) > -1)
    return;

  var next = this.cmdBuffer_[0][1];
  if (data.isMark) {
    // If we receive a Mark and it is not expected, we ignore that command
    if (!next.expectsMark || next.expectsMark.marks.indexOf(data.code) === -1)
      return;
    // We might have to ignore the command that comes after the mark.
    if (next.expectsMark.ignore)
      this.ignoreCmdCode = next.expectsMark.ignore;
  }

  if (this.ignoreCmdCode && this.ignoreCmdCode === data.code) {
    this.ignoreCmdCode = null;
    return;
  }

  this.parse(data, this.cmdBuffer_.shift());
};

/**
 * Sends a new command to the server.
 *
 * @param {String} command Command to write in the FTP socket
 */
Ftp.prototype.send = function(command) {
  if (!command || typeof command !== 'string')
    return;

  this.emit('cmdSend', command);
  this.pipeline.write(command + '\r\n');

  if (this.debugMode) {
    this.emit('jsftp_debug', 'user_command', command || {});
  }
};

Ftp.prototype.nextCmd = function() {
  if (!this.inProgress && this.cmdBuffer_[0]) {
    this.send(this.cmdBuffer_[0][0]);
    this.inProgress = true;
  }
};

/**
 * Check whether the ftp user is authenticated at the moment of the
 * enqueing. ideally this should happen in the `push` method, just
 * before writing to the socket, but that would be complicated,
 * since we would have to 'unshift' the auth chain into the queue
 * or play the raw auth commands (that is, without enqueuing in
 * order to not mess up the queue order. ideally, that would be
 * built into the queue object. all this explanation to justify a
 * slight slopiness in the code flow.
 *
 * @param {string} action
 * @param {function} callback
 */
Ftp.prototype.execute = function(action, callback) {
  if (this.socket && this.socket.writable) {
    return this.runCommand(action, callback || NOOP);
  }

  var self = this;
  this.authenticated = false;
  this.socket = this._createSocket(this.port, this.host, function() {
    self.runCommand(action, callback || NOOP);
  });
};

Ftp.prototype.runCommand = function(action, callback) {
  var executeCmd = (function _executeCmd() {
    this.cmdBuffer_.push([action, callback]);
    this.nextCmd();
  }).bind(this);

  if (this.authenticated || /feat|syst|user|pass/.test(action)) {
    return executeCmd();
  }

  var self = this;
  this.getFeatures(function() {
    self.auth(self.user, self.pass, executeCmd);
  });
};

/**
 * Parse is called each time that a comand and a request are paired
 * together. That is, each time that there is a round trip of actions
 * between the client and the server.
 *
 * @param {Object} response Response from the server (contains text and code).
 * @param {Array} command Contains the command executed and a callback (if any).
 */
Ftp.prototype.parse = function(response, command) {
  var err = null;
  if (response.isError) {
    err = new Error(response.text || 'Unknown FTP error.');
    err.code = response.code;
  }

  command[1](err, response);
  this.inProgress = false;
  this.nextCmd();
};

/**
 * Returns true if the current server has the requested feature.
 *
 * @param {String} feature Feature to look for
 * @return {Boolean} Whether the current server has the feature
 */
Ftp.prototype.hasFeat = function(feature) {
  return !!feature && this.features.indexOf(feature.toLowerCase()) > -1;
};

/**
 * Returns an array of features supported by the current FTP server
 *
 * @param {String} features Server response for the 'FEAT' command
 * @return {String[]} Array of feature names
 */
Ftp.prototype._parseFeats = function(features) {
  // Ignore header and footer
  return features.split(/\r\n|\n/).slice(1, -1).map(function(feat) {
    return (/^\s*(\w*)\s*/).exec(feat)[1].trim().toLowerCase();
  });
};

// Below this point all the methods are action helpers for FTP that compose
// several actions in one command
Ftp.prototype.getFeatures = function(callback) {
  var self = this;
  this.raw.feat(function(err, response) {
    self.features = err ? [] : self._parseFeats(response.text);
    self.raw.syst(function(err, res) {
      if (!err && res.code === 215)
        self.system = res.text.toLowerCase();

      callback(null, self.features);
    });
  });
};

/**
 * Authenticates the user.
 *
 * @param {String} user Username
 * @param {String} pass Password
 * @param {Function} callback Follow-up function.
 */
Ftp.prototype.auth = function(user, pass, callback) {
  this.pending.push(callback);

  var self = this;

  function notifyAll(err, res) {
    var cb;
    while (cb = self.pending.shift())
      cb(err, res);
  }

  if (this.authenticating) return;

  if (!user) user = 'anonymous';
  if (!pass) pass = '@anonymous';

  this.authenticating = true;
  self.raw.user(user, function(err, res) {
    if (!err && [230, 331, 332].indexOf(res.code) > -1) {
      self.raw.pass(pass, function(err, res) {
        self.authenticating = false;

        if (err) {
          notifyAll(err);
        } else if ([230, 202].indexOf(res.code) > -1) {
          self.authenticated = true;
          self.user = user;
          self.pass = pass;
          self.raw.type('I', function() {
            notifyAll(null, res);
          });
        } else if (res.code === 332) {
          self.raw.acct(''); // ACCT not really supported
        }
      });
    } else {
      self.authenticating = false;
      notifyAll(err);
    }
  });
};

Ftp.prototype.setType = function(type, callback) {
  if (this.type === type)
    callback(null);

  var self = this;
  this.raw.type(type, function(err, data) {
    if (!err) self.type = type;

    callback(err, data);
  });
};

/**
 * Lists a folder's contents using a passive connection.
 *
 * @param {String} path Remote path for the file/folder to retrieve
 * @param {Function} callback Function to call with errors or results
 */
Ftp.prototype.list = function(path, callback) {
  if (arguments.length === 1) {
    callback = arguments[0];
    path = '';
  }

  var self = this;
  var cb = once(function(err, listing) {
    self.setType('I', once(function() {
      callback(err, listing);
    }));
  });

  var listing = '';
  this.setType('A', function() {
    self.getPasvSocket(function(err, socket) {
      self.pasvTimeout.call(self, socket, cb);

      socket.on('data', function(data) { listing += data; });
      socket.on('close', function(err) { cb(err, listing); });
      socket.on('error', cb);

      function cmdCallback(err, res) {
        if (err) return cb(err);

        if (res.code !== 125 && res.code !== 150) {
          cb(new Error('Unexpected command ' + res.text));
        }
      }

      cmdCallback.expectsMark = {
        marks: [125, 150],
        ignore: 226
      };

      self.execute('list ' + (path || ''), cmdCallback);
    });
  });
};

Ftp.prototype.emitProgress = function(data) {
  this.emit('progress', {
    filename: data.filename,
    action: data.action,
    total: data.totalSize || 0,
    transferred: data.socket[
      data.action === 'get' ? 'bytesRead' : 'bytesWritten']
  });
};

/**
 * Depending on the number of parameters, returns the content of the specified
 * file or directly saves a file into the specified destination. In the latter
 * case, an optional callback can be provided, which will receive the error in
 * case the operation was not successful.
 *
 * @param {String} remotePath File to be retrieved from the FTP server
 * @param {String} localPath Local path where the new file will be created
 * @param {Function} callback Gets called on either success or failure
 */
Ftp.prototype.get = function(remotePath, localPath, callback) {
  var self = this;
  if (arguments.length === 2) {
    callback = once(localPath || NOOP);
    this.getGetSocket(remotePath, callback);
  } else {
    callback = once(callback || NOOP);
    this.getGetSocket(remotePath, function(err, socket) {
      if (err) {
        return callback(err);
      }

      if (!socket) {
        return callback(new Error(
          'An unknown error occurred when trying to retrieve PASV socket'));
      }

      var writeStream = fs.createWriteStream(localPath);
      writeStream.on('error', callback);

      socket.on('readable', function() {
        self.emitProgress({
          filename: remotePath,
          action: 'get',
          socket: this
        });
      });
      socket.on('end', callback);
      socket.pipe(writeStream);
      socket.resume();
    });
  }
};

/**
 * Returns a socket for a get (RETR) on a path. The socket is ready to be
 * streamed, but it is returned in a paused state. It is left to the user to
 * resume it.
 *
 * @param {String} path Path to the file to be retrieved
 * @param {Function} callback Function to call when finalized, with the socket
 * as a parameter
 */
Ftp.prototype.getGetSocket = function(path, callback) {
  var self = this;
  callback = once(callback);
  this.getPasvSocket(function(err, socket) {
    if (err) return cmdCallback(err);

    socket.on('error', function(err) {
      if (err.code === 'ECONNREFUSED') {
        err.msg = 'Probably trying a PASV operation while one is in progress';
      }
      cmdCallback(err);
    });

    self.pasvTimeout.call(self, socket, cmdCallback);
    socket.pause();

    function cmdCallback(err, res) {
      if (err) return callback(err);

      if (res.code === 125 || res.code === 150)
        callback(null, socket);
      else
        callback(new Error('Unexpected command ' + res.text));
    }

    cmdCallback.expectsMark = {
      marks: [125, 150],
      ignore: 226
    };
    self.execute('retr ' + path, cmdCallback);
  });
};

/**
 * Uploads contents on a FTP server. The `from` parameter can be a Buffer or the
 * path for a local file to be uploaded.
 *
 * @param {String|Buffer} from Contents to be uploaded.
 * @param {String} to path for the remote destination.
 * @param {Function} callback Function to execute on error or success.
 */
Ftp.prototype.put = function(from, to, callback) {
  var self = this;

  function putReadable(from, to, totalSize, callback) {
    from.on('readable', function() {
      self.emitProgress({
        filename: to,
        action: 'put',
        socket: from,
        totalSize: totalSize
      });
    });

    self.getPutSocket(to, function(err, socket) {
      if (err) return;
      from.pipe(socket);
    }, callback);
  }

  if (from instanceof Buffer) {
    this.getPutSocket(to, function(err, socket) {
      if (!err) socket.end(from);
    }, callback);
  } else if (typeof from === 'string' || from instanceof String) {
    fs.exists(from, function(exists) {
      if (!exists)
        return callback(new Error('Local file doesn\'t exist.'));

      fs.stat(from, function(err, stats) {
        var totalSize = err ? 0 : stats.size;
        var read = fs.createReadStream(from, {
          bufferSize: 4 * 1024
        });
        putReadable(read, to, totalSize, callback);
      });
    });
  } else {
    putReadable(from, to, from.size, callback);
  }
};

Ftp.prototype.getPutSocket = function(path, callback, doneCallback) {
  if (!callback) throw new Error('A callback argument is required.');

  doneCallback = once(doneCallback || NOOP);
  var _callback = once(function(err, _socket) {
    if (err) {
      callback(err);
      return doneCallback(err);
    }
    return callback(err, _socket);
  });

  var self = this;
  this.getPasvSocket(function(err, socket) {
    if (err) return _callback(err);

    var putCallback = once(function putCallback(err, res) {
      if (err) return _callback(err);

      // Mark 150 indicates that the 'STOR' socket is ready to receive data.
      // Anything else is not relevant.
      if (res.code === 125 || res.code === 150) {
        socket.on('close', doneCallback);
        socket.on('error', doneCallback);
        self.pasvTimeout.call(self, socket, doneCallback);
        _callback(null, socket);
      } else {
        return _callback(new Error('Unexpected command ' + res.text));
      }
    });
    putCallback.expectsMark = {
      marks: [125, 150],
      ignore: 226
    };
    self.execute('stor ' + path, putCallback);
  });
};

Ftp.prototype.pasvTimeout = function(socket, cb) {
  var self = this;
  socket.once('timeout', function() {
    self.emit('timeout');
    socket.destroy();
    cb(new Error('Passive socket timeout'));
  });
};

Ftp.prototype.getPasvSocket = function(callback) {
  var timeout = this.timeout;
  callback = once(callback || NOOP);
  this.execute('pasv', function(err, res) {
    if (err) return callback(err);

    getPasvPort(res.text, function(err, res) {
      if (err) return callback(err);

      var socket = Net.createConnection(res.port, res.host);
      socket.setTimeout(timeout || TIMEOUT);
      callback(null, socket);
    });
  });
};

/**
 * Provides information about files. It lists a directory contents or
 * a single file and yields an array of file objects. The file objects
 * contain several properties. The main difference between this method and
 * 'list' or 'stat' is that it returns objects with the file properties
 * already parsed.
 *
 * Example of file object:
 *
 *  {
 *      name: 'README.txt',
 *      type: 0,
 *      time: 996052680000,
 *      size: '2582',
 *      owner: 'sergi',
 *      group: 'staff',
 *      userPermissions: { read: true, write: true, exec: false },
 *      groupPermissions: { read: true, write: false, exec: false },
 *      otherPermissions: { read: true, write: false, exec: false }
 *  }
 *
 * The constants used in the object are defined in ftpParser.js
 *
 * @param {String} filePath Path to the file or directory to list
 * @param {Function} callback Function to call with the proper data when
 * the listing is finished.
 */
Ftp.prototype.ls = function(filePath, callback) {
  function entriesToList(err, entries) {
    if (err) {
      return callback(err);
    }

    ListingParser.parseFtpEntries(entries.text || entries, callback);
  }

  if (this.useList) {
    this.list(filePath, entriesToList);
  } else {
    var self = this;
    this.raw.stat(filePath, function(err, data) {
      // We might be connected to a server that doesn't support the
      // 'STAT' command, which is set as default. We use 'LIST' instead,
      // and we set the variable `useList` to true, to avoid extra round
      // trips to the server to check.
      if ((err && (err.code === 502 || err.code === 500)) ||
          (self.system && self.system.indexOf('hummingbird') > -1))
      // Not sure if the 'hummingbird' system check ^^^ is still
      // necessary. If they support any standards, the 500 error
      // should have us covered. Let's leave it for now.
      {
        self.useList = true;
        self.list(filePath, entriesToList);
      } else {
        entriesToList(err, data);
      }
    });
  }
};

Ftp.prototype.rename = function(from, to, callback) {
  var self = this;
  this.raw.rnfr(from, function(err) {
    if (err) return callback(err);
    self.raw.rnto(to, function(err, res) {
      callback(err, res);
    });
  });
};

Ftp.prototype.keepAlive = function(wait) {
  var self = this;
  if (this._keepAliveInterval)
    clearInterval(this._keepAliveInterval);

  this._keepAliveInterval = setInterval(self.raw.noop, wait || IDLE_TIME);
};

Ftp.prototype.destroy = function() {
  if (this._keepAliveInterval)
    clearInterval(this._keepAliveInterval);

  this.socket.destroy();
  this.features = null;
  this.authenticated = false;
};
