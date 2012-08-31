requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/views/modify_event.js');
});

suite('views/modify_event', function() {

  var subject;
  var event;
  var app;
  var store;
  var fmt;
  var event;
  var remote;

  function triggerEvent(element, eventName) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(eventName, true, true);
    element.dispatchEvent(event);
  }

  function hasClass(value) {
    return subject.element.classList.contains(value);
  }

  function getField(name) {
    return subject.getField(name);
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
      '<div id="modify-event-view">',
        '<button class="save">save</button>',
        '<div class="errors"></div>',
        '<form>',
          '<input name="title" />',
          '<input name="startDate" />',
          '<input name="endDate" />',
          '<input name="startTime" />',
          '<input name="endTime" />',
          '<input name="location" />',
          '<input name="description" />',
        '</form>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    store = app.store('Event');

    fmt = navigator.mozL10n.DateTimeFormat();

    event = Factory('event');
    remote = event.remote;

    subject = new Calendar.Views.ModifyEvent({
      app: app
    });
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject._changeToken, 0);

    assert.deepEqual(subject._fields, {});
  });

  test('form', function() {
    assert.ok(subject.form);
    assert.equal(subject.form.tagName.toLowerCase(), 'form');
  });

  suite('#_loadModel', function() {
    var calledUpdate;
    var calledLoad;

    setup(function() {
      calledLoad = null;
      calledUpdate = null;

      store.findByIds = function() {
        calledLoad = arguments;
      }

      subject._updateForm = function() {
        calledUpdate = arguments;
      }
    });

    test('when change token is same', function() {
      var token = subject._changeToken;
      var obj = {};

      subject._loadModel(1);
      assert.deepEqual(calledLoad[0], [1]);
      // changes sync token
      assert.equal(
        subject._changeToken, token + 1, 'should increment token'
      );

      var cb = calledLoad[1];
      cb(null, {1: obj});

      assert.equal(subject.model, obj);
      assert.ok(calledUpdate);
    });

    test('when change token is different', function() {
      var token = subject._changeToken;
      subject._loadModel(1);
      assert.deepEqual(calledLoad[0], [1]);
      // changes sync token
      assert.equal(
        subject._changeToken, token + 1, 'should increment token'
      );

      subject._changeToken = 100;

      var cb = calledLoad[1];
      cb(null, [{1: ''}]);

      assert.ok(!subject.model);
      assert.ok(!calledUpdate, 'should not update form if token has changed');
    });

  });

  test('#_getField', function() {
    var expected = subject.form.querySelector('[name="title"]');
    assert.ok(expected);
    assert.equal(expected.tagName.toLowerCase(), 'input');

    var result = subject.getField('title');

    assert.equal(result, expected);
    assert.equal(result, subject.getField('title'));
    assert.equal(subject._fields.title, expected);
  });

  test('#_updateForm', function() {
    // just to verify we actually clear fields...
    getField('title').value = 'foo';

    subject.model = event;
    event.remote.description = '<span>foo</span>';

    var expected = {
      title: remote.title,
      location: remote.location,
      startDate: fmt.localeDateString(remote.startDate),
      startTime: fmt.localeTimeString(remote.startDate),
      endDate: fmt.localeDateString(remote.endDate),
      endTime: fmt.localeTimeString(remote.endDate)
    };

    var key;

    subject._updateForm();

    for (key in expected) {
      if (expected.hasOwnProperty(key)) {
        assert.equal(
          fieldValue(key),
          expected[key],
          'should set "' + key + '"'
        );
      }
    }

    var expected = Calendar.Template.handlers.h(
      event.remote.description
    );

    assert.equal(
      getField('description').innerHTML,
      expected
    );
  });

  test('#dispatch', function() {
    var calledWith;
    subject._loadModel = function() {
      calledWith = arguments;
    }

    subject.dispatch({
      params: {
        id: 1
      }
    });

    assert.deepEqual(calledWith, [1]);
  });

});
