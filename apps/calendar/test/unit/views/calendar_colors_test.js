requireApp('calendar/test/unit/helper.js', function() {
  requireLib('models/calendar.js');
  requireLib('views/calendar_colors.js');
});

suite('views/calendar_colors', function() {

  var subject;
  var model;
  var app;
  var store;

  setup(function() {
    this.timeout(5000);

    app = testSupport.calendar.app();
    store = app.store('Calendar');
    subject = new Calendar.Views.CalendarColors();

    model = Factory.create('calendar', {
      _id: '1xx',
      localDisplayed: true
    });
  });

  test('initialization', function() {
    assert.deepEqual(subject.colorMap, {});
    assert.deepEqual(subject._ruleMap, {});
    assert.instanceOf(subject._styles, CSSStyleSheet);
  });

  test('#getId', function() {
    var expected = 'calendar-id-1xx';
    assert.equal(subject.getId(model), expected);
    assert.equal(subject.getId('1xx'), expected);
  });

  suite('#render', function() {
    var calledWith;
    var first = {};
    var second = {};

    setup(function() {
      calledWith = [];
      subject.updateRule = function(item) {
        calledWith.push(item);
      }

      store.cached[0] = first;
      store.cached[1] = second;

      subject.render();
    });

    test('calls update', function() {
      assert.deepEqual(calledWith, [first, second]);
    });

  });

  suite('#handleEvent', function() {
    var calls;

    setup(function() {
      calls = {
        add: [],
        remove: []
      };

      subject.updateRule = function(item) {
        calls.add.push(item);
      }

      subject.removeRule = function(item) {
        calls.remove.push(item);
      }
    });

    test('type: persist', function() {
      store.emit('persist', model._id, model);

      assert.deepEqual(calls.add, [model]);
    });

    test('type: remove', function() {
      store.emit('remove', model._id);
      assert.deepEqual(calls.remove, [model._id]);
    });
  });

  suite('#removeRule', function() {
    return;

    test('when it does not exist', function() {
      subject.removeRule(model);
    });

    test('when it exists', function() {
      var id = subject.getId(model);

      subject.updateRule(model);
      subject.removeRule(model._id);

      assert.ok(!subject.colorMap[id], 'removed color map');
      assert.ok(!subject._ruleMap[id], 'removed rule map');

      var rules = subject._styles.cssRules;

      assert.equal(rules.length, 0, 'should remove css rules');
    });

  });

  suite('#updateRule', function() {

    test('first time', function() {
      var id = subject.getId(model);
      assert.ok(!subject.colorMap[id]);
      subject.updateRule(model);

      assert.equal(subject.colorMap[id], model.color);

      // check that the actual style is flushed to the dom...
      assert.equal(subject._styles.cssRules.length, 2);
      var bgRule = subject._styles.cssRules[0];
      var displayRule = subject._styles.cssRules[1];

      assert.include(bgRule.selectorText, subject.getId(model._id));
      assert.include(bgRule.selectorText, 'calendar-color');

      assert.include(displayRule.selectorText, subject.getId(model._id));
      assert.include(displayRule.selectorText, 'calendar-display');

      // it may do the RGB conversion so its not strictly equal...
      assert.ok(
        bgRule.style.backgroundColor,
        'should have set background color'
      );
    });

    test('first time hidden', function() {
      model.localDisplayed = false;
      subject.updateRule(model);

      // check that the actual style is flushed to the dom...
      var bgRule = subject._styles.cssRules[0];

      // it may do the RGB conversion so its not strictly equal...
      assert.ok(
        bgRule.style.backgroundColor,
        'should have set background color'
      );

      var displayRule = subject._styles.cssRules[1];
      assert.equal(
        displayRule.style.display, 'none',
        'should set display to none'
      );
    });

    test('second time', function() {
      subject.updateRule(model);

      var bgStyle = subject._styles.cssRules[0].style;
      var displayStyle = subject._styles.cssRules[1].style;

      var oldColor = bgStyle.backgroundColor;

      model.remote.color = '#FAFAFA';

      subject.updateRule(model);

      assert.notEqual(bgStyle.backgroundColor, oldColor, 'should change color');


      model.localDisplayed = false;
      subject.updateRule(model);

      assert.equal(displayStyle.display, 'none');

      model.localDisplayed = true;
      subject.updateRule(model);
      assert.equal(displayStyle.display, 'inherit');
    });


  });

});
