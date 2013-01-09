requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/templates/account.js');
  requireApp('calendar/js/presets.js');
  requireApp('calendar/js/views/create_account.js');
});

suite('views/create_account', function() {

  var subject;
  var template;
  var app;

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="create-account-view">',
        '<button class="cancel">cancel</button>',
        '<ul id="create-account-presets"></ul>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();

    template = Calendar.Templates.Account;
    subject = new Calendar.Views.CreateAccount({
      app: app
    });
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

  suite('#_initEvents', function() {

    test('when an account is added', function() {
      var store = app.store('Account');
      var renderCalled = false;
      subject.render = function() {
        renderCalled = true;
      };

      store.emit('add');

      assert.equal(renderCalled, true);
    });

    test('when an account is removed', function() {
      var store = app.store('Account');
      var renderCalled = false;
      subject.render = function() {
        renderCalled = true;
      };

      store.emit('remove');

      assert.equal(renderCalled, true);
    });


  });

  suite('#render', function() {
    var presets;

    setup(function() {
      presets = Object.keys(Calendar.Presets);
      subject.accounts.innerHTML = '__MARKER__';
    });

    test('preset marked for single use', function() {

      var store = app.store('Account');
      subject.presets = {
        'one': {
          singleUse: true,
          providerType: 'local'
        },
        'two': {
          singleUse: true,
          providerType: 'local'
        }
      };

      store.presetActive = function(name) {
        return name === 'local';
      };

      subject.render();

      assert.ok(
        subject.accounts.innerHTML.indexOf('__MARKER__') === -1
      );

      var html = subject.accounts.innerHTML;
      assert.ok(html);
      var hasLocal = (html.indexOf('local') !== -1);

      assert.isFalse(
        hasLocal,
        'single use presets should not be displayed'
      );

    });

    test('dom update', function() {
      subject.render();

      var html = subject.accounts.innerHTML;

      assert.ok(html);

      presets.forEach(function(val) {
        assert.include(
          html,
          template.provider.render({ name: val })
        );
      });
    });
  });

});
