/*jshint maxlen:false*/
'use strict';

require('/shared/js/l10n.js');

suite('controllers/confirm', function() {
  suiteSetup(function(done) {
    var modules = this.modules = {};
    requirejs([
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

  suite('ConfirmController#onRecordingChange()', function() {
    setup(function() {
      this.app.activity.pick = true;
      this.controller.recorded = true;
      sinon.stub(this.controller, 'renderView');
    });

    test('Should set `recorded` to true if starting', function() {
      this.controller.recorded = false;
      this.controller.onRecordingChange('starting');
      assert.isTrue(this.controller.recorded);
    });

    test('Should set `recorded` to false if error', function() {
      this.controller.onRecordingChange('error');
      assert.isFalse(this.controller.recorded);
    });

    test('Should render view if stopped', function() {
      this.controller.onRecordingChange('stopped');
      sinon.assert.called(this.controller.renderView);
    });

    test('Should not do anything if recording failed and stopped', function() {
      this.controller.recorded = false;
      this.controller.onRecordingChange('stopped');
      sinon.assert.notCalled(this.controller.renderView);
    });

    test('Should not do anything if there is no active activity', function() {
      this.app.activity.pick = false;
      this.controller.onRecordingChange('stopped');
      sinon.assert.notCalled(this.controller.renderView);
    });
  });

  suite('ConfirmController#onNewMedia()', function() {
    test('Should not do anything if there is no active activity', function() {
      this.app.activity.pick = false;
      this.controller.onNewMedia({});
      assert.ok(this.app.ConfirmView.notCalled);
    });
  });

});
