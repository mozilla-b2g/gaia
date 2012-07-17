requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/ext/gesture_detector.js');
  requireApp('calendar/js/views/settings.js');
});

suite('views/settings', function() {

  var subject;
  var app;
  var controller;
  var busytimes;


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
        '<div id="settings-calendars"></div>',
        '<div id="settings-accounts"></div>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    controller = app.timeController;

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

  test('#outside', function() {
    assert.ok(subject.outside);
  });

  test('#element', function() {
    assert.equal(subject.element.id, 'settings');
  });

  suite('#_handleOutsideClick', function() {
    var page;

    setup(function() {
      page = Calendar.Test.FakePage;
    });

    test('fallback', function() {
      window.history.replaceState(
        {},
        'test',
        subject.selfPath
      );

      subject._savedPath = subject.selfPath;
      subject.onactive();

      triggerEvent(subject.outside, 'click');
      assert.equal(page.shown, subject.fallbackPath);
    });

    test('active', function() {
      subject.onactive();
      subject._savedPath = '/foo';

      triggerEvent(subject.outside, 'click');
      assert.equal(page.shown, '/foo');
      page.shown = null;

      subject.oninactive();

      triggerEvent(subject.outside, 'click');
      assert.equal(page.shown, null);
    });

    test('inactive', function() {
      subject._savedPath = '/foo';

      triggerEvent(subject.outside, 'click');
      assert.ok(!page.shown);
    });

  });

});
