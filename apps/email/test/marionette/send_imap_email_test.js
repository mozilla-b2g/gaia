var Email = require('./email');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');

marionette('send email via IMAP', function() {
  var client = marionette.client({
    settings: {
      // disable keyboard ftu because it blocks our display
      'keyboard.ftu.enabled': false
    }
  });

  var app;
  setup(function() {
    app = new Email(client);
    app.launch();
  });

  var server = serverHelper.use({}, this);

  test('should send a email', function() {
    const ONE_NEW_EMAIL_NOTIFICATION = '1 New Email';

    app.manualSetupImapEmail(server);
    app.tapCompose();

    // write email to self
    app.typeTo('testy@localhost');
    app.typeSubject('test email');
    app.typeBody('I still have a dream.');
    app.tapSend();

    app.waitForNewEmail();
    // get the text of the notification bar
    app.notificationBar.
      text(function(error, text) {
        assert.equal(
          text,
          ONE_NEW_EMAIL_NOTIFICATION,
          text + ' should equal ' + ONE_NEW_EMAIL_NOTIFICATION
        );
      });
  });
});
