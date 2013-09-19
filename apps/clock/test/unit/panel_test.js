suite('Panel', function() {
  var Panel;

  suiteSetup(function(done) {
    testRequire(['panel'], function(panel) {
      Panel = panel;
      done();
    });
  });

  setup(function() {
    this.element = document.createElement('div');
    this.panel = new Panel(this.element);
  });

  suite('active', function() {
    setup(function() {
      this.activeSpy = this.sinon.spy();
      this.panel.on('active', this.activeSpy);
    });
    test('starts out active false', function() {
      assert.isFalse(this.panel.active);
    });
    test('class not on element', function() {
      assert.isFalse(this.element.classList.contains('active'));
    });

    suite('setting false', function() {
      setup(function() {
        this.panel.active = false;
      });
      test('does not call active event(same state)', function() {
        assert.equal(this.activeSpy.callCount, 0);
      });
      test('class not on element', function() {
        assert.isFalse(this.element.classList.contains('active'));
      });
    });

    suite('setting true', function() {
      setup(function() {
        this.panel.active = true;
      });
      test('calls active event', function() {
        assert.ok(this.activeSpy.calledWith(true));
      });
      test('active is true', function() {
        assert.isTrue(this.panel.active);
      });
      test('class on element', function() {
        assert.isTrue(this.element.classList.contains('active'));
      });

      suite('setting true', function() {
        setup(function() {
          this.activeSpy.reset();
          this.panel.active = true;
        });
        test('does not call active event(same state)', function() {
          assert.equal(this.activeSpy.callCount, 0);
        });
        test('class on element', function() {
          assert.isTrue(this.element.classList.contains('active'));
        });
      });

      suite('setting false', function() {
        setup(function() {
          this.activeSpy.reset();
          this.panel.active = false;
        });
        test('calls active event', function() {
          assert.ok(this.activeSpy.calledWith(false));
        });
        test('active is false', function() {
          assert.isFalse(this.panel.active);
        });
        test('class not on element', function() {
          assert.isFalse(this.element.classList.contains('active'));
        });
      });
    });
  });

  suite('transition', function() {
    setup(function() {
      this.panel.transition = 'test-transition';
    });
    test('adds class', function() {
      assert.isTrue(this.element.classList.contains('test-transition'));
    });

    suite('change transition', function() {
      setup(function() {
        this.panel.transition = 'test-transition-2';
      });
      test('removes old class', function() {
        assert.isFalse(this.element.classList.contains('test-transition'));
      });
      test('adds new class', function() {
        assert.isTrue(this.element.classList.contains('test-transition-2'));
      });
    });

    suite('animationend event (not active)', function() {
      setup(function() {
        var event = new CustomEvent('animationend', { canBubble: true });
        this.element.dispatchEvent(event);
      });
      test('sets transition to false', function() {
        assert.isFalse(this.panel.transition);
      });
      test('removes class', function() {
        assert.isFalse(this.element.classList.contains('test-transition'));
      });
      test('sets hidden', function() {
        assert.isTrue(this.element.classList.contains('hidden'));
        assert.isFalse(this.panel.visible);
      });
    });

    suite('animationend event (active)', function() {
      setup(function() {
        this.panel.visible = true;
        this.panel.active = true;
        var event = new CustomEvent('animationend', { canBubble: true });
        this.element.dispatchEvent(event);
      });
      test('sets transition to false', function() {
        assert.isFalse(this.panel.transition);
      });
      test('removes class', function() {
        assert.isFalse(this.element.classList.contains('test-transition'));
      });
      test('does not set hidden', function() {
        assert.isFalse(this.element.classList.contains('hidden'));
        assert.isTrue(this.panel.visible);
      });
    });
  });
});
