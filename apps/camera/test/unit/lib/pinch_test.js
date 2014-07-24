suite('lib/pinch', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'lib/pinch'
    ], function(Pinch) {
      self.Pinch = Pinch;
      done();
    });
  });

  setup(function() {
    this.el = {
      addEventListener: sinon.spy(),
      removeEventListener: sinon.spy()
    };

    this.pinch = new this.Pinch(this.el);
    this.pinch.emit = sinon.spy();
  });

  suite('Pinch()', function() {
    test('Should attach to specified element', function() {
      assert.isTrue(this.el.addEventListener.called);
    });
  });

  suite('Pinch#attach()', function() {
    test('Should attach touchstart to specified element', function() {
      this.pinch.attach(this.el);

      assert.isTrue(this.el.addEventListener.calledWith('touchstart',
        this.pinch.onTouchStart));
    });
  });

  suite('Pinch#detach()', function() {
    test('Should detach touchstart from specified element', function() {
      this.pinch.detach(this.el);

      assert.isTrue(this.el.removeEventListener.calledWith('touchstart',
        this.pinch.onTouchStart));
    });
  });

  suite('Pinch#onTouchStart()', function() {
    setup(function() {
      this.pinch.isPinching = false;
    });

    test('Should NOT emit `started` for one touch', function() {
      this.pinch.onTouchStart({
        touches: [{}]
      });

      assert.isFalse(this.pinch.emit.calledWith('started'));
    });

    test('Should emit `started` for two touches', function() {
      this.pinch.onTouchStart({
        touches: [{}]
      });
      this.pinch.onTouchStart({
        touches: [{}, {}]
      });

      assert.isTrue(this.pinch.isPinching);
      assert.isTrue(this.pinch.emit.calledWith('started'));
    });

    test('Should remember last two touches for two touches', function() {
      var touchA = { identifier: 0 };
      var touchB = { identifier: 1 };
      this.pinch.onTouchStart({
        touches: [touchA, touchB]
      });

      assert.equal(this.pinch.lastTouchA, touchA);
      assert.equal(this.pinch.lastTouchB, touchB);
    });
  });

  suite('Pinch#onTouchMove()', function() {
    setup(function() {
      this.pinch.isPinching = false;
    });

    test('Should NOT emit `change` for one touch', function() {
      this.pinch.onTouchStart({
        touches: [{}]
      });
      this.pinch.onTouchMove({
        touches: [{}]
      });

      assert.isFalse(this.pinch.emit.calledWith('changed'));
    });

    test('Should emit `change` for two touches', function() {
      this.pinch.onTouchStart({
        touches: [{}]
      });
      this.pinch.onTouchStart({
        touches: [{}, {}]
      });
      this.pinch.onTouchMove({
        touches: [{}, {}]
      });

      assert.isTrue(this.pinch.emit.calledWith('changed'));
    });

    test('Should track touch "A" for two touches', function() {
      var touchA1 = { identifier: 0 };
      var touchA2 = { identifier: 0 };
      this.pinch.onTouchStart({
        touches: [touchA1, {}]
      });

      assert.equal(this.pinch.lastTouchA, touchA1);

      this.pinch.onTouchMove({
        touches: [touchA2, {}]
      });

      assert.equal(this.pinch.lastTouchA, touchA2);
    });

    test('Should track touch "B" for two touches', function() {
      var touchB1 = { identifier: 1 };
      var touchB2 = { identifier: 1 };
      this.pinch.onTouchStart({
        touches: [{}, touchB1]
      });

      assert.equal(this.pinch.lastTouchB, touchB1);

      this.pinch.onTouchMove({
        touches: [{}, touchB2]
      });

      assert.equal(this.pinch.lastTouchB, touchB2);
    });

    test('Should calculate delta for two touches', function() {
      var touchA1 = { identifier: 0, pageX: -1, pageY: -1 };
      var touchA2 = { identifier: 0, pageX: -2, pageY: -2 };
      var touchB1 = { identifier: 1, pageX:  1, pageY:  1 };
      var touchB2 = { identifier: 1, pageX:  2, pageY:  2 };
      this.pinch.onTouchStart({
        touches: [touchA1, touchB1]
      });
      this.pinch.onTouchMove({
        touches: [touchA2, touchB2]
      });

      assert.equal(this.pinch.emit.args[1][1].toFixed(4), '2.8284');
    });
  });

  suite('Pinch#onTouchEnd()', function() {
    setup(function() {
      this.pinch.isPinching = false;
    });

    test('Should NOT emit `ended` for one touch', function() {
      this.pinch.onTouchStart({
        touches: [{}]
      });
      this.pinch.onTouchEnd({
        touches: []
      });

      assert.isFalse(this.pinch.emit.calledWith('ended'));
    });

    test('Should emit `ended` for two touches', function() {
      this.pinch.onTouchStart({
        touches: [{}, {}]
      });
      this.pinch.onTouchEnd({
        touches: [{}]
      });

      assert.isFalse(this.pinch.isPinching);
      assert.isTrue(this.pinch.emit.calledWith('ended'));
    });
  });
});
