requireLib('provider/abstract.js');
requireLib('provider/local.js');

suiteGroup('Views.ModifyAccount', function() {

  var subject;
  var account;
  var triggerEvent;
  var app;

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  function hasClass(value) {
    return subject.element.classList.contains(value);
  }

  function getField(name) {
    return subject.fields[name];
  }

  function fieldValue(name) {
    var field = getField(name);
    return field.value;
  }

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="modify-account-view">',
        '<button class="save">save</button>',
        '<button class="cancel">cancel</button>',
        '<button class="delete-cancel">cancel</button>',
        '<section role="status">',
          '<div class="errors"></div>',
        '</section>',
        '<form>',
          '<input name="user" />',
          '<input name="password" />',
          '<input name="fullUrl" />',
        '</form>',
        '<button class="delete-confirm">',
      '</div>',
      '<section id="oauth2">',
        '<header>',
          '<button class="cancel">',
            '<a>cancel</a>',
          '</button>',
          '<h1 class="toolbar"></h1>',
        '</header>',
        '<div class="browser-container"></div>',
      '</section>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();

    account = Factory('account');

    subject = new Calendar.Views.ModifyAccount({
      app: app,
      model: account
    });
  });

  suite('initialization', function() {

    test('when given correct fields', function() {
      var subject = new Calendar.Views.ModifyAccount({
        model: account,
        type: 'new'
      });

      assert.instanceOf(
        subject.accountHandler,
        Calendar.Utils.AccountCreation
      );
    });

  });

  test('#oauth2Window', function() {
    assert.ok(subject.oauth2Window);
  });

  test('#deleteButton', function() {
    assert.ok(subject.deleteButton);
  });

  test('#saveButton', function() {
    assert.ok(subject.saveButton);
  });

  test('#errors', function() {
    assert.ok(subject.errors);
  });

  test('#form', function() {
    assert.ok(subject.form);
  });

  suite('#handleEvent', function() {
    var handler;
    var showErrorCall;

    setup(function() {
      handler = subject.accountHandler;
      subject.showErrors = function() {
        showErrorCall = arguments;
      };
    });

    test('authorizeError', function() {
      var sentErr = new Error();
      handler.emit('authorizeError', sentErr);

      assert.deepEqual(
        showErrorCall,
        [sentErr]
      );
    });
  });

  test('#fields', function() {
    var result = subject.fields;

    function hasName(field) {
      var value = result[field].getAttribute('name');
      assert.equal(value, field);
    }

    hasName('user');
    hasName('password');
    hasName('fullUrl');
  });

  suite('#deleteRecord', function() {
    var calledShow;
    var calledRemove;

    setup(function() {

      var store = app.store('Account');
      // we don't really need to redirect
      // in the test just confirm that it does
      app.router.show = function() {
        calledShow = arguments;
      };

      // again fake model so we do a fake remove
      store.remove = function() {
        calledRemove = arguments;
      };
    });

    test('with existing model', function() {
      // assign model to simulate
      // a record that has been dispatched
      var model = Factory('account');
      model._id = 'myaccount';
      subject.model = model;
      subject.render();

      triggerEvent(subject.deleteButton, 'click');

      assert.ok(!calledShow, 'did not redirect before-removal');
      assert.ok(calledRemove, 'called remove');
      assert.equal(calledRemove[0], model._id, 'removes right id');

      var removeCb = calledRemove[calledRemove.length - 1];

      removeCb();

      assert.deepEqual(
        calledShow,
        ['/advanced-settings/']
      );
    });
  });

  suite('#save', function() {

    var calledWith;

    setup(function() {
      calledWith = null;
      subject.completeUrl = '/settings';
      Calendar.Test.FakePage.shown = null;

      subject.accountHandler.send = function() {
        calledWith = arguments;
      };
    });

    test('clears errors', function() {
      subject.errors.textContent = 'foo';
      subject.save();
      assert.ok(!subject.errors.textContent, 'clears text');
    });

    test('with updateModel option', function() {
      subject.fields['user'].value = 'iupdatedu';
      subject.save({ updateModel: true });
      assert.equal(subject.model.user, 'iupdatedu');
    });

    test('on success', function() {
      subject.save();
      assert.isTrue(hasClass(subject.progressClass));

      assert.equal(calledWith[0], subject.model);
      calledWith[1]();

      assert.equal(
        Calendar.Test.FakePage.shown,
        subject.completeUrl,
        'redirects to complete url'
      );

      assert.isFalse(
        hasClass(subject.progressClass),
        'disabled progress class'
      );
    });

    test('on failure', function() {
      subject.save();
      assert.ok(calledWith, 'sends request');
      assert.equal(calledWith[0], subject.model);

      assert.isTrue(hasClass(subject.progressClass));
      calledWith[1](new Error());

      assert.ok(
        !hasClass(subject.progressClass),
        'hides progress'
      );

      assert.notEqual(
        Calendar.Test.FakePage.shown,
        subject.completeUrl,
        'does not redirect on complete'
      );
    });

  });

  test('#_createModel', function() {
    var preset = 'local';

    subject.model = null;

    var model = subject._createModel(preset);

    assert.instanceOf(model, Calendar.Models.Account);

    assert.equal(
      model.providerType,
      Calendar.Presets.local.providerType
    );
  });

  test('#_updateModel', function() {
    var model = new Calendar.Models.Account();
    var store = app.store('Account');
    store._cached['1'] = model;

    var data = subject._updateModel('1');

    assert.equal(model, data);
  });

  test('#updateForm', function() {
    account.user = 'james';
    //we never displa the password.
    account.password = 'baz';
    account.fullUrl = 'http://google.com/path/';

    subject.updateForm();

    var fields = subject.fields;

    assert.equal(fieldValue('user'), 'james');
    assert.equal(fieldValue('password'), '');
    assert.equal(fieldValue('fullUrl'), 'http://google.com/path/');
  });

  test('#updateModel', function() {
    var fields = subject.fields;
    fields.user.value = 'user';
    fields.password.value = 'pass';
    fields.fullUrl.value = 'http://google.com/foo/';

    subject.updateModel();

    assert.equal(account.user, 'user');
    assert.equal(account.password, 'pass');
    assert.equal(account.fullUrl, 'http://google.com/foo/');
  });

  suite('#dispatch', function() {
    var rendered;
    var model;

    setup(function() {
      rendered = false;
      model = {};
      subject.render = function() {
        rendered = true;
      };
    });

    test('new', function() {
      var calledWith;
      model = Factory('account');
      subject._createModel = function() {
        calledWith = arguments;
        return model;
      };

      subject.dispatch({
        params: { preset: 'local' }
      });

      assert.equal(subject.completeUrl, '/settings/');
      assert.equal(calledWith[0], 'local');
      assert.equal(subject.model, model);
      assert.ok(rendered);
    });

    test('existing', function() {
      var calledWith;
      var destroyed;

      model = Factory('account', { 'preset': 'local' });
      subject.destroy = function() {
        destroyed = true;
      };

      subject._updateModel = function() {
        calledWith = arguments;
        return model;
      };

      subject.dispatch({
        params: { id: '1' }
      });

      assert.ok(destroyed, 'should destroy previous state');
      assert.equal(subject.completeUrl, '/settings/');
      assert.equal(calledWith[0], '1');
      assert.equal(subject.model, model);
      assert.ok(rendered);
    });

  });

  suite('#render', function() {
    suite('normal flow', function() {

      setup(function() {
        account.user = 'foo';
        subject.fields.password.value = 'foo';
        subject.render();
      });

      test('save button', function(done) {
        var called;
        subject.fields.user.value = 'updated';

        subject.accountHandler.send = function(model) {
          done(function() {
            assert.equal(
              model.user,
              subject.fields.user.value,
              'updates fields'
            );
          });
        };

        triggerEvent(subject.saveButton, 'click');
      });

      test('type', function(done) {
        assert.ok(subject.type);
        done();
      });

      test('update', function(done) {
        assert.equal(subject.fields.user.value, 'foo');
        done();
      });

      test('clear password', function() {
        assert.equal(subject.fields.password.value, '');
      });

      test('type class', function() {
        assert.isTrue(hasClass(subject.type));
        assert.isTrue(hasClass('preset-' + account.preset));
        assert.isTrue(hasClass('provider-' + account.providerType));
      });
    });

    suite('oauth flow', function() {
      var callsSave;
      var MockOAuth = function(server, params) {
        this.server = server;
        this.params = params;

        this.open = function() {
          this.isOpen = true;
        };

        this.close = function() {
          this.isOpen = false;
        };
      };

      var RealOAuth;
      suiteSetup(function() {
        RealOAuth = Calendar.OAuthWindow;
        Calendar.OAuthWindow = MockOAuth;
      });

      suiteTeardown(function() {
        Calendar.OAuthWindow = RealOAuth;
      });

      setup(function() {
        subject.save = function() {
          callsSave = true;
        };

        subject.preset = Calendar.Presets.google;
        subject.render();
      });

      test('oauth flow is a success', function() {
        var code = 'xxx';
        assert.ok(subject._oauthDialog, 'has dialog');
        subject._oauthDialog.oncomplete({ code: code });
        assert.equal(subject.model.oauth.code, code, 'sets code');
        assert.ok(callsSave);
      });

      test('oauth flow is aborted', function(done) {
        subject.cancel = done;
        subject._oauthDialog.onabort();
      });
    });
  });

  suite('#destroy', function() {
    setup(function() {
      subject.render();
      subject.destroy();
    });

    test('save button', function() {
      var called;

      subject._persistForm = function() {
        called = true;
      };

      triggerEvent(subject.saveButton, 'click');
      assert.ok(!called);
    });

    test('fields', function() {
      assert.equal(subject._fields, null);
    });

    test('type class', function() {
      assert.isFalse(hasClass(subject.type));
      assert.isFalse(hasClass('preset-' + account.preset));
      assert.isFalse(hasClass('provider-' + account.providerType));
    });

  });

});
