var Email = require('./lib/email');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');

marionette('go to local drafts page', function() {
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

  // Disable the test because of http://bugzil.la/925961#c36,
  // and we follow up the issue in http://bugzil.la/936328.
  test.skip('should show the correct email address ' +
       'in a item of mail list', function() {
    const EMAIL_ADDRESS = 'firefox-os-drafts@example.com';
    const EMAIL_SUBJECT = 'I still have a dream';

    app.manualSetupImapEmail(server);

    // go to the Local Drafts page
    app.tapFolderListButton();
    app.tapLocalDraftsItem();

    // save a local draft
    app.tapCompose();
    app.typeTo(EMAIL_ADDRESS);
    app.typeSubject(EMAIL_SUBJECT);
    app.saveLocalDrafts();

    // edit the draft to save it again
    app.tapEmailBySubject(EMAIL_SUBJECT, 'compose');
    app.saveLocalDrafts();

    // get email address on the email item
    var email = app.getEmailBySubject(EMAIL_SUBJECT).
      findElement('.msg-header-author').
      text();

    assert.equal(
      email,
      EMAIL_ADDRESS,
      email + ' should equal ' + EMAIL_ADDRESS
    );
  });

  test('should show correct name in a item of mail list', function() {
    const NAME = 'FireFox OS';
    const EMAIL_ADDRESS = 'firefox-os-drafts@example.com';
    const MAILBOX = NAME + ' <' + EMAIL_ADDRESS + '>';
    const EMAIL_SUBJECT = 'I still have a dream';
    const SPACE = ' ';

    app.manualSetupImapEmail(server);

    // go to the Local Drafts page
    app.tapFolderListButton();
    app.tapLocalDraftsItem();

    // save a local draft
    app.tapCompose();
    app.typeTo(MAILBOX);
    // tpye a space to create the bubble
    app.typeTo(SPACE);
    app.typeSubject(EMAIL_SUBJECT);
    app.saveLocalDrafts();

    // edit the draft to save it again
    app.tapEmailBySubject(EMAIL_SUBJECT, 'compose');
    app.saveLocalDrafts();

    // get name on the email item
    var name = app.getEmailBySubject(EMAIL_SUBJECT).
      findElement('.msg-header-author').
      text();

    assert.equal(
      name,
      NAME,
      name + ' should equal ' + NAME
    );
  });
});
