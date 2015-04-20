'use strict';

var Email = require('./lib/email'),
    assert = require('assert'),
    serverHelper = require('./lib/server_helper');

var EMAIL_ADDRESS = 'firefox-os-drafts@example.com',
    EMAIL_SUBJECT = 'I still have a dream';

marionette('local draft', function() {
  var app;
  var client = marionette.client();
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
    var NAME = 'FireFox OS';
    var EMAIL_ADDRESS = 'firefox-os-drafts@example.com';
    var MAILBOX = NAME + ' <' + EMAIL_ADDRESS + '>';
    var EMAIL_SUBJECT = 'I still have a linebreak';
    var SPACE = ' ';
    var BODY = '   many spaces:  newline:\nmoar newlines:\n\n\nyeah!\n' +
            'and unicodes: Sssś Lałalalala\n' +
            'say no to <b><i>HTML</b>';

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

    // verify that what we typed is what we get back
    assert.equal(app.getComposeBody(), BODY);

    app.saveLocalDrafts();

    // make sure the subject and body came back unchanged
    app.tapEmailBySubject(EMAIL_SUBJECT, 'compose');
    assert.equal(app.getComposeBody(), BODY);
  });
});
