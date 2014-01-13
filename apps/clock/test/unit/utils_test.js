requireApp('clock/test/unit/mocks/mock_request_wake_lock.js');

suite('Time functions', function() {
  var Utils;

  suiteSetup(function(done) {
    testRequire(['utils'],
      function(utils) {
        Utils = utils;
        done();
    });
  });

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

  suite('#dateMath', function() {
    suiteSetup(function() {
      // The timestamp for "Tue Jul 16 2013 06:00:00" GMT
      this.sixAm = new Date(2013, 5, 16, 6).getTime();
      // Set clock so calls to new Date() and Date.now() will not vary
      // across test locales
      this.dat = new Date(this.sixAm + 15120000);
      this.allNeg = {
        hours: -4,
        minutes: -15,
        seconds: -2
      };
      this.someNeg = {
        hours: 4,
        minutes: -15,
        seconds: 2
      };
      this.overflow = {
        hours: 4,
        minutes: 0,
        seconds: 902
      };
      this.skip = {
        hours: 4,
        seconds: 902
      };
    });

    setup(function() {
      this.clock = this.sinon.useFakeTimers(this.sixAm);
    });

    suite('toMS', function() {
      test('returns correct millisecond value ', function() {
        assert.equal(
          Utils.dateMath.toMS(this.skip),
          15302000
        );
        assert.equal(
          Utils.dateMath.toMS(this.overflow),
          15302000
        );
      });
      test('any/all negative input result in negative output ', function() {
        assert.ok(Utils.dateMath.toMS(this.someNeg) < 0);
        assert.ok(Utils.dateMath.toMS(this.allNeg) < 0);
      });
      test('all positive input result in positive output ', function() {
        assert.ok(Utils.dateMath.toMS(this.dat) > 0);
        assert.ok(Utils.dateMath.toMS(this.skip) > 0);
      });
      test('accepts plural or singular unit names ', function() {
        assert.equal(
          Utils.dateMath.toMS(this.skip, {unitsPartial: ['hours', 'second']}),
          15302000
        );
      });
    });

    suite('fromMS', function() {
      suiteSetup(function() {
        this.negtime = -140000;
        this.hour = 1000 * 60 * 60;
        this.fourish = 15120000;
      });
      test('returns a correctly formed object ', function() {
        assert.deepEqual(
          Utils.dateMath.fromMS(this.fourish, {
            unitsPartial: ['hours', 'minutes']
          }),
          {
            hours: 4,
            minutes: 12
          }
        );
      });
      test('returns correct signs ', function() {
        var pos, neg;
        pos = Utils.dateMath.fromMS(this.hour);
        neg = Utils.dateMath.fromMS(this.negtime);
        assert.ok(Object.keys(pos).every(function(unit) {
          return pos[unit] >= 0;
        }));
        assert.ok(Object.keys(neg).every(function(unit) {
          return neg[unit] <= 0;
        }));
      });
      test('returns desired granularity ', function() {
        assert.deepEqual(
          Utils.dateMath.fromMS(this.hour, {unitsPartial: ['minutes']}),
          {
            minutes: 60
          }
        );
        assert.deepEqual(
          Utils.dateMath.fromMS(this.fourish, {unitsPartial: ['minutes']}),
          {
            minutes: 252
          }
        );
      });
      test('accepts plural or singular unit names ', function() {
        assert.deepEqual(
          Utils.dateMath.fromMS(this.fourish, {
            unitsPartial: ['hour', 'minute']
          }),
          {
            hours: 4,
            minutes: 12
          }
        );
      });
    });
  });

  suite('data tests', function() {
    suite('compare tests', function() {
      test('numbers', function() {
        assert.equal(Utils.data.defaultCompare(42, 42), 0);
        assert.equal(Utils.data.defaultCompare(0, 0), 0);
        assert.equal(Utils.data.defaultCompare(0, 1), -1);
        assert.equal(Utils.data.defaultCompare(1, 0), 1);
        var e1, e2;
        try {
          Utils.data.defaultCompare(1, {});
        } catch (err) {
          e1 = err;
        }
        assert.ok(e1);
        try {
          Utils.data.defaultCompare({}, 1);
        } catch (err) {
          e2 = err;
        }
        assert.ok(e2);
      });
      test('strings', function() {
        assert.equal(Utils.data.defaultCompare('abc', 'abc'), 0);
        assert.equal(Utils.data.defaultCompare('abc', 'abd'), -1);
        assert.equal(Utils.data.defaultCompare('abc', 'abb'), 1);
        assert.equal(Utils.data.defaultCompare('abc', 'abcd'), -1);
        assert.equal(Utils.data.defaultCompare('abc', 'ab'), 1);
        var e;
        try {
          Utils.data.defaultCompare('abc', 1);
        } catch (err) {
          e = err;
        }
        assert.ok(e);
      });
      test('arrays', function() {
        assert.equal(Utils.data.defaultCompare([1, 2, 3], [1, 2, 3]), 0);
        assert.equal(Utils.data.defaultCompare([1, 2, 3], [1, 2, 4]), -1);
        assert.equal(Utils.data.defaultCompare([1, 2, 3], [1, 2, 2]), 1);
        var e;
        try {
          Utils.data.defaultCompare('abc', 1);
        } catch (err) {
          e = err;
        }
        assert.ok(e);
      });
    });

    suite('binarySearch', function() {

      var genMatchTest = function(arr, search, idx) {
        test('length ' + arr.length + ', match for ' + JSON.stringify(search),
          function() {
          var res = Utils.data.binarySearch({ value: search }, arr,
            Utils.data.keyedCompare('value'));
          assert.deepEqual(res, {
            match: true,
            index: idx,
            value: arr[idx]
          });
        });
      };

      var genNoMatchTest = function(arr, search, idx) {
        test('length ' + arr.length + ', no match for ' +
          JSON.stringify(search),
          function() {
          var res = Utils.data.binarySearch({ value: search }, arr,
            Utils.data.keyedCompare('value'));
          assert.deepEqual(res, {
            match: false,
            index: idx
          });
        });
      };

      var array14 = [
        {value: 1}, {value: 11}, {value: 25},
        {value: 28}, {value: 30}, {value: 36},
        {value: 48}, {value: 54}, {value: 54},
        {value: 59}, {value: 61}, {value: 82},
        {value: 82}, {value: 85}
      ];

      var array15 = [
        {value: 1}, {value: 11}, {value: 25},
        {value: 28}, {value: 30}, {value: 36},
        {value: 48}, {value: 54}, {value: 54},
        {value: 59}, {value: 61}, {value: 82},
        {value: 82}, {value: 85}, {value: 98}
      ];

      test('zero length', function() {
        var res = Utils.data.binarySearch(34, []);
        assert.deepEqual(res, { match: false, index: 0 });
      });

      test('length one, no match', function() {
        var res = Utils.data.binarySearch(34, [5]);
        assert.deepEqual(res, { match: false, index: 1 });
      });

      test('length one, match', function() {
        var res = Utils.data.binarySearch(34, [34]);
        assert.deepEqual(res, {
          match: true,
          index: 0,
          value: 34
        });
      });

      genMatchTest(array14, 1, 0);
      genMatchTest(array14, 85, 13);
      genNoMatchTest(array14, -1, 0);
      genNoMatchTest(array14, 52, 7);
      genNoMatchTest(array14, 101, 14);

      genMatchTest(array15, 1, 0);
      genMatchTest(array15, 98, 14);
      genNoMatchTest(array15, -1, 0);
      genNoMatchTest(array15, 52, 7);
      genNoMatchTest(array15, 101, 15);
    });

    suite('sortedInsert', function() {
      var array = [1, 8, 9, 19, 38, 42, 44, 56, 58, 64, 74, 82, 91];
      test('zero length insert', function() {
        var x = [];
        var res = Utils.data.sortedInsert(3, x);
        assert.deepEqual(x, [3]);
        assert.equal(res, 0);
      });
      test('beginning insert', function() {
        var x = array.slice();
        var res = Utils.data.sortedInsert(-10, x);
        assert.equal(x[0], -10);
        assert.equal(x.length, array.length + 1);
        assert.equal(res, 0);
      });
      test('middle insert', function() {
        var x = array.slice();
        var res = Utils.data.sortedInsert(43, x);
        assert.equal(x[6], 43);
        assert.equal(x.length, array.length + 1);
        assert.equal(res, 6);
      });
      test('end insert', function() {
        var x = array.slice();
        var res = Utils.data.sortedInsert(99, x);
        assert.equal(x[x.length - 1], 99);
        assert.equal(x.length, array.length + 1);
        assert.equal(res, array.length);
      });
    });

    suite('sortedRemove', function() {
      var array = [1, 8, 9, 19, 38, 42, 44, 56, 58, 64, 74, 82, 91];
      test('zero length remove', function() {
        var x = [];
        var res = Utils.data.sortedRemove(3, x);
        assert.equal(res, false);
      });
      test('length one remove', function() {
        var x = [3];
        var res = Utils.data.sortedRemove(3, x);
        assert.deepEqual(x, []);
        assert.equal(res, true);
      });
      test('beginning remove', function() {
        var x = array.slice();
        var res = Utils.data.sortedRemove(1, x);
        assert.deepEqual(x, [8, 9, 19, 38, 42, 44, 56, 58, 64, 74, 82, 91]);
        assert.equal(res, true);
      });
      test('middle remove', function() {
        var x = array.slice();
        var res = Utils.data.sortedRemove(58, x);
        assert.deepEqual(x, [1, 8, 9, 19, 38, 42, 44, 56, 64, 74, 82, 91]);
        assert.equal(res, true);
      });
      test('end remove', function() {
        var x = array.slice();
        var res = Utils.data.sortedRemove(91, x);
        assert.deepEqual(x, [1, 8, 9, 19, 38, 42, 44, 56, 58, 64, 74, 82]);
        assert.equal(res, true);
      });
      test('beginning multi remove', function() {
        var x = [3, 3, 3, 3, 3, 8, 9, 19, 38, 42, 44, 56, 58, 64, 74, 82];
        var res = Utils.data.sortedRemove(3, x, undefined, true);
        assert.deepEqual(x, [8, 9, 19, 38, 42, 44, 56, 58, 64, 74, 82]);
        assert.equal(res, true);
      });
      test('middle multi remove', function() {
        var x = [1, 8, 9, 19, 21, 21, 21, 21, 38, 42, 44, 56, 58, 64, 74, 82];
        var res = Utils.data.sortedRemove(21, x, undefined, true);
        assert.deepEqual(x, [1, 8, 9, 19, 38, 42, 44, 56, 58, 64, 74, 82]);
        assert.equal(res, true);
      });
      test('end multi remove', function() {
        var x = [1, 8, 9, 19, 38, 42, 44, 56, 58, 64, 74, 82, 99, 99, 99];
        var res = Utils.data.sortedRemove(99, x, undefined, true);
        assert.deepEqual(x, [1, 8, 9, 19, 38, 42, 44, 56, 58, 64, 74, 82]);
        assert.equal(res, true);
      });

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

  suite('format', function() {
    suite('time(hh, mm) ', function() {
      var is12hStub, formatTime;

      setup(function() {
        formatTime = Utils.format.time;
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

      test('2:30, disable meridian', function() {
        var opts = {meridian: false};
        assert.equal(formatTime(2, 30, opts), '2:30');
      });

      test('02:30, pad hours option', function() {
        var opts = {padHours: true};
        assert.equal(formatTime(2, 30, opts), '02:30');
      });
    });

    suite('hms()', function() {
      var hms;

      suiteSetup(function() {
        hms = Utils.format.hms;
      });

      suite('hms(seconds) ', function() {
        var fixtures = [
          { args: [0], expect: '00:00:00' },
          { args: [1], expect: '00:00:01' },
          { args: [59], expect: '00:00:59' },
          { args: [60], expect: '00:01:00' },
          { args: [3600], expect: '01:00:00' }
        ];

        fixtures.forEach(function(fixture) {
          var { args, expect } = fixture;
          var title = args.map(String).join(', ') + ' => ' + expect + ' ';

          test(title, function() {
            assert.equal(hms.apply(null, args), expect);
          });
        });
      });

      suite('hms(seconds, format) ', function() {
        var fixtures = [
          { args: [0, 'ss'], expect: '00' },
          { args: [1, 'ss'], expect: '01' },
          { args: [60, 'ss'], expect: '00' },
          { args: [0, 'mm:ss'], expect: '00:00' },
          { args: [59, 'mm:ss'], expect: '00:59' },
          { args: [60, 'mm:ss'], expect: '01:00' },
          { args: [3600, 'mm:ss'], expect: '00:00' },
          { args: [3600, 'hh:mm:ss'], expect: '01:00:00' }
        ];

        fixtures.forEach(function(fixture) {
          var { args, expect } = fixture;
          var title = args.map(String).join(', ') + ' => ' + expect + ' ';

          test(title, function() {
            assert.equal(hms.apply(null, args), expect);
          });
        });
      });
    });
    suite('durationMs()', function() {
      var durationMs;

      suiteSetup(function() {
        durationMs = Utils.format.durationMs;
      });

      suite('duration(ms) ', function() {
        var fixtures = [
          { args: [0], expect: '00:00.00' },
          { args: [10], expect: '00:00.01' },
          { args: [970], expect: '00:00.97' },
          { args: [1000 + 670], expect: '00:01.67' },
          { args: [59000 + 670], expect: '00:59.67' },
          { args: [60000 + 670], expect: '01:00.67' },
          { args: [3600 * 1000 + 23000 + 670], expect: '60:23.67' },
          { args: [2 * 3600 * 1000 + 23000 + 670], expect: '120:23.67' }
        ];

        fixtures.forEach(function(fixture) {
          var { args, expect } = fixture;
          var title = args.map(String).join(', ') + ' => ' + expect + ' ';

          test(title, function() {
            assert.equal(durationMs.apply(null, args), expect);
          });
        });
      });
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
