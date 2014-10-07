define(function(require) {
'use strict';

var Account = require('templates/account');

suite('Templates.Account', function() {
  var subject;

  suiteSetup(function() {
    subject = Account;
  });

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('#provider', function() {
    var output = renderHTML('provider', { name: 'yahoo' });

    assert.include(output, 'yahoo');
  });
});

});
