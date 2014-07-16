suite('views/face', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    window.req(['views/face'], function(FaceView) {
      self.FaceView = FaceView;
      done();
    });
  });

  setup(function() {
    var self = this;
    // Shortcuts
    this.view = new this.FaceView();
    this.view.classList = {
      add: function() {}
    };
    this.classes = this.view.el.classList;
  });

  suite('FaceView#setPosition()', function() {
    test('Should set top left css values', function() {
      this.view.setPosition(42, 101);
      assert.equal(this.view.el.style.left, '42px');
      assert.equal(this.view.el.style.top, '101px');
    });
  });

  suite('FaceView#setDiameter()', function() {
    test('Should set width height css values', function() {
      this.view.setDiameter(50);
      assert.equal(this.view.el.style.width, '50px');
      assert.equal(this.view.el.style.height, '50px');
    });
  });

  suite('FaceView#setLargestFace()', function() {
    test('Should set setLargestFace values', function() {
      this.view.setLargestFace(true);
      assert.isTrue(this.classes.contains('main-face'));
    });
  });

});
