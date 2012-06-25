requireApp('calendar/js/view.js');

suite('view', function() {

  var el, subject;

  setup(function() {
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
