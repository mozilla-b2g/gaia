requireApp('calendar/test/unit/helper.js', function() {
  requireLib('template.js');
  requireLib('templates/account.js');
});

suite('templates/account', function() {
  var subject;

  suiteSetup(function() {
    subject = Calendar.Templates.Account;
  });

  function renderHTML(type, options) {
    return subject[type].render(options);
  }

  test('#provider', function() {
    var output = renderHTML('provider', {
      name: 'yahoo'
    });

    assert.include(output, 'yahoo');
  });


});
