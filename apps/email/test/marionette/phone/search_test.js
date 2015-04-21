'use strict';

var Email = require('../lib/email');
var assert = require('assert');
var serverHelper = require('../lib/server_helper');

marionette('email message list edit mode', function() {
  var app;
  var client = marionette.client();

  var server = serverHelper.use(null, this);

  setup(function() {
    app = new Email(client);
    app.launch();
    app.manualSetupImapEmail(server);
  });

  test('only one input should appear', function() {
    app.tapSearchArea();

    var inputs = app.getVisibleCardInputs();
    assert.equal(inputs.length, 1);
  });

});
