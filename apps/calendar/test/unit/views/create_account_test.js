suiteGroup('Views.CreateAccount', function() {

  var subject;
  var template;
  var app;

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function(done) {
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

    app.db.open(done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      app.db,
      ['accounts'],
      function() {
        app.db.close();
        done();
      }
    );
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
    setup(function() {
      subject.accounts.innerHTML = '__MARKER__';
    });

    suite('default calendar presets', function() {
      var presets;

      setup(function(done) {
        presets = Object.keys(Calendar.Presets);
        subject.render();
        subject.onrender = done;
      });

      test('each preset is displayed', function() {
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

    suite('with preset marked for single use', function() {
      setup(function(done) {
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

        var accountStore = app.store('Account');

        accountStore.persist({ preset: 'one' }, function() {
          subject.render();
          subject.onrender = done;
        });
      });

      test('hides used single use presets', function() {
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
    });

  });

});
