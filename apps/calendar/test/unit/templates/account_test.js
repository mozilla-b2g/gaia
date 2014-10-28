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
    assert.include(output, 'li class="yahoo" role="presentation"');
    assert.include(output, 'a data-l10n-id="preset-yahoo" role="option"');
  });

  test('#account', function() {
    var output = renderHTML('account', { id: '1' });

    assert.include(output, 'li id="account-1" role="presentation"');
    assert.include(output, 'a href="/update-account/1" role="option"');
  });
});

});
