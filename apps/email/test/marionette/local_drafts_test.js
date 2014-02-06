var Email = require('./lib/email'),
    assert = require('assert'),
    serverHelper = require('./lib/server_helper');

var EMAIL_ADDRESS = 'firefox-os-drafts@example.com',
    EMAIL_SUBJECT = 'I still have a dream';

marionette('local draft', function() {
  var app;

  var client = marionette.client({
    settings: {
      // disable keyboard ftu because it blocks our display
      'keyboard.ftu.enabled': false
    }
  });

  var server = serverHelper.use(null, this);

  setup(function() {
    app = new Email(client);
    app.launch();
    app.manualSetupImapEmail(server);

    // Navigate to local drafts.
    app.tapFolderListButton();
    app.tapLocalDraftsItem();

    // Save a local draft.
    app.tapCompose();
    app.typeTo(EMAIL_ADDRESS);
    app.typeSubject(EMAIL_SUBJECT);
    app.saveLocalDrafts();
  });

  test.skip('should show the correct email address', function() {
    // Navigate to local drafts.
    app.tapFolderListButton();
    app.tapLocalDraftsItem();

    var message = app.getEmailBySubject(EMAIL_SUBJECT);
    if (!message) {
      throw new Error('Could not find local draft!');
    }

    // TODO(gaye): Abstract this waitForChild into lib/email.
    var author = client.helper
      .waitForChild(message, '.msg-header-author')
      .text();
    assert.equal(author, EMAIL_ADDRESS);
  });

  test('should maintain formatting', function() {
    const NAME = 'FireFox OS';
    const EMAIL_ADDRESS = 'firefox-os-drafts@example.com';
    const MAILBOX = NAME + ' <' + EMAIL_ADDRESS + '>';
    const EMAIL_SUBJECT = 'I still have a linebreak';
    const SPACE = ' ';
    const BODY = '  line\uE006break';
    const EXPECTED = '  line<br>break';

    // go to the Local Drafts page
    app.tapFolderListButton();
    app.tapLocalDraftsItem();

    // save a local draft
    app.tapCompose();
    app.typeTo(MAILBOX);
    // type a space to create the bubble
    app.typeTo(SPACE);
    app.typeSubject(EMAIL_SUBJECT);
    app.typeBody(BODY);

    app.saveLocalDrafts();

    // compare the body content
    app.tapEmailBySubject(EMAIL_SUBJECT, 'compose');

    var body = app.getComposeBody();

    // Currently fighting travis on Linux where it wants to
    // append an additional newline
    assert.equal(
      body.indexOf(EXPECTED),
      0,
      body + ' should contain ' + EXPECTED
    );
  });
});
