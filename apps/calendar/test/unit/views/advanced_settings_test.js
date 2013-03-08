requireLib('models/account.js');
requireLib('presets.js');
requireLib('store/setting.js');

suiteGroup('Views.AdvancedSettings', function() {

  var subject;
  var template;
  var app;
  var accountStore;
  var fixtures;
  var settings;
  var tries;
  var triggerEvent;

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  [
    'Provider.Caldav',
    'Provider.Local'
  ].forEach(function(klass) {
    suiteSetup(function(done) {
      Calendar.App.loadObject(klass, done);
    });
  });

  suiteSetup(function() {
    fixtures = {
      a: Factory('account', {
        _id: 'a',
        providerType: 'Caldav'
      }),

      b: Factory('account', {
        _id: 'b',
        providerType: 'Caldav'
      }),

      // expected not to be displayed.
      notRendered: Factory('account', {
        _id: 'c',
        providerType: 'Local'
      })
    };
  });

  function modelHtml(object) {
    return template.account.render(
      subject._formatModel(object)
    );
  }

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  var db;
  setup(function(done) {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="advanced-settings-view">',
        '<ul class="account-list"></ul>',
      '</div>',
      '<select name="syncFrequency" id="setting-sync-frequency">',
        '<option value="null">null</option>',
        '<option value="15">15</option>',
        '<option value="30">30</option>',
        '<option selected value="60">60</option>',
      '</select>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    db = app.db;

    template = Calendar.Templates.Account;
    subject = new Calendar.Views.AdvancedSettings({
      app: app
    });

    accountStore = app.store('Account');
    settings = app.store('Setting');

    app.db.open(done);
  });

  setup(function(done) {
    var trans = db.transaction('accounts', 'readwrite');

    for (var key in fixtures) {
      accountStore.persist(fixtures[key], trans);
    }

    trans.oncomplete = function() {
      done();
    };

    trans.onerror = function(e) {
      done(e);
    };
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

  test('#accountList', function() {
    assert.ok(subject.accountList);
  });

  test('#syncFrequency', function() {
    var freq = subject.syncFrequency;
    assert.ok(freq);
  });

  test('#element', function() {
    var el = document.querySelector(subject.selectors.element);
    assert.ok(el);

    assert.equal(subject.element, el);
  });

  suite('#_initEvents', function() {
    var object;
    var children;

    setup(function() {
      children = subject.accountList.children;
      object = fixtures.a;
      accountStore.emit('add', object._id, object);
    });

    test('#add', function() {
      var item = children[children.length - 1];

      assert.equal(
        item.outerHTML,
        modelHtml(object)
      );
    });

    test('add - Local provider', function() {
      accountStore.emit('add', 'foo', Factory('account', {
        providerType: 'Local'
      }));

      assert.length(children, 1, 'does not add account');
    });

    test('remove - missing id', function() {
      accountStore.emit('remove', 'foo');
    });

    test('remove', function() {
      // add a new one first
      accountStore.emit('add', fixtures.b._id, fixtures.b);

      assert.equal(children.length, 2);

      // remove the old one
      accountStore.emit('remove', object._id);

      assert.equal(children.length, 1);

      assert.equal(
        children[0].outerHTML,
        modelHtml(fixtures.b)
      );
    });

  });

  suite('#handleSettingUiChange', function() {
    var calledWith;

    setup(function() {
      calledWith = 'notcalled';
      settings.set = function(name, value) {
        if (name === 'syncFrequency') {
          calledWith = value;
        }
      };
    });

    function change(name, value) {
      var el = subject[name];
      el.value = value;
      triggerEvent(el, 'change');
    }

    suite('syncFrequency', function() {
      test('null', function() {
        change('syncFrequency', 'null');
        assert.equal(calledWith, null);
      });

      test('numeric', function() {
        change('syncFrequency', '30');
        assert.equal(calledWith, 30);
      });
    });

  });

  suite('#handleSettingDbChange', function() {
    var select;

    suite('syncFrequency', function() {
      setup(function() {
        select = subject.syncFrequency;
      });

      test('numeric 15', function() {
        select.value = 'null';
        settings.emit('syncFrequencyChange', 15);
        assert.equal(select.value, '15');
      });

      test('null', function() {
        select.value = '15';
        settings.emit('syncFrequencyChange', null);
        assert.equal(select.value, 'null');
      });
    });

  });

  suite('#render', function() {
    var list;
    var expectedSyncFreq = 30;

    setup(function(done) {
      settings.set('syncFrequency', expectedSyncFreq, done);
    });

    setup(function(done) {
      list = subject.accountList;
      accountStore._cached = fixtures;

      subject.render();
      subject.onrender = done;
    });

    test('number of items', function() {
      assert.equal(list.children.length, 2);
    });

    function checkItem(index, name) {
      var item = list.children[index];
      var model = fixtures[name];
      var expected = modelHtml(model);
      assert.equal(item.outerHTML, expected, name);
    }

    test('accounts', function() {
      checkItem(0, 'a');
      checkItem(1, 'b');
    });

    test('syncFrequency', function() {
      var element = subject.syncFrequency;
      assert.ok(
        element.value == expectedSyncFreq,
        'set to stored value'
      );
    });
  });

});
