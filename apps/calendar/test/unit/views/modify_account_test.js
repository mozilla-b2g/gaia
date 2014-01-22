requireLib('oauth_window.js');
requireLib('provider/abstract.js');
requireLib('provider/local.js');

suiteGroup('Views.ModifyAccount', function() {
  var subject;
  var account;
  var triggerEvent;
  var app;

  var mozApp = {};

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
  var realMozApps;
  function setupOauth() {
    realMozApps = navigator.mozApps;
    RealOAuth = Calendar.OAuthWindow;
    Calendar.OAuthWindow = MockOAuth;

    navigator.mozApps = {
      getSelf: function() {
        var req = {};
        Calendar.nextTick(function() {
          if (req.onsuccess) {
            req.onsuccess({
              target: {
                result: mozApp
              }
            });
          }
        });

        return req;
      }
    };
  };

  function teardownOauth() {
    Calendar.OAuthWindow = RealOAuth;
    navigator.mozApps = realMozApps;
  };

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

  // template
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
        '<a class="force-oauth2"></a>',
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
  });

  // db
  setup(function(done) {
    app = testSupport.calendar.app();

    account = Factory('account', { _id: 1 });

    // assumes account is in a "modify" state
    subject = new Calendar.Views.ModifyAccount({
      app: app,
      model: account
    });

    app.db.open(function() {
      app.store('Account').persist(account, done);
    });
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

  test('#authenticationType', function() {
    assert.equal(subject.authenticationType, 'basic');
  });

  test('#oauth2Window', function() {
    assert.ok(subject.oauth2Window);
  });

  test('#oauth2SignIn', function() {
    assert.ok(subject.oauth2SignIn);
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

      assert.ok(calledRemove, 'called remove');
      assert.equal(calledRemove[0], model._id, 'removes right id');

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

  test('#updateForm', function() {
    account.user = 'james';
    //we never display the password.
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

    test('new', function(done) {
      subject.ondispatch = function() {
        done(function() {
          assert.instanceOf(
            subject.model,
            Calendar.Models.Account,
            'creates model'
          );

          assert.hasProperties(
            subject.model,
            Calendar.Presets.local.options,
            'uses preset options'
          );

          assert.equal(subject.preset, Calendar.Presets.local);
          assert.equal(subject.completeUrl, '/settings/');
        });
      };

      subject.dispatch({
        params: { preset: 'local' }
      });
    });

    test('existing', function(done) {
      var destroyed;

      subject.model = {};
      subject.destroy = function() {
        destroyed = true;
      };

      subject.ondispatch = function() {
        done(function() {
          assert.ok(destroyed, 'should destroy previous state');
          assert.equal(subject.completeUrl, '/settings/');

          assert.hasProperties(
            account,
            subject.model,
            'loads account'
          );
        });
      };

      subject.dispatch({
        // send as string to emulate real conditions
        params: { id: String(account._id) }
      });
    });
  });

  suite('#render', function() {
    suite('with error', function() {
      setup(function() {
        account.error = {};
        subject.render();
      });

      test('has .error class', function() {
        assert.isTrue(hasClass('error'));
      });
    });

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
        assert.isFalse(hasClass('error'));
        assert.isTrue(hasClass(subject.type));
        assert.isTrue(hasClass('preset-' + account.preset));
        assert.isTrue(hasClass('provider-' + account.providerType));
        assert.isTrue(hasClass('auth-' + subject.authenticationType));
      });
    });

    suite('oauth flow', function() {
      var callsSave;

      suiteSetup(setupOauth);
      suiteTeardown(teardownOauth);

      var clearsCookies;
      mozApp = {
        clearBrowserData: function() {
          var req = {};

          Calendar.nextTick(function() {
            clearsCookies = true;
            req.onsuccess && req.onsuccess();
          });
          return req;
        }
      };

      setup(function(done) {
        clearsCookies = false;
        subject.save = function() {
          callsSave = true;
        };

        // Oauth flows are only for new accounts
        subject.model = {};

        subject.preset = Calendar.Presets.google;
        subject.render();

        var realFlow = subject._redirectToOAuthFlow;
        subject._redirectToOAuthFlow = function() {
          realFlow.apply(this, arguments);
          done();
        };
      });

      test('clears cookies', function() {
        assert.ok(clearsCookies, 'cookies where cleared');
      });

      test('authenticationType', function() {
        assert.equal(
          subject.authenticationType,
          subject.preset.authenticationType,
          'sets authentication type to preset'
        );
      });

      test('class names', function() {
        assert.isTrue(hasClass('auth-' + subject.authenticationType));
      });

      test('oauth dialog comples with error', function(done) {
        subject.cancel = done;
        assert.ok(subject._oauthDialog, 'has dialog');
        subject._oauthDialog.oncomplete({ error: 'access_denied' });
      });

      test('oauth flow is a success', function() {
        var code = 'xxx';
        assert.ok(subject._oauthDialog, 'has dialog');
        subject._oauthDialog.oncomplete({ code: code });
        assert.equal(subject.model.oauth.code, code, 'sets code');
        assert.ok(callsSave);
      });
    });

    suite('modify oauth account', function() {

      suiteSetup(setupOauth);
      suiteTeardown(teardownOauth);

      setup(function() {
        subject.preset = Calendar.Presets.google;
        subject.render();
      });

      test('oauth flow is not triggered', function() {
        assert.equal(subject._oauthDialog, undefined, 'does not have dialog');
        assert.ok(subject.fields.user.disabled);
      });

      test('force sign in', function() {
        // stub out real oauth flow window to prevent failures
        subject._redirectToOAuthFlow = function() {};

        assert.ok(
          !subject.oauth2Window.classList.contains('active'),
          'is inactive before click'
        );

        triggerEvent(subject.oauth2SignIn, 'click');

        assert.ok(
          subject.oauth2Window.classList.contains('active'), 'shows oauth2'
        );
      });

    });

  });

  suite('#destroy', function() {
    suite('normal flow', function() {
      setup(function() {
        subject.model.error = {};
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
        assert.equal(subject.fields.user.disabled, false,
          're-enable username field');
      });

      test('type class', function() {
        assert.isFalse(hasClass(subject.type));
        assert.isFalse(hasClass('error'));
        assert.isFalse(hasClass('preset-' + account.preset));
        assert.isFalse(hasClass('provider-' + account.providerType));
      });
    });

    suite('oauth2 edit flow', function() {
      setup(function() {
        subject.preset = Calendar.Presets.google;
        subject.model._id = 1;

        assert.equal(subject.authenticationType, 'oauth2');
        subject.render();
        subject.destroy();
      });

      test('should disable force display of oauth2', function() {
        triggerEvent(subject.oauth2SignIn, 'click');
        assert.ok(
          !subject.oauth2Window.classList.contains('active'),
          'is ignored after destroy'
        );
      });
    });

    suite('submit form', function() {

      setup(function() {
        account.user = 'foo';
        subject.fields.password.value = 'foo';
        subject.render();
      });

      test('default is prevented', function(done) {
        subject.element.addEventListener('submit', function(e) {
          assert.ok(e.defaultPrevented);
          done();
        });

        subject.accountHandler.send = function(model) {};

        triggerEvent(subject.form, 'submit');
      });

    });
  });

});
