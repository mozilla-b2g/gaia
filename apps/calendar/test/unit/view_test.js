requireApp('calendar/test/unit/helper.js', function() {
  requireLib('view.js');
});

suite('view', function() {

  var el, subject;

  setup(function() {
    el = document.createElement('div');
    el.id = 'view';
    document.body.appendChild(el);

    subject = new Calendar.View('#view');
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

  test('#onactive', function() {

    var seen = 0;
    var dispatched;

    assert.isFalse(subject.seen);
    subject.dispatch = function() {
      dispatched = arguments;
    }
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
