requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/templates/account.js');
  requireApp('calendar/js/presets.js');
  requireApp('calendar/js/provider/local.js');
  requireApp('calendar/js/models/account.js');
  requireApp('calendar/js/views/modify_account.js');
});

suite('views/modify_account', function() {

  var subject;
  var account;
  var app;

  function triggerEvent(element, eventName) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(eventName, true, true);
    element.dispatchEvent(event);
  }

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
        '<div class="errors"></div>',
        '<form>',
          '<input name="user" />',
          '<input name="password" />',
          '<input name="fullUrl" />',
        '</form>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();

    account = new Calendar.Models.Account({
      providerType: 'Local',
      preset: 'local'
    });

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
    });

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

  suite('#_persistForm', function() {
    var calledSetup;
    var calledPersist;

    var store = {
      // mock out persist
      // we are not trying to
      // test db functionality here.
      persist: function(obj, callback) {
        calledPersist = arguments;
        setTimeout(function() {
          callback(null, obj);
        }, 0);
      }
    };

    setup(function() {
      calledSetup = null;
      calledPersist = null;

      // mock out account store
      app.db._stores.Account = store;

      // mock out setup
      // and save arguments
      account.setup = function() {
        var callback = arguments[arguments.length - 1];
        calledSetup = arguments;
        setTimeout(function() {
          callback(null);
        }, 0);
      }
    });

    //XXX: Do a *a lot* more testing
    suite('success', function() {

      test('result', function(done) {
        getField('user').value = 'user';
        getField('password').value = 'pass';

        subject._persistForm(function() {
          done(function() {
            assert.ok(calledPersist);
            assert.ok(calledSetup);

            var model = calledPersist[0];

            assert.equal(model.user, 'user');
            assert.equal(model.password, 'pass');
          });
        });
      });
    });
  });

  suite('#save', function() {

    var calledWith;

    setup(function() {
      calledWith = null;
      subject.completeUrl = '/settings';
    });

    test('on success', function(done) {
      subject._persistForm = function(callback) {
        setTimeout(function() {
          callback(null, true);
          done(function() {
            assert.equal(Calendar.Test.FakePage.shown, subject.completeUrl);
            assert.isFalse(hasClass(subject.progressClass));
          });
        }, 0);
      }

      subject.save();
      assert.isTrue(hasClass(subject.progressClass));
    });

    test('on failure', function(done) {
      subject._persistForm = function(callback) {
        setTimeout(function() {
          callback(new Error('ouch'));
          done(function() {
            assert.ok(!calledWith);
            assert.isFalse(hasClass(subject.progressClass));
          });
        }, 0);
      }

      subject.save();
      assert.isTrue(hasClass(subject.progressClass));
    });

  });

  test('#_clearErrors', function() {
    subject.errors.textContent = 'foo';

    subject._clearErrors();

    assert.equal(subject.errors.textContent, '');
  });

  test('#_displayError', function() {
    subject.errors.textContent = '';
    subject._displayError(new Error('foo'));
    assert.equal(subject.errors.textContent, 'foo');
  });

  test('#_createModel', function(done) {
    var preset = 'local';

    subject.model = null;

    subject._createModel(preset, function(err, model) {
      done(function() {
        assert.instanceOf(model, Calendar.Models.Account);

        assert.equal(
          model.providerType,
          Calendar.Presets.local.providerType
        );
      });
    });
  });

  test('#_updateModel', function(done) {
    var model = new Calendar.Models.Account();
    var store = app.store('Account');
    store._accounts['1'] = model;
    subject._updateModel('1', function(err, data) {
      done(function() {
        assert.equal(model, data);
      });
    });
  });

  test('#updateForm', function() {
    account.user = 'james';
    //we never display the password.
    account.password = 'baz';
    account.fullUrl = 'google.com/path';

    subject.updateForm();

    var fields = subject.fields;

    assert.equal(fieldValue('user'), 'james');
    assert.equal(fieldValue('password'), '');
    assert.equal(fieldValue('fullUrl'), 'google.com/path');
  });

  test('#updateModel', function() {
    var fields = subject.fields;
    fields.user.value = 'user';
    fields.password.value = 'pass';
    fields.fullUrl.value = 'google.com/foo';

    subject.updateModel();

    assert.equal(account.user, 'user');
    assert.equal(account.password, 'pass');
    assert.equal(account.fullUrl, 'google.com/foo');
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
      subject._createModel = function() {
        var cb = arguments[arguments.length - 1];
        calledWith = arguments;

        cb(null, model);
      }

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
      subject._updateModel = function() {
        var cb = arguments[arguments.length - 1];
        calledWith = arguments;
        cb(null, model);
      }

      subject.dispatch({
        params: { id: '1' }
      });

      assert.equal(subject.completeUrl, '/settings/');
      assert.equal(calledWith[0], '1');
      assert.equal(subject.model, model);
      assert.ok(rendered);
    });

  });

  suite('#render', function() {

    setup(function() {
      account.user = 'foo';
      subject.fields.password.value = 'foo';
      subject.render();
    });

    test('save button', function() {
      var called;

      subject._persistForm = function() {
        called = true;
      }

      triggerEvent(subject.saveButton, 'click');
      assert.ok(called);
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

  suite('#destroy', function() {
    setup(function() {
      subject.render();
      subject.destroy();
    });


    test('save button', function() {
      var called;

      subject._persistForm = function() {
        called = true;
      }

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
