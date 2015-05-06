'use strict';

suite('Module', function() {
  suiteSetup(function(done) {
    testRequire(['modules/base/module'], (Module) => {
      this.Module = Module;
      done();
    });
  });

  suite('create', function() {
    test('constructor is called when instantiation', function() {
      var constructor = sinon.spy();
      var Module = this.Module.create(constructor);
      Module();
      assert.ok(constructor.called);
    });

    test('throws when the constructor is invalid', function() {
      assert.throw(function() {
        this.Module.create({});
      }, Error);
    });

    test('name of the module is the name of the constructor', function() {
      var constructor = function FakeModule() {};
      var Module = this.Module.create(constructor);
      assert.equal(Module().$name, constructor.name);
    });
  });

  suite('Extendibility', function() {
    suite('extend', function() {
      var A, B, C;
      var instanceOfA, instanceOfB, instanceOfC;

      function executeTest() {
        test('have individual properties', function() {
          // Default values are the same
          assert.equal(instanceOfC.propertyA, instanceOfA.propertyA);
          assert.equal(instanceOfC.propertyB, instanceOfB.propertyB);

          // Check whether they are individual.
          instanceOfC.propertyA = 'valueA2';
          instanceOfC.propertyB = 'valueB2';
          assert.equal(instanceOfA.propertyA, 'valueA');
          assert.equal(instanceOfB.propertyB, 'valueB');
        });

        test('share the same function ', function() {
          assert.equal(instanceOfC.funcA, instanceOfA.funcA);
          assert.equal(instanceOfC.funcB, instanceOfB.funcB);
        });
      }

      setup(function() {
        instanceOfA = A();
        instanceOfB = B();
        instanceOfC = C();
      });

      suite('extend from a single module', function() {
        suiteSetup(function() {
          A = this.Module.create(function() {
            this.propertyA = 'valueA';
          });
          A.prototype.funcA = function() { return this.propertyA; };

          B = this.Module.create(function() {
            this.super(A).call(this);
            this.propertyB = 'valueB';
          }).extend(A);
          B.prototype.funcB = function() { return this.propertyB; };

          C = this.Module.create(function() {
            this.super(B).call(this);
          }).extend(B);
        });

        executeTest();
      });

      suite('extend from multiple modules', function() {
        suiteSetup(function() {
          A = this.Module.create(function() {
            this.propertyA = 'valueA';
          });
          A.prototype.funcA = function() { return this.propertyA; };

          B = this.Module.create(function() {
            this.propertyB = 'valueB';
          });
          B.prototype.funcB = function() { return this.propertyB; };

          C = this.Module.create(function() {
            this.super(A).call(this);
            this.super(B).call(this);
          }).extend(A, B);
        });

        executeTest();
      });
    });

    suite('super', function() {
      var ctorA, ctorB;
      var A, B;

      setup(function() {
        ctorA = sinon.spy();
        ctorB = sinon.spy();
        A = this.Module.create(ctorA);
        B = this.Module.create(ctorB).extend(A);
      });

      test('able to call to the constructors of the extended modules',
        function() {
          var C = this.Module.create(function() {
            this.super(A).call(this);
            this.super(B).call(this);
          }).extend(A, B);
          C();

          assert.ok(ctorA.called);
          assert.ok(ctorB.called);
      });
    });

    suite('logging', function() {
      var module;

      function doLog(obj) {
        obj.debug('debug');
        obj.info('info');
        obj.warn('warn');
        obj.error('error');
      }

      setup(function() {
        this.sinon.stub(console, 'log');
        this.sinon.stub(console, 'info');
        this.sinon.stub(console, 'warn');
        this.sinon.stub(console, 'error');
        var Module = this.Module.create(function A() {});
        module = Module();
      });

      test('NONE', function() {
        module._logLevel = this.Module.LOG_LEVEL.NONE;
        doLog(module);

        assert.ok(console.log.notCalled);
        assert.ok(console.info.notCalled);
        assert.ok(console.warn.notCalled);
        assert.ok(console.error.notCalled);
      });

      test('DEBUG', function() {
        module._logLevel = this.Module.LOG_LEVEL.DEBUG;
        doLog(module);

        assert.ok(console.log.called);
        assert.ok(console.info.notCalled);
        assert.ok(console.warn.notCalled);
        assert.ok(console.error.notCalled);
      });

      test('INFO', function() {
        module._logLevel = this.Module.LOG_LEVEL.INFO;
        doLog(module);

        assert.ok(console.log.called);
        assert.ok(console.info.called);
        assert.ok(console.warn.notCalled);
        assert.ok(console.error.notCalled);
      });

      test('WARN', function() {
        module._logLevel = this.Module.LOG_LEVEL.WARN;
        doLog(module);

        assert.ok(console.log.called);
        assert.ok(console.info.called);
        assert.ok(console.warn.called);
        assert.ok(console.error.notCalled);
      });

      test('ERROR && ALL', function() {
        module._logLevel = this.Module.LOG_LEVEL.ERROR;
        doLog(module);

        assert.ok(console.log.called);
        assert.ok(console.info.called);
        assert.ok(console.warn.called);
        assert.ok(console.error.called);

        module._logLevel = this.Module.LOG_LEVEL.ALL;
        doLog(module);

        assert.ok(console.log.called);
        assert.ok(console.info.called);
        assert.ok(console.warn.called);
        assert.ok(console.error.called);
      });
    });
  });
});
