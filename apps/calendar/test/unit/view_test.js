requireApp('calendar/js/view.js');

suite('view', function() {

  var el, subject;

  setup(function() {
    var childEl = document.createElement('div');
    childEl.classList.add('foo');

    el = document.createElement('div');
    document.body.appendChild(el);

    subject = new Calendar.View();

    //we always assume there is some
    //root level element.
    subject.element = el;
  });

  teardown(function() {
    el.parentNode.removeChild(el);
  });

  suite('#_findElement', function() {

    var expected;

    setup(function() {
      subject.selectors.myThing = '#foo';
      expected = el.querySelector('#foo');
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

    assert.isFalse(subject.seen);
    subject.onfirstseen = function() {
      seen += 1;
    };

    subject.onactive();
    assert.isTrue(subject.seen);

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
