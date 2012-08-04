requireApp('calendar/test/unit/support/factory.js');

suite('factory', function() {

  var subject;
  var realDefined;

  setup(function() {
    realDefined = Factory._defined;
    Factory._defined = Object.create(null);
  });

  teardown(function() {
    Factory._defined = realDefined;
  });

  function Model(options) {
    var key;
    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  suite('hooks', function() {
    setup(function() {
      subject = new Factory({
        onbuild: function(obj) {
          obj.hitBuild = true;
        },

        oncreate: function(obj) {
          obj.hitCreate = true;
        },

        properties: {
          one: true
        }
      });
    });

    test('create', function() {
      var out = subject.create();
      assert.isTrue(out.hitBuild);
      assert.isTrue(out.hitCreate);
    });

    test('build', function() {
      var out = subject.build();
      assert.isTrue(out.hitBuild);
      assert.ok(!out.hitCreate);
    });
  });

  suite('simple property factory', function() {
    setup(function() {
      subject = new Factory({
        properties: {
          get one() {
            return 'cool';
          },
          two: 'foo'
        }
      });
    });

    test('initialization', function() {
      assert.deepEqual(subject.properties, {
        one: 'cool',
        two: 'foo'
      });
    });

    test('create - no overrides', function() {
      var result = subject.create();

      assert.deepEqual(
        result,
        subject.properties
      );
    });

    test('create - overrides', function() {
      var result = subject.create(
        { one: '1', three: '3' }
      );

      assert.deepEqual(
        result, {
          one: '1',
          two: 'foo',
          three: '3'
        }
      );
    });
  });

  suite('with getters', function() {
    var increment;

    setup(function() {
      increment = 0;
      subject = new Factory({
        properties: {
          get increment() {
            return increment++;
          }
        }
      });
    });

    test('increment getter', function() {
      subject.create();
      subject.create();
      subject.create();

      var result = subject.create();

      // This is probably something
      // you would not want to do in real
      // life but it provides that
      // increments are clean.
      assert.equal(result.increment, 0);
      assert.equal(result.increment, 1);
      assert.equal(result.increment, 2);
      assert.equal(result.increment, 3);
    });

  });

  suite('with constructors', function() {
    setup(function() {
      subject = new Factory({
        object: Model,
        properties: {
          value: 'foo'
        }
      });
    });

    test('create - no overrides', function() {
      var result = subject.create();

      assert.instanceOf(result, Model);
      assert.equal(result.value, 'foo');
    });

    test('create - with overrides', function() {
      var result = subject.create(
        { value: 'val', other: true }
      );

      assert.instanceOf(result, Model);
      assert.equal(result.value, 'val');
      assert.equal(result.other, true);
    });

    test('build', function() {
      var result = subject.build({ val: 1 });
      assert.isFalse((
        result instanceof Model
      ));

      assert.equal(result.val, 1);
      assert.equal(result.value, 'foo');
    });
  });

  suite('with factory props', function() {
    var childFactory;
    var increment = 0;

    setup(function() {
      childFactory = new Factory({
        object: Model,
        properties: {
          get child() {
           return true;
          }
        }
      });

      subject = new Factory({
        properties: {
          parent: 'yes',
          child: childFactory,
          inertChild: childFactory
        }
      });
    });

    test('create', function() {
      var result = subject.create({
        parentVal: 1,
        child: {
          otherVal: 1
        }
      });

      assert.instanceOf(result.child, Model);
      assert.instanceOf(result.inertChild, Model);

      assert.equal(result.parent, 'yes');
      assert.equal(result.parentVal, 1);

      assert.equal(result.inertChild.child, true);
      assert.equal(result.child.child, true);
      assert.equal(result.child.otherVal, 1);
    });

    test('build', function() {
      var result = subject.build({
        child: {
          otherVal: 1
        }
      });

      assert.isFalse((
        result.child instanceof Model
      ));


      assert.isFalse((
        result.inertChild instanceof Model
      ));
    });

    test('#extend', function() {
      var sub = subject.extend({
        object: Model,
        properties: {
          foo: 'bar'
        }
      });

      assert.ok(!subject.properties.foo);

      assert.equal(sub.object, Model);

      var result = sub.create({
        other: 'fooz'
      });

      assert.instanceOf(result, Model);

      assert.notEqual(
        sub.properties,
        subject.properties
      );

      assert.equal(result.other, 'fooz');
      assert.instanceOf(result.child, Model);
      assert.instanceOf(result.inertChild, Model);
      assert.equal(result.child.child, true);
    });
  });

  suite('static api', function() {

    var defined;

    setup(function() {
      defined = Factory.define('one', {
        object: Model,
        properties: {
          one: true
        }
      });
    });

    test('#define', function() {
      assert.instanceOf(defined, Factory);
      assert.equal(defined.object, Model);
      assert.deepEqual(
        defined.properties,
        { one: true }
      );
      assert.equal(Factory.get('one'), defined);
    });

    test('#define - /w extend', function() {
      Factory.define('one.ext', {
        extend: 'one',
        properties: {
          two: false
        }
      });

      assert.instanceOf(
        Factory.get('one.ext'),
        Factory
      );

      var created = Factory.create('one.ext');

      assert.equal(created.one, true);
      assert.equal(created.two, false);
    });

    test('#create', function() {
      var result = Factory.create('one', {
        extra: true
      });

      assert.instanceOf(result, Model);
      assert.equal(result.extra, true);
      assert.equal(result.one, true);
    });

    test('#build', function() {
      var result = Factory.build('one', {
        extra: true
      });

      assert.isFalse((
        result instanceof Model
      ));

      assert.equal(result.extra, true);
      assert.equal(result.one, true);
    });

  });

  suite('acceptance', function() {
    var result;

    function Event() { Model.apply(this, arguments) }
    function Cal() { Model.apply(this, arguments) }
    function Account() { Model.apply(this, arguments) }

    setup(function() {
      Factory.define('event', {
        object: Event,
        properties: {
          isEvent: true
        }
      });

      Factory.define('calendar', {
        object: Cal,
        properties: {
          isCalendar: true,
          event: Factory.get('event')
        }
      });

      Factory.define('account', {
        object: Account,
        properties: {
          isAccount: true,
          normalCal: Factory.get('calendar'),
          extendCal: Factory.get('calendar').extend({
            properties: {
              isCrazy: true,
              event: Factory.get('event').extend({
                properties: {
                  isCrazy: true
                }
              })
            }
          })
        }
      });
    });

    function hasProps() {
     // account
      assert.isTrue(result.isAccount);

      // normal cal
      assert.isTrue(result.normalCal.isCalendar);
      assert.ok(!result.normalCal.isCrazy);

      // crazy cal
      assert.isTrue(result.extendCal.isCrazy);
      assert.isTrue(result.extendCal.isCalendar);

      // normal event
      assert.isTrue(result.normalCal.event.isEvent);
      assert.ok(!result.normalCal.event.isCrazy);

      // crazy calendar
      assert.isTrue(result.extendCal.event.isEvent);
      assert.isTrue(result.extendCal.event.isCrazy);
    }

    test('#create - no overrides', function() {
      result = Factory.create('account');

      assert.instanceOf(result, Account, 'result Account');
      assert.instanceOf(result.normalCal, Cal, 'normalCal');
      assert.instanceOf(result.extendCal, Cal, 'extendCal');
      assert.instanceOf(result.normalCal.event, Event, 'normalCal.event');
      assert.instanceOf(result.extendCal.event, Event, 'extendCal.event');

      hasProps();
    });

    test('#build - no overrides', function() {
      result = Factory.build('account');
      assert.isFalse(
        result instanceof Account
      );
      hasProps();
    });

    test('deep overrides', function() {
      result = Factory('account', {
        normalCal: {
          foo: true,
          event: {
            nested: true
          }
        }
      });

      // we did not kill the defaults
      hasProps();

      assert.isTrue(result.normalCal.foo);
      assert.isTrue(result.normalCal.event.nested);
    });

  });

});
