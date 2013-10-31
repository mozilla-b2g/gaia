requireLib('view.js');

suite('view', function() {

  var el, subject;

  setup(function() {
    el = document.createElement('div');
    el.id = 'view';
    el.innerHTML = [
      '<section role="status">',
        '<div class="errors"></div>',
      '</section>'
    ].join('');

    document.body.appendChild(el);

    subject = new Calendar.View();

    subject.selectors = {
      element: '#view',
      errors: 'section[role="status"] .errors',
      status: 'section[role="status"]'
    };
  });

  teardown(function() {
    el.parentNode.removeChild(el);
    el = null;
  });

  suite('initialization', function() {
    test('string', function() {
      subject = new Calendar.View('#view');
      assert.equal(subject.selectors.element, '#view');
    });

    test('object', function() {
      subject = new Calendar.View({ controller: 'a' });
      assert.equal(subject.controller, 'a');
      assert.ok(!subject.selectors);
    });
  });

  test('#element', function() {
    assert.equal(subject.element.id, el.id);
  });

  test('#calendarId', function() {
    assert.equal(
      subject.calendarId('1'),
      'calendar-id-1'
    );

    assert.equal(
      subject.calendarId({ calendarId: 1 }),
      'calendar-id-1'
    );
  });

  suite('clean css', function() {
    test('#cssClean', function() {
      var input = 'one/two/^three';
      var output = subject.cssClean(input);

      assert.equal(output, 'one-two--three');
    });
  });

  suite('#_findElement', function() {

    var expected;


    setup(function() {
      var thing = document.createElement('div');
      thing.id = 'foo';
      el.appendChild(thing);
    });

    setup(function() {
      subject.selectors.myThing = '#foo';
      expected = el.querySelector('#foo');
      assert.ok(expected);
    });

    test('single lookup', function() {
      var result = subject._findElement('myThing');

      assert.equal(result, expected);
      assert.equal(subject._myThingElement, expected);
    });

    test('query all', function() {
      var result = subject._findElement('myThing', true);

      assert.equal(result[0], expected);
      assert.equal(subject._myThingElement[0], expected);
    });

  });

  suite('#idForModel', function() {
    test('string', function() {
      assert.equal(
        subject.idForModel('prefix-', 1),
        'prefix-1'
      );
    });

    test('object', function() {
      assert.equal(
        subject.idForModel('prefix-', { _id: 2 }),
        'prefix-2'
      );
    });
  });

  suite('#delegate', function() {
    var element;
    var triggerEvent;

    suiteSetup(function() {
      triggerEvent = testSupport.calendar.triggerEvent;
    });

    setup(function() {
      element = document.createElement('div');
      element.id = 'test';

      var html = '<ol>' +
                   '<li class="hit">hit</li>' +
                   '<li class="foo">foo</li>' +
                 '</ol>';


      element.innerHTML = html;
      document.body.appendChild(element);
    });

    teardown(function() {
      element.parentNode.removeChild(element);
    });

    test('matches - fn', function(done) {

      function next() {
        if (!(--pending))
          done();
      }

      var pending = 2;

      function handleEvent(event, givenTarget) {
        assert.ok(event);
        assert.equal(givenTarget, target);

        next();
      }

      var object = {
        handleEvent: handleEvent
      };

      subject.delegate(element, 'click', 'li.hit', handleEvent);
      subject.delegate(element, 'click', 'li.hit', object);

      // we want to click hit
      var target = element.querySelector('li.hit');
      assert.ok(target);

      triggerEvent(target, 'click');
    });

    test('miss - on element', function(done) {
      subject.delegate(element, 'click', null, function() {
        done(new Error('should not triger'));
      });

      setTimeout(function() {
        done();
      });

      triggerEvent(element, 'click');
    });

    test('miss - on child', function(done) {
      subject.delegate(element, 'click', null, function() {
        done(new Error('should not triger'));
      });

      setTimeout(function() {
        done();
      });

      var target = element.querySelector('li.foo');
      assert.ok(target);

      triggerEvent(target, 'click');
    });

  });

  suite('#showErrors', function() {

    test('successfuly display', function() {
      var errors = [{ name: 'error-default' }];
      subject.showErrors(errors);

      var list = subject.status.classList;
      var errors = subject.errors.textContent;

      assert.ok(errors);
      assert.include(errors, navigator.mozL10n.get('error-default'));

      assert.ok(list.contains(subject.activeClass));
      testSupport.calendar.triggerEvent(subject.status, 'animationend');
      assert.ok(!list.contains(subject.activeClass));
    });

    /**
     * Verifies that built in errors map to a l10n field.
     */
    function verifyBuiltIn(error, expectedID) {
      test('show built-in error: Calendar.Error.' + error, function() {
        var err = new Calendar.Error[error]();
        var msg = navigator.mozL10n.get(expectedID) || expectedID;

        subject.showErrors(err);
        assert.equal(subject.errors.textContent, msg);
        subject.hideErrors();
      });
    }

    verifyBuiltIn('Authentication', 'error-unauthenticated');
    verifyBuiltIn('ServerFailure', 'error-internal-server-error');
    verifyBuiltIn('ServerFailure', 'error-internal-server-error');

  });

  test('#onactive', function() {

    var seen = 0;
    var dispatched;

    assert.isFalse(subject.seen);
    subject.dispatch = function() {
      dispatched = arguments;
    };
    subject.onfirstseen = function() {
      seen += 1;
    };

    subject.onactive('foo');
    assert.isTrue(subject.seen);
    assert.equal(dispatched[0], 'foo');

    assert.ok(el.classList.contains(subject.activeClass));

    subject.onactive();
    assert.equal(seen, 1);
  });

  test('#oninactive', function() {
    subject.onactive();
    subject.oninactive();

    assert.isFalse(el.classList.contains(subject.activeClass));
  });

});
