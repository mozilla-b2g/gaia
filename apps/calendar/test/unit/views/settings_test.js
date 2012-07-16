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

  test('#calendars', function() {
    assert.ok(subject.calendars);
  });

  test('#accounts', function() {
    assert.ok(subject.accounts);
  });

  suite('show functions', function() {
    var cals;
    var accounts;
    var active;

    setup(function() {
      cals = subject.calendars;
      accounts = subject.accounts;
      active = subject.activeClass;
    });

    test('#showCalendars', function() {
      cals.classList.remove(active);
      accounts.classList.add(active);

      subject.showCalendars();

      assert.isTrue(cals.classList.contains(active));
      assert.isFalse(accounts.classList.contains(active));
    });

    test('#showAccounts', function() {
      accounts.classList.remove(active);
      cals.classList.add(active);

      subject.showAccounts();

      assert.isTrue(accounts.classList.contains(active));
      assert.isFalse(cals.classList.contains(active));
    });

  });

});
