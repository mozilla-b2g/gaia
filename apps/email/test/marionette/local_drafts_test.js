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
});
