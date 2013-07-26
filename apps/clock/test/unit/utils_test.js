requireApp('clock/js/constants.js');
requireApp('clock/js/utils.js');

requireApp('clock/test/unit/mocks/mock_requestWakeLock.js');

suite('Time functions', function() {

  suite('#changeSelectByValue', function() {

    var changeSelectByValue, selectDOM;

    setup(function() {
      changeSelectByValue = Utils.changeSelectByValue;
      selectDOM = document.createElement('select');
      selectDOM.innerHTML = ['<option value="a">A</option>',
        '<option value="b">B</option>',
        '<option value="c" selected>C</option>'
      ].join('');
    });

    test('correctly selects the specified element', function() {
      changeSelectByValue(selectDOM, 'b');
      assert.equal(selectDOM.selectedIndex, 1);
    });

    test('has no effect when specified element does not exist', function() {
      changeSelectByValue(selectDOM, 'g');
      assert.equal(selectDOM.selectedIndex, 2);
    });

  });

  suite('#formatTime', function() {
    var is12hStub, formatTime;

    setup(function() {
      formatTime = Utils.formatTime;
      is12hStub = sinon.stub(Utils, 'is12hFormat');
    });

    teardown(function() {
      is12hStub.restore();
    });

    test('12:00am, with 12 hour clock settings', function() {
      is12hStub.returns(true);
      assert.equal(formatTime(0, 0), '12:00AM');
    });

    test('12:30pm, with 12 hour clock settings', function() {
      is12hStub.returns(true);
      assert.equal(formatTime(12, 30), '12:30PM');
    });

    test('11:30pm, with 12 hour clock settings', function() {
      is12hStub.returns(true);
      assert.equal(formatTime(23, 30), '11:30PM');
    });

    test('12:30am, with 24 hour clock settings', function() {
      is12hStub.returns(false);
      assert.equal(formatTime(0, 30), '00:30');
    });

    test('12:30pm, with 24 hour clock settings', function() {
      is12hStub.returns(false);
      assert.equal(formatTime(12, 30), '12:30');
    });

    test('11:30pm, with 24 hour clock settings', function() {
      is12hStub.returns(false);
      assert.equal(formatTime(23, 30), '23:30');
    });

  });

  suite('#parseTime', function() {

    var parseTime;

    suiteSetup(function() {
      parseTime = Utils.parseTime;
    });

    test('12:10am', function() {
      var time = parseTime('12:10AM');
      assert.equal(time.hour, 0);
      assert.equal(time.minute, 10);
    });

    test('12:00pm', function() {
      var time = parseTime('12:00PM');
      assert.equal(time.hour, 12);
      assert.equal(time.minute, 00);
    });

    test('11:30pm', function() {
      var time = parseTime('11:30PM');
      assert.equal(time.hour, 23);
      assert.equal(time.minute, 30);
    });

    test('00:15', function() {
      var time = parseTime('12:15AM');
      assert.equal(time.hour, 0);
      assert.equal(time.minute, 15);
    });

    test('23:45', function() {
      var time = parseTime('23:45');
      assert.equal(time.hour, 23);
      assert.equal(time.minute, 45);
    });
  });

  suite('extend tests', function() {

    function hasOwn(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }

    function hasAny(obj, prop) {
      return hasOwn(obj, prop) || (
        obj !== Object.prototype && hasAny(obj.__proto__, prop));
    }

    function testObject() {
      return Object.create(
        Object.create({ grandparents: 4 },
          { parents: { value: 2 } }), {
        me: { value: 1 }
      });
    }

    test('basic extend', function() {
      var x = {};
      var y = Utils.extend(x, {a: 1, b: 2, c: 3});
      assert.ok(x === y, 'x === y');
      assert.ok(hasOwn(x, 'a') && x.a === 1);
      assert.ok(hasOwn(x, 'b') && x.b === 2);
      assert.ok(hasOwn(x, 'c') && x.c === 3);
    });

    test('extend only affects child instance', function() {
      var x = testObject(), y;
      y = Utils.extend(x, {favoriteColor: 'green'});
      assert.ok(x === y, 'x === y');
      assert.equal(x.favoriteColor, 'green');
      assert.ok(hasOwn(x, 'favoriteColor'));
      assert.ok(!hasAny(x.__proto__, 'favoriteColor'));
    });

    test('multiple extend', function() {
      var x = Utils.extend({}, {
        a: 42
      }, {
        a: 1,
        b: 19,
        c: 45
      }, {
        b: 199
      });
      assert.equal(x.a, 1);
      assert.equal(x.b, 199);
      assert.equal(x.c, 45);
    });

  });

  suite('safeCpuLock tests', function() {

    setup(function() {
      this.mocklock = new MockRequestWakeLock();
      this.sinon.stub(navigator, 'requestWakeLock',
        this.mocklock.requestWakeLock.bind(this.mocklock));
      this.sinon.useFakeTimers();
    });

    teardown(function() {
      this.sinon.restore(navigator, 'requestWakeLock');
    });

    test('locks CPU', function() {
      var callback = this.sinon.spy(function(unlock) {
        assert.ok(navigator.requestWakeLock.calledOnce);
      });
      Utils.safeCpuLock(15000, callback);
      this.sinon.clock.tick(16000);
      assert.ok(callback.calledOnce);
    });

    test('single unlock', function() {
      Utils.safeCpuLock(15000, function(unlock) {
        unlock();
      });
      this.sinon.clock.tick(16000);
      var locks = this.mocklock.getissued();
      assert.equal(locks.length, 1);
      assert.equal(locks[0].unlocks, 1);
    });

    test('no duplicate unlock', function() {
      var here = 0;
      Utils.safeCpuLock(15000, function(unlock) {
        setTimeout(function() {
          here++;
          unlock();
        }, 16000);
        here++;
      });
      this.sinon.clock.tick(17000);
      var locks = this.mocklock.getissued();
      assert.equal(locks.length, 1);
      assert.equal(locks[0].unlocks, 1);
      assert.equal(here, 2);
    });

    test('timeout unlock', function() {
      var here = false;
      Utils.safeCpuLock(15000, function(unlock) {
        here = true;
      });
      this.sinon.clock.tick(16000);
      var locks = this.mocklock.getissued();
      assert.equal(locks.length, 1);
      assert.equal(locks[0].unlocks, 1);
      assert.ok(here);
    });

    test('exception in callback still unlocks CPU', function() {
      var here = false;
      try {
        Utils.safeCpuLock(15000, function(unlock) {
          here = true;
          throw new Error('gotcha');
        });
        this.sinon.clock.tick(16000);
      } catch (err) {
        assert.equal(err.message, 'gotcha');
      }
      var locks = this.mocklock.getissued();
      assert.equal(locks.length, 1);
      assert.equal(locks[0].unlocks, 1);
      assert.ok(here);
    });

  });

  suite('async', function() {
    test('generators', function() {
      var spy = this.sinon.spy(function() {
        assert.equal(arguments[0], null);
        assert.equal(arguments.length, 1);
      });
      var gen = Utils.async.generator(spy);
      var collection = [];
      for (var i = 0; i < 100; i++) {
        collection.push(gen());
      }
      assert.ok(!spy.called);
      for (var k of collection) {
        k();
      }
      assert.ok(spy.calledOnce);
    });

    test('generators error', function() {
      var spy = this.sinon.spy(function() {
        assert.equal(arguments[0], 1);
        assert.equal(arguments.length, 1);
      });
      var gen = Utils.async.generator(spy);
      var collection = [];
      for (var i = 0; i < 100; i++) {
        collection.push(gen());
      }
      assert.ok(!spy.called);
      var j = 1;
      for (var k of collection) {
        k(j++);
      }
      assert.ok(spy.calledOnce);
    });

    test('namedParallel', function() {
      var spy = this.sinon.spy(function() {
        assert.equal(arguments[0], null);
        assert.equal(arguments.length, 1);
      });
      var names = Utils.async.namedParallel([
        'testa', 'testb', 'testc'
      ], spy);
      assert.ok(!spy.called);
      names.testa();
      assert.ok(!spy.called);
      names.testb();
      assert.ok(!spy.called);
      names.testc();
      assert.ok(spy.calledOnce);
    });

    test('namedParallel error', function() {
      var spy = this.sinon.spy(function() {
        assert.equal(arguments[0], 'testing b');
        assert.equal(arguments.length, 1);
      });
      var names = Utils.async.namedParallel([
        'testa', 'testb', 'testc'
      ], spy);
      assert.ok(!spy.called);
      names.testa();
      assert.ok(!spy.called);
      names.testb('testing b');
      assert.ok(spy.calledOnce);
      names.testc();
      assert.ok(spy.calledOnce);
    });
  });
});
