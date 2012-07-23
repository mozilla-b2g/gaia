requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  requireLib('templates/calendar.js');
  requireLib('views/settings.js');
});

suite('views/settings', function() {

  var subject;
  var app;
  var store;
  var controller;
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
      '<div id="wrapper"></div>',
      '<div id="settings">',
        '<ul class="calendars"></ul>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;
    store = app.store('Calendar');
    template = Calendar.Templates.Calendar;

    subject = new Calendar.Views.Settings({
      app: app
    });
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject.app, app);
    assert.equal(
      subject.element, document.querySelector('#settings')
    );
  });

  test('#calendars', function() {
    assert.ok(subject.calendars);
  });

  suite('#_initEvents', function() {

    var models;
    var children;

    setup(function() {
      models = {};
      // render out one model
      models[1] = {
        name: 'first',
        localDisplayed: true,
        _id: 'one'
      };

      store._cached = models;
      subject.render();
      children = subject.calendars.children;
    });

    test('update', function() {
      var check = children[0].querySelector(
        '*[type="checkbox"]'
      );

      models[1].name = 'foo';
      models[1].localDisplayed = false;

      store.emit('update', 'one', models[1]);

      assert.equal(children[0].textContent, 'foo');
      assert.isFalse(
        check.checked
      );
    });

    test('add', function() {
      models[2] = {
        name: 'second',
        localDisplayed: false,
        _id: 'two'
      };

      assert.equal(children.length, 1);
      store.emit('add', 'two', models[2]);
      assert.equal(children.length, 2);

      assert.equal(children[1].textContent, 'second');
    });

    test('remove', function() {
      store.emit('remove', 'one');
      assert.equal(children.length, 0);
    });

  });

  suite('#render', function() {
    var models = {};

    setup(function() {
      models[1] = {
        name: 'First',
        localDisplayed: true,
        _id: 1
      };

      models[2] = {
        name: 'Second',
        localDisplayed: false,
        _id: 2
      };
      store._cached = models;
      subject.render();
    });

    test('output', function() {
      var children = subject.calendars.children;
      assert.equal(children.length, 2);

      var one = children[0];
      var two = children[1];

      assert.equal(one.textContent, models[1].name);
      assert.equal(two.textContent, models[2].name);

      assert.isTrue(
        one.querySelector('*[type="checkbox"]').checked
      );

      assert.isFalse(
        two.querySelector('*[type="checkbox"]').checked
      );
    });

  });

});
