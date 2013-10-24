requireApp('clock/js/emitter.js', loaded);

// since we need to generate tests using Emitter, we must wait for it to load
function loaded() {
  // Cache current value of Emitter global so other tests that load the module
  // do not effect the local value.
  var Emitter = window.Emitter;

  suite('Emitter', function() {
    // Create a Simple "sub-class"
    function Simple() {
      Emitter.call(this);
    }
    Simple.prototype = Object.create(Emitter.prototype);

    // Create a more Complex "sub-class"
    function Complex() {
      Emitter.call(this);
    }
    Complex.prototype.on = Emitter.prototype.on;
    Complex.prototype.once = Emitter.prototype.once;
    Complex.prototype.off = Emitter.prototype.off;
    Complex.prototype.emit = Emitter.prototype.emit;

    // Test using the 'mixin' method also
    function MixedIn() {
      Emitter.mixin(this);
    }

    function MixedInProto() {}
    Emitter.mixin(MixedInProto.prototype);

    // perform the tests on all cases
    [Emitter, Simple, Complex, MixedIn, MixedInProto].forEach(function(ctor) {
      suite(ctor.name + '()', function() {
        setup(function() {
          this.emitter = new ctor;
          this.handlers = [];
          for (var x = 0; x < 5; x++) {
            this.handlers.push(this.sinon.spy());
          }
        });
        test('object has no owned properties', function() {
          var ownProperty = undefined;
          for (var property in this.emitter) {
            if (this.emitter.hasOwnProperty(property)) {
              ownProperty = property;
              break;
            }
          }
          assert.equal(ownProperty, undefined);
        });

        // this test will actually create an error if we add a new method to
        // the prototype unless we also add it to Complex
        Object.keys(Emitter.prototype).forEach(function(method) {
          test('has ' + method + '()', function() {
            assert.equal(this.emitter[method], Emitter.prototype[method]);
          });
        });

        // check some known error conditions
        suite('errors', function() {
          // test non-string event types
          [true, 1, {}, [], undefined, null, function() {}]
            .forEach(function(prim) {
              test('non-string type .on(): ' + typeof prim, function() {
                assert.throw(
                  this.emitter.on.bind(this.emitter, prim, this.handlers[0]),
                  Error
                );
              });
              test('non-string type .once(): ' + typeof prim, function() {
                assert.throw(
                  this.emitter.on.bind(this.emitter, prim, this.handlers[0]),
                  Error
                );
              });
              test('non-string type .emit(): ' + typeof prim, function() {
                assert.throw(
                  this.emitter.emit.bind(this.emitter, prim, this.handlers[0]),
                  Error
                );
              });
              // skip null/undefined for .off()
              if (prim != null) {
                test('non-string type .off(): ' + typeof prim, function() {
                  assert.throw(
                    this.emitter.off.bind(this.emitter, prim, this.handlers[0]),
                    Error
                  );
                });
              }
              if (typeof prim !== 'function') {
                test('non-function handle .on(): ' + typeof prim, function() {
                  assert.throw(
                    this.emitter.on.bind(this.emitter, prim, this.handlers[0]),
                    Error
                  );
                });
                test('non-function handle .once(): ' + typeof prim, function() {
                  assert.throw(
                    this.emitter.once.bind(this.emitter, 'test', prim),
                    Error
                  );
                });
              }
            });
        });

        suite('chainability', function() {
          test('.on() returns Emitter', function() {
            assert.equal(
              this.emitter.on('test', this.handlers[0]),
              this.emitter
            );
          });
          test('.off() returns Emitter', function() {
            assert.equal(
              this.emitter.off('test'),
              this.emitter
            );
          });
          test('.emit() returns Emitter', function() {
            assert.equal(
              this.emitter.emit('test'),
              this.emitter
            );
          });
        });

        suite('binding/emitting events', function() {
          test('bind single event, handler is called', function() {
            this.emitter.on('test', this.handlers[0]);

            this.emitter.emit('test');
            assert.ok(this.handlers[0].calledOnce);
          });
          test('emit with data', function() {
            var data = {};
            this.emitter.on('test', this.handlers[0]);

            this.emitter.emit('test', data);
            assert.ok(this.handlers[0].calledWith(data));
          });
          test('bind two handlers', function() {
            var data = {};
            this.emitter.on('test', this.handlers[0]);
            this.emitter.on('test', this.handlers[1]);

            this.emitter.emit('test', data);
            assert.ok(this.handlers[0].calledWith(data));
            assert.ok(this.handlers[1].calledWith(data));
          });
          test('bind same handler twice', function() {
            var data = {};
            this.emitter.on('test', this.handlers[0]);
            this.emitter.on('test', this.handlers[0]);

            this.emitter.emit('test', data);
            assert.ok(this.handlers[0].calledTwice);
          });
          test('.once events', function() {
            var data = {};
            this.emitter.once('test', this.handlers[0]);
            this.emitter.on('test', this.handlers[2]);

            this.emitter.emit('test', data);
            assert.ok(this.handlers[0].calledWith(data),
              'first once handler called');
            assert.equal(this.handlers[1].callCount, 0,
              'second once handler not called');
            assert.ok(this.handlers[2].calledWith(data),
              'first always handler is called');

            this.handlers[0].reset();
            this.handlers[1].reset();
            this.handlers[2].reset();

            this.emitter.once('test', this.handlers[1]);
            this.emitter.emit('test', data);
            assert.equal(this.handlers[0].callCount, 0,
              'first once handler not called');
            assert.ok(this.handlers[1].calledWith(data),
              'second once handler called');
            assert.ok(this.handlers[2].calledWith(data),
              'second always handler is called');
          });
          test('unbind single handler', function() {
            var data = {};
            this.emitter.on('test', this.handlers[0]);
            this.emitter.on('test', this.handlers[1]);

            this.emitter.off('test', this.handlers[0]);

            this.emitter.emit('test', data);
            assert.equal(this.handlers[0].callCount, 0);
            assert.ok(this.handlers[1].calledOnce);
          });
          test('unbind once handler', function() {
            var data = {};
            this.emitter.once('test', this.handlers[0]);
            this.emitter.on('test', this.handlers[1]);

            this.emitter.off('test', this.handlers[0]);

            this.emitter.emit('test', data);
            assert.equal(this.handlers[0].callCount, 0);
            assert.ok(this.handlers[1].calledOnce);
          });
          test('unbind same handler twice', function() {
            var data = {};
            this.emitter.on('test', this.handlers[0]);
            this.emitter.on('test', this.handlers[0]);

            this.emitter.off('test', this.handlers[0]);

            this.emitter.emit('test', data);
            assert.ok(this.handlers[0].calledOnce);

            this.emitter.off('test', this.handlers[0]);
            this.emitter.emit('test', data);
            assert.ok(this.handlers[0].calledOnce);
          });
          test('unbind all handlers for type', function() {
            var data = {};
            var x;
            for (x = 0; x < 5; x++) {
              this.emitter.on('test', this.handlers[x]);
              this.emitter.on('test2', this.handlers[x]);
            }

            this.emitter.off('test');

            this.emitter.emit('test', data);
            for (x = 0; x < 5; x++) {
              assert.equal(this.handlers[x].callCount, 0);
            }

            this.emitter.emit('test2');
            for (x = 0; x < 5; x++) {
              assert.equal(this.handlers[x].callCount, 1);
            }
          });
          test('unbind all handlers', function() {
            var x;
            for (x = 0; x < 5; x++) {
              this.emitter.on('test', this.handlers[x]);
              this.emitter.on('test2', this.handlers[x]);
            }

            this.emitter.off();

            this.emitter.emit('test');
            for (x = 0; x < 5; x++) {
              assert.equal(this.handlers[x].callCount, 0);
            }

            this.emitter.emit('test2');
            for (x = 0; x < 5; x++) {
              assert.equal(this.handlers[x].callCount, 0);
            }
          });
          test('unbind all handlers for type', function() {
            var data = {};
            var x;
            var removed = this.sinon.spy(function() {
              this.emitter.off('test', removed);
            }.bind(this));

            for (x = 0; x < 5; x++) {
              this.emitter.on('test', this.handlers[x]);
              this.emitter.on('test', removed);
            }

            // first emit, all 10 callbacks are called
            this.emitter.emit('test', data);
            for (x = 0; x < 5; x++) {
              assert.equal(this.handlers[x].callCount, 1,
                'handler ' + x + ' called once');
              this.handlers[x].reset();
            }
            assert.equal(removed.callCount, 5, 'removed handler called 5');
            removed.reset();

            // second emit, only the 5 base ones are called again
            this.emitter.emit('test', data);
            for (x = 0; x < 5; x++) {
              assert.equal(this.handlers[x].callCount, 1,
                'handler ' + x + ' called again');
            }
            assert.equal(removed.callCount, 0, 'removed handler not called');

          });
        });
      });
    });
  });
}
