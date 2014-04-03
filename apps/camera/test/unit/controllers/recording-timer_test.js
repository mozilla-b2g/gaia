/*global req*/
'use strict';

suite('controllers/recording-timer', function() {
  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'controllers/recording-timer',
      'views/recording-timer'
    ], function(App, RecordingTimerController, RecordingTimerView) {
      self.RecordingTimerController = RecordingTimerController.RecordingTimerController;
      self.RecordingTimerView = RecordingTimerView;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.view = sinon.createStubInstance(this.RecordingTimerView);
    this.app.el = {};

    // Alias
    this.view = this.app.view;

    // Create out test instance
    this.controller = new this.RecordingTimerController(this.app);
  });

  suite('RecordingTimerController()', function() {
    test('Should respond to recording change', function() {
      assert.isTrue(this.app.on.calledWith('change:recording'));
    });

    test('Should put the view in the DOM', function() {
      assert.isTrue(this.view.appendTo.calledWith(this.app.el));
    });

    test('Should update the view value when the recording time changes', function() {
      assert.isTrue(this.app.on.calledWith('camera:recorderTimeUpdate', this.view.value));
    });
  });

  suite('RecordingTimerController#onRecordingChange()', function() {
    test('Should hide the view if not recording', function() {
      this.controller.onRecordingChange(false);
      assert.isTrue(this.view.hide.called);
    });

    test('Should show and reset the view if recording', function() {
      this.controller.onRecordingChange(true);
      assert.isTrue(this.view.show.called);
      assert.isTrue(this.view.value.calledWith(0));
    });
  });
});
