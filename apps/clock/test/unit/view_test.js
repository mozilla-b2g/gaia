suite('View', function() {
  var Emitter, View;

  suiteSetup(function(done) {
    testRequire(['emitter', 'view'], function(emitter, view) {
      Emitter = emitter;
      View = view;
      done();
    });
  });

  setup(function() {
    this.element = document.createElement('div');
  });

  suite('View.instance', function() {
    test('creates new View', function() {
      var view = View.instance(this.element);
      assert.ok(view instanceof View);
    });
    test('returns same View on second run', function() {
      var view = View.instance(this.element);
      assert.equal(View.instance(this.element), view);
    });

    suite('using subclass', function() {
      setup(function() {
        this.ctor = this.sinon.spy(function(element) {
          View.call(this, element);
        });
        this.ctor.prototype = Object.create(View.prototype);
        this.view = View.instance(this.element, this.ctor);
      });
      test('returns instance of ctor', function() {
        assert.ok(this.view instanceof this.ctor);
      });
      test('called ctor', function() {
        assert.ok(this.ctor.calledWith(this.element));
      });
      test('returns same view on second run', function() {
        assert.equal(this.view, View.instance(this.element));
        assert.equal(this.ctor.callCount, 1,
          'did not call ctor again');
      });
    });
  });

  suite('tests on instances', function() {
    setup(function() {
      this.element.id = 'test-element';
      this.view = new View(this.element);
      this.visibleSpy = this.sinon.spy();
      this.view.on('visibilitychange', this.visibleSpy);
    });
    test('instanceof Emitter', function() {
      assert.ok(this.view instanceof Emitter);
    });
    test('has element', function() {
      assert.equal(this.view.element, this.element);
    });
    test('has id', function() {
      assert.equal(this.view.id, this.element.id);
    });
    test('starts visible', function() {
      assert.isTrue(this.view.visible);
    });
    suite('set visible true', function() {
      setup(function() {
        this.view.visible = true;
      });
      test('event not called(changed to same state)', function() {
        assert.equal(this.visibleSpy.callCount, 0);
      });
    });
    suite('set visible false', function() {
      setup(function() {
        this.view.visible = false;
      });
      test('event called', function() {
        assert.ok(this.visibleSpy.calledWith(false));
      });
      test('added hidden class', function() {
        assert.ok(this.element.classList.contains('hidden'));
      });
      suite('set visible false', function() {
        setup(function() {
          this.visibleSpy.reset();
          this.view.visible = false;
        });
        test('event not called(changed to same state)', function() {
          assert.equal(this.visibleSpy.callCount, 0);
        });
      });
      suite('set visible true', function() {
        setup(function() {
          this.visibleSpy.reset();
          this.view.visible = true;
        });
        test('event called', function() {
          assert.ok(this.visibleSpy.calledWith(true));
        });
        test('removed hidden class', function() {
          assert.isFalse(this.element.classList.contains('hidden'));
        });
      });
    });
  });
});
