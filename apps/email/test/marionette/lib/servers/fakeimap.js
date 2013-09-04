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
 */
function updateState(state, stack) {
  state.imap = { port: stack.imapPort };
  state.smtp = { port: stack.smtpPort };

  [state.imap, state.smtp].forEach(function(serverState) {
    serverState.username = DEFAULT_OPTIONS.credentials.username;
    serverState.password = DEFAULT_OPTIONS.credentials.password;
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

  suiteSetup(function(done) {
    this.timeout('20s');
    server.create(function(err, control) {
      controlServer = control;
      done(err);
    });
  });

  // we need a new stack each test
  setup(function(done) {
    controlServer.createImapStack(DEFAULT_OPTIONS, function(err, imap) {
      // update the state information
      updateState(state, imap);

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
