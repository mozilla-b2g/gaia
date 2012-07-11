requireCommon('test/synthetic_gestures.js');

requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/js/ext/gesture_detector.js');
  requireCalendarController();
  requireApp('calendar/js/views/settings.js');
});

suite('views/settings', function() {

  var subject,
    controller,
    busytimes;


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
      '<div id="settings">',
        '<button class="toggle-settings"></button>',
        '<button id="toggle-settings"></button>',
        '<ul id="calendar-list"></ul>',
        '<a id="more-settings" href="#foo"></a>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    controller = createController();

    subject = new Calendar.Views.Settings({
      controller: controller
    });
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.equal(subject.controller, controller);
    assert.equal(
      subject.element, document.querySelector('#settings')
    );
  });

  test('#element', function() {
    assert.equal(subject.element.id, 'settings');
  });

  test('#settingsElements', function() {
    assert.ok(subject.settingsElements);
  });

  suite('_initEvents', function() {

    test('default mode', function() {
      assert.ok(!subject.element.classList.contains(
        subject.activeClass
      ));
    });

    test('when entering settings', function() {
      controller.setInSettings(true);

      assert.ok(subject.element.classList.contains(
        subject.activeClass
      ));
    });

    test('clicking show settings', function() {
      controller.setInSettings(false);
      triggerEvent(subject.settingsElements[0], 'click');

      assert.isTrue(controller.inSettings);
      assert.isTrue(document.body.classList.contains(
        subject.bodyClass
      ));
    });

    test('clicking hide settings', function() {
      controller.setInSettings(true);
      triggerEvent(subject.settingsElements[1], 'click');

      assert.isFalse(controller.inSettings);
      assert.isFalse(document.body.classList.contains(
        subject.bodyClass
      ));
    });

  });

});
