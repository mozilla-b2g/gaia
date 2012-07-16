requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/templates/account.js');
  requireApp('calendar/js/presets.js');
  requireApp('calendar/js/views/create_account.js');
});

suite('views/create_account', function() {

  var subject;
  var template;


  function triggerEvent(element, eventName) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(eventName, true, true);
    element.dispatchEvent(event);
  }

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="create-account-view">',
        '<ul id="create-account-presets"></ul>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    template = Calendar.Templates.Account;
    subject = new Calendar.Views.CreateAccount();
  });

  test('#element', function() {
    var el = document.querySelector(subject.selectors.element);
    assert.ok(el);

    assert.equal(subject.element, el);
  });

  test('#accounts', function() {
    assert.equal(
      subject.accounts,
      document.querySelector(subject.selectors.accounts)
    );
  });

  suite('#render', function() {
    var presets;

    setup(function() {
      presets = Object.keys(Calendar.Presets);
      subject.render();
    });

    test('dom update', function() {
      var html = subject.accounts.innerHTML;

      assert.ok(html);

      presets.forEach(function(val) {
        assert.include(
          html,
          template.accountItem.render({ name: val })
        );
      });
    });
  });

});
