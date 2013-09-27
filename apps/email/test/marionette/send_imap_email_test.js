var Email = require('./lib/email');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');

marionette('send email via IMAP', function() {
  var app,
      client = marionette.client({
        settings: {
          // disable keyboard ftu because it blocks our display
          'keyboard.ftu.enabled': false
        }
      });

  setup(function() {
    app = new Email(client);
    app.launch();
  });

  var server = serverHelper.use(null, this);

  test('should send a email', function() {
    const ONE_NEW_EMAIL_NOTIFICATION = '1 New Email';

    app.manualSetupImapEmail(server);
    app.tapCompose();

    // write email to self
    app.typeTo('testy@localhost');
    app.typeSubject('test email');
    app.typeBody('I still have a dream.');
    app.tapSend();

    app.tapRefreshButton();
    app.waitForNewEmail();
    // get the text of the notification bar
    var notificationText = app.notificationBar.text();
    assert.equal(
      notificationText,
      ONE_NEW_EMAIL_NOTIFICATION,
      notificationText + ' should equal ' + ONE_NEW_EMAIL_NOTIFICATION
    );
  });
});

