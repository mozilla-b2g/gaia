var server = require('mail-fakeservers');

var DEFAULT_OPTIONS = Object.freeze({
  // convention from GELAM
  credentials: {
    username: 'testy',
    password: 'testy'
  }
});

/**
 * Updates given object with the state from an imapStack.
 *
 * @param {Object} state target.
 * @param {Object} stack to pull updates from.
 * @param {Object} options for setup.
 */
function updateState(state, stack, options) {
  if (!options) {
    options = DEFAULT_OPTIONS;
  }

  state.imap = { port: stack.imapPort };
  state.smtp = { port: stack.smtpPort };

  [state.imap, state.smtp].forEach(function(serverState) {
    serverState.username = options.credentials.username;
    serverState.password = options.credentials.password;
    serverState.hostname = 'localhost';
  });
}

/**
 * @param {Object} options for setup.
 * @param {Object} mochaContext from callee.
 */
function use(options, mochaContext) {
  /**
   * Reused for every test/setup/teardown contains internal state so tests can
   * just directly reference the same object instead of manging state
   * themselves.
   *
   * @type {Object}
   * @private
   */
  var state = {};

  // spawns servers
  var controlServer;

  // current imap/smtp servers
  var imapStack;

  if (options === null) {
    options = DEFAULT_OPTIONS;
  }

  suiteSetup(function(done) {
    this.timeout('20s');
    server.create(function(err, control) {
      controlServer = control;
      done(err);
    });
  });

  // we need a new stack each test
  setup(function(done) {
    controlServer.createImapStack(options, function(err, imap) {
      // update the state information
      updateState(state, imap, options);

      imapStack = imap;
      done(err);
    });
  });

  // clear away old servers
  teardown(function(done) {
    controlServer.cleanupStacks(done);
  });

  // so node can exit close the server processes.
  suiteTeardown(function() {
    controlServer.kill();
  });

  return state;
}

module.exports.use = use;
