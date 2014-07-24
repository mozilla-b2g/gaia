suite('views/faces', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['views/faces'], function(FacesView) {
      self.FacesView = FacesView;
      done();
    });
  });

  setup(function() {
    var self = this;
    this.FaceView = sinon.spy();
    this.FaceView.prototype = {
      FaceView: sinon.spy(),
      hide: sinon.spy(),
      appendTo: sinon.spy(),
      setPosition: sinon.spy(),
      setDiameter: sinon.spy(),
      show: sinon.spy()
    };
    // Shortcuts
    this.view = new this.FacesView({
      FaceView: this.FaceView
    });
  });

  suite('FacesView#configure()', function() {
    test('Should create Face Views for the max number of faces', function() {
      this.view.configure(10);
      assert.ok(this.view.faces.length === 10);
    });
  });

  suite('FacesView#renderFace()', function() {
    test('Should show and configure the face view based on the face object', function() {
      var face = {
        x: 320,
        y: 400,
        diameter: 300
      };
      var faceView = new this.FaceView();
      this.view.renderFace(face, faceView);
      assert.ok(faceView.setPosition.called);
      assert.ok(faceView.setDiameter.called);
      assert.ok(faceView.show.called);
    });
  });

  suite('FacesView#hideFaces()', function() {
    test('Should call hide once for each face view', function() {
      var faceView = {
        hide: sinon.spy()
      };
      this.view.faces = [faceView, faceView, faceView];
      this.view.hideFaces();
      assert.ok(faceView.hide.calledThrice);
    });
  });

  suite('FacesView#clear()', function() {
    test('Should remove faces DOM elements and reset faces', function() {
      this.view.el.removeChild = sinon.spy();
      this.view.faces = ['face', 'face', 'face'];
      this.view.clear();
      assert.ok(this.view.el.removeChild.calledThrice);
      assert.ok(this.view.faces.length === 0);
    });
  });

});