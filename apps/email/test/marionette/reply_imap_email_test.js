var Email = require('./lib/email');
var assert = require('assert');
var format = require('util').format;
var serverHelper = require('./lib/server_helper');

/**
 * Test that, upon receiving an e-mail, the user can click the "Reply"
 * menu, select among any of the available options ("Reply",
 * "Reply All", and "Forward", and that a compose window properly opens.
 * Checks for the appropriate text inside the compose window, such as
 * "John Doe wrote...", "Original message", etc., as appropriate.
 */
marionette('reply to an e-mail', function() {
  var client = marionette.client({
    settings: {
      // disable keyboard ftu because it blocks our display
      'keyboard.ftu.enabled': false
    }
  });

  var BODY_TEXT = 'I still have a dream.';

  var app;
  var server = serverHelper.use(null, this);
  setup(function() {
    app = new Email(client);
    app.launch();
    app.manualSetupImapEmail(server);
    app.sendAndReceiveMessages([
      { to: 'testy@localhost', subject: 'test email', body: BODY_TEXT }
    ]);
    app.tapEmailAtIndex(0);
  });

  test('should be able to reply to an email', function() {
    app.tapReply('reply');
    var body = app.getComposeBody();
    assert(body.indexOf(BODY_TEXT) != -1,
      format('body should contain "%s", was "%s"', BODY_TEXT, body));
    assert(body.indexOf('wrote') != -1,
      format('body should contain "wrote", was "%s"', body));

    app.abortCompose('message_reader');
  });

  // Disabled because reply all should not actually work in this loopback
  // e-mail case; a bug related to forwarding was stopping us from disabling
  // reply-all.
  test.skip('should be able to "reply all" to an email', function() {
    app.tapReply('all');
    var body = app.getComposeBody();
    assert(body.indexOf(BODY_TEXT) != -1,
           format('body should contain "%s", was "%s"', BODY_TEXT, body));
    assert(body.indexOf('wrote') != -1,
           format('body should contain "wrote", was "%s"', body));

    app.abortCompose('message_reader');
  });

  test('should be able to forward an email', function() {
    app.tapReply('forward');
    var body = app.getComposeBody();
    assert(body.indexOf(BODY_TEXT) != -1,
           format('body should contain "%s", was "%s"', BODY_TEXT, body));
    assert(body.indexOf('Original message') != -1,
           format('body should contain "Original message", was "%s"', body));

    app.abortCompose('message_reader');
  });
});
