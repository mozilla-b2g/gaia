requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/templates/account.js');
  requireApp('calendar/js/presets.js');
  requireApp('calendar/js/views/advanced_settings.js');
});

suite('views/advanced_settings', function() {

  var subject;
  var template;
  var app;
  var store;
  var fixtures = {
    a: {
      _id: 'a',
      preset: 'foo',
      user: 'a@yahoo.com'
    },

    b: {
      _id: 'b',
      preset: 'foo',
      user: 'b@yahoo.com'
    }
  };

  function modelHtml(object) {
    return template.account.render(
      subject._formatModel(object)
    );
  }

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="advanced-settings-view">',
        '<ul class="account-list"></ul>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();

    template = Calendar.Templates.Account;
    subject = new Calendar.Views.AdvancedSettings({
      app: app
    });

    store = app.store('Account');
  });

  test('#accountList', function() {
    assert.ok(subject.accountList);
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
      store.emit('add', object._id, object);
    });

    test('#add', function() {
      var item = children[children.length - 1];

      assert.equal(
        item.outerHTML,
        modelHtml(object)
      );
    });

    test('remove', function() {
      // add a new one first
      store.emit('add', fixtures.b._id, fixtures.b);

      assert.equal(children.length, 2);

      // remove the old one
      store.emit('remove', object._id);

      assert.equal(children.length, 1);

      assert.equal(
        children[0].outerHTML,
        modelHtml(fixtures.b)
      );
    });

  });

  suite('#render', function() {
    var result;
    var list;

    setup(function() {
      var store = app.store('Account');
      list = subject.accountList;
      store._accounts = fixtures;
      subject.render();
      result = subject.element.innerHTML;
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

    test('result', function() {
      checkItem(0, 'a');
      checkItem(1, 'b');
    });
  });

});
