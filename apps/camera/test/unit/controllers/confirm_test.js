/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('controllers/confirm', function() {
  suiteSetup(function(done) {
    var modules = this.modules = {};
    req([
      'controllers/confirm',
      'views/confirm'
    ], function(Controller, ConfirmView) {
      modules.controller = Controller;
      modules.ConfirmView = ConfirmView;
      done();
    });
  });

  setup(function() {
    var ConfirmView = this.modules.ConfirmView;
    var Controller = this.modules.controller;

    this.app = {
      activity: {},
      camera: { on: sinon.spy() },
      ConfirmView: ConfirmView,
      on: sinon.spy()
    };

    this.controller = new Controller(this.app);
    this.sandbox = sinon.sandbox.create();
    this.sandbox.spy(this.app, 'ConfirmView');
    this.sandbox.stub(ConfirmView.prototype);
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('ConfirmController()', function() {
    test('Should bind to app `newmedia` event', function() {
      assert.ok(this.app.on.calledWith('newmedia'));
    });
  });

  suite('ConfirmController#onNewMedia()', function() {
    test('Should not do anything if there is no active activity', function() {
      this.app.activity.active = false;
      this.controller.onNewMedia({});
      assert.ok(this.app.ConfirmView.notCalled);
    });
  });

});
