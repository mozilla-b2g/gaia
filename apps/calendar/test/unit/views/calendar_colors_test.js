/*global Factory, CSSStyleSheet */
suiteGroup('Views.CalendarColors', function() {
  'use strict';

  var subject;
  var model;
  var app;
  var store;

  setup(function(done) {
    app = testSupport.calendar.app();
    store = app.store('Calendar');
    subject = new Calendar.Views.CalendarColors();

    model = Factory.create('calendar', {
      _id: '1xx',
      localDisplayed: true
    });

    app.db.open(done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      app.db,
      ['calendars'],
      function() {
        app.db.close();
        done();
      }
    );
  });

  test('initialization', function() {
    assert.deepEqual(subject.colorMap, {});
    assert.deepEqual(subject._ruleMap, {});
    assert.instanceOf(subject._styles, CSSStyleSheet);
  });

  suite('#getId', function() {
    var expected = 'calendar-id-1';

    test('string', function() {
      assert.equal(subject.getId('1'), expected);
    });

    test('numeric', function() {
      assert.equal(subject.getId(1), expected);
    });

    test('model', function() {
      var model = Factory('calendar', { _id: 1 });
      assert.equal(subject.getId(model), expected);
    });
  });

  suite('#render', function() {
    var calledWith;
    var first;
    var second;

    setup(function(done) {
      first = Factory('calendar', { _id: 'first' });
      second = Factory('calendar', { _id: 'second' });

      var trans = app.db.transaction('calendars', 'readwrite');
      trans.oncomplete = function() {
        done();
      };

      trans.onerror = function(e) {
        done(e);
      };

      store.persist(first, trans);
      store.persist(second, trans);
    });

    setup(function(done) {
      calledWith = {};
      subject.updateRule = function(item) {
        calledWith[item._id] = item;
      };

      subject.render();
      subject.onrender = done;
    });

    test('calls update', function() {
      assert.hasProperties(
        first, calledWith.first, 'displays first'
      );

      assert.hasProperties(
        second, calledWith.second, 'displays second'
      );
    });

  });

  suite('#handleEvent', function() {
    var calls;

    setup(function() {
      calls = {
        add: [],
        remove: [],
        preremove: []
      };

      subject.updateRule = function(item) {
        calls.add.push(item);
      };

      subject.removeRule = function(item) {
        calls.remove.push(item);
      };

      subject.hideCalendar = function(item) {
        calls.preremove.push(item);
      };
    });

    test('type: persist', function() {
      store.emit('persist', model._id, model);

      assert.deepEqual(calls.add, [model]);
    });

    test('type: preremove', function() {
      store.emit('preRemove', model._id);
      assert.deepEqual(calls.preremove, [model._id]);
    });

    test('type: remove', function() {
      store.emit('remove', model._id);
      assert.deepEqual(calls.remove, [model._id]);
    });
  });

  suite('#removeRule', function() {

    test('when it does not exist', function() {
      subject.removeRule(model);
    });

    test('when it exists', function() {
      var two = Factory.create('calendar', {
        _id: '2xx',
        localDisplayed: true
      });

      var three = Factory.create('calendar', {
        _id: '3xx',
        localDisplayed: true
      });

      var id = subject.getId(model);
      var rules = subject._styles.cssRules;

      subject.updateRule(three);
      subject.updateRule(model);
      subject.updateRule(two);

      subject.removeRule(two._id);
      subject.removeRule(model._id);

      assert.ok(!subject.colorMap[id], 'removed color map');
      assert.ok(!subject._ruleMap[id], 'removed rule map');

      var msg = 'remaining rules should be for 3xx';

      assert.match(rules[0].selectorText, /3xx/, msg);
      assert.match(rules[1].selectorText, /3xx/, msg);

      assert.equal(rules.length, 4, 'should remove css rules');
    });

  });

  suite('#hideCalendar', function() {
    setup(function() {
      subject.hideCalendar(model._id);
    });

    test('hides display', function() {
      // check that the actual style is flushed to the dom...
      var bgRule = subject._styles.cssRules[0];

      // it may do the RGB conversion so its not strictly equal...
      assert.ok(
        bgRule.style.backgroundColor,
        'should have set background color'
      );

      var displayRule = subject._styles.cssRules[3];
      assert.equal(
        displayRule.style.display, 'none',
        'should set display to none'
      );
    });
  });

  suite('#updateRule', function() {

    test('first time', function() {
      var id = subject.getId(model);
      assert.ok(!subject.colorMap[id]);
      subject.updateRule(model);

      assert.equal(subject.colorMap[id], model.color);

      // check that the actual style is flushed to the dom...
      assert.equal(subject._styles.cssRules.length, 4);
      var bgRule = subject._styles.cssRules[0];
      var borderRule = subject._styles.cssRules[1];
      var textRule = subject._styles.cssRules[2];
      var displayRule = subject._styles.cssRules[3];

      assert.include(bgRule.selectorText, subject.getId(model._id));
      assert.include(bgRule.selectorText, 'calendar-bg-color');

      assert.include(borderRule.selectorText, subject.getId(model._id));
      assert.include(borderRule.selectorText, 'calendar-border-color');

      assert.include(textRule.selectorText, subject.getId(model._id));
      assert.include(textRule.selectorText, 'calendar-text-color');

      assert.include(displayRule.selectorText, subject.getId(model._id));
      assert.include(displayRule.selectorText, 'calendar-display');

      // it may do the RGB conversion so its not strictly equal...
      assert.ok(
        bgRule.style.backgroundColor,
        'should have set background color'
      );

      assert.ok(borderRule.style.borderColor, 'sets border color');
      assert.ok(textRule.style.color, 'sets text color');
      assert.ok(displayRule.style.display, 'sets display');
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

      var displayRule = subject._styles.cssRules[3];
      assert.equal(
        displayRule.style.display, 'none',
        'should set display to none'
      );
    });

    test('second time', function() {
      subject.updateRule(model);

      var rules = subject._styles.cssRules;

      var bgStyle = rules[0].style;
      var borderStyle = rules[1].style;
      var textStyle = rules[2].style;
      var displayStyle = rules[3].style;

      var oldBgColor = bgStyle.backgroundColor;
      var oldBorderColor = borderStyle.borderColor;
      var oldTextColor = textStyle.color;

      model.remote.color = '#FAFAFA';

      subject.updateRule(model);

      assert.notEqual(bgStyle.backgroundColor, oldBgColor,
        'should change bg color');
      assert.notEqual(borderStyle.borderColor, oldBorderColor,
        'should change border color');
      assert.notEqual(textStyle.borderColor, oldTextColor,
        'should change text color');

      model.localDisplayed = false;
      subject.updateRule(model);

      assert.equal(displayStyle.display, 'none');

      model.localDisplayed = true;
      subject.updateRule(model);
      assert.equal(displayStyle.display, 'inherit');
    });
  });

  test('integration', function() {
    var keepOne = Factory('calendar', {
      remote: { color: 'red' }
    });

    var keepTwo = Factory('calendar', {
      remote: { color: 'black' }
    });

    subject.updateRule(keepOne);

    var toggle = Factory('calendar', {
      remote: { color: '#FAFAFA' }
    });

    function toggleN(len) {
      for (var i = 0; i < len; i++) {
        subject.updateRule(toggle);
        subject.removeRule(toggle._id);
      }
    }

    // toggle some on
    toggleN(5);

    // then add a rule
    subject.updateRule(keepTwo);

    // toggle some more
    toggleN(5);

    var rules = subject._styles.cssRules;
    // each calendar creates 4 rules (bg, border, text, display)
    assert.equal(rules.length, 8, 'two calendars rules');

    function verify(calendar, start, end) {
      for (var i = start; i < end; i++) {
        assert.ok(rules.item(i).selectorText);
        assert.include(
          rules.item(i).selectorText,
          subject.getId(calendar)
        );
      }
    }

    // verify each of the kept calendars is in the right
    // spot with all the right events.
    verify(keepOne, 0, 4);
    verify(keepTwo, 4, 8);
  });

});
