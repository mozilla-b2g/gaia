var debug = require('debug')('fakeserver-proxy'),
    controlRequest = require('./control_request'),
    ImapStack = require('./imap_stack'),
    Pop3Stack = require('./pop3_stack');

function ControlServer(process, server) {
  this.process = process;
  this.ipc = server;
}

ControlServer.prototype = {
  /**
   * Control server path
   * @type String
   */
  controlPath: 'control',

  _spawnServer: function(type, options, callback) {
    this.ipc.request(['setupAuth', type, options], callback);
  },

  /**
   * Issue a request to the control server.
   *
   * @param {Object} details for request.
   * @param {Function} callback [Error err, Object json].
   */
  request: function(details, callback) {
    var url = 'http://localhost:' + this.controlPort + '/' + this.controlPath;
    controlRequest(url, details, callback);
  },

  /**
   * Creates a smtp and imap server pair.
   *
   * Options:
   *  - Object credentials: required in options.
   *    - Object credentials.username: username for server.
   *    - Object credentials.password: password for server.
   *  - Object options: options for imap server:
   *    - Array options.imapExtensions: extensions for server ['RFC2195'].
   *
   * @param {Object} options for server.
   * @param {Function} callback [Error err, Object result].
   */
  createImapStack: function(options, callback) {
    if (!options.credentials) {
      throw new Error('options.credentials must be given');
    }

    var command = {
      command: 'make_imap_and_smtp',
      credentials: options.credentials,
      options: options.options || { imapExtensions: ['RFC2195'] }
    };

    this.request(command, function(err, data) {
      var stack = new ImapStack(data);
      callback(err, stack);
    });
  },

  /**
   * Creates a smtp and pop3 server pair.
   *
   * Options:
   *  - Object credentials: required in options.
   *    - Object credentials.username: username for server.
   *    - Object credentials.password: password for server.
   *
   * @param {Object} options for server.
   * @param {Function} callback [Error err, Object result].
   */
  createPop3Stack: function(options, callback) {
    if (!options.credentials) {
      throw new Error('options.credentials must be given');
    }

    var command = {
      command: 'make_pop3_and_smtp',
      credentials: options.credentials,
      options: {}
    };

    this.request(command, function(err, data) {
      var stack = new Pop3Stack(data);
      callback(err, stack);
    });
  },

  /**
   * Cleanup all servers.
   *
   * @param {Function} [Error err].
   */
  cleanupStacks: function(callback) {
    this.ipc.request(['cleanup'], function(err) {
      callback(err);
    });
  },

  /**
   * Get the control server port from the xpcshell process.
   *
   * @param {Function} callback [Error err].
   */
  setupControlPort: function(callback) {
    this.ipc.request(['getControlPort'], function(err, port) {
      this.controlPort = port;
      callback();
    }.bind(this));
  },

  kill: function() {
    this.ipc.close();
    this.process.kill();
  }
};

module.exports = ControlServer;
