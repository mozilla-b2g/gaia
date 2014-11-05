suite('mocha task', function() {

  test('simple generator', function() {
    var timePassed = false;

    setTimeout(function() {
      timePassed = true;
    }, 10);

    var value = yield setTimeout(function() {
      MochaTask.next('foo');
    }, 30);

    assert.equal(value, 'foo');
    assert.ok(timePassed, 'time passed?');
  });

  test('throwing an error', function() {
    function throwsSomething() {
      setTimeout(function() {
        MochaTask.nextNodeStyle(new Error('generator throws'));
      }, 10);
    }

    var threw;
    try {
      yield throwsSomething();
    } catch (e) {
      threw = e;
    } finally {
      assert.ok(threw, 'throws the error');
      assert.ok(threw.message);
      assert.include(threw.message, 'generator throws');
    }
  });
});
