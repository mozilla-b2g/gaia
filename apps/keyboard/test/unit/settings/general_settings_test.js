'use strict';

/* global SettingsView, GeneralSettingsGroupView */

require('/js/settings/close_locks.js');
require('/js/settings/settings_view.js');

require('/js/settings/general_settings.js');

suite('GeneralSettingsGroupView', function() {
  var groupView;
  var stubSettingsView;
  var container;
  var app;

  setup(function() {
    container = { stub: 'container' };
    app = { stub: 'app' };
    window.SoundFeedbackSettings = { stub: 'SoundFeedbackSettings' };
    window.VibrationFeedbackSettings = { stub: 'VibrationFeedbackSettings' };
    window.IMEngineSettings = { stub: 'IMEngineSettings' };

    this.sinon.stub(document, 'getElementById').returns(container);
    stubSettingsView = this.sinon.stub(Object.create(SettingsView.prototype));
    this.sinon.stub(window, 'SettingsView').returns(stubSettingsView);

    groupView = new GeneralSettingsGroupView(app);
  });

  test('start/stop', function() {
    groupView.start();

    assert.isTrue(document.getElementById.calledWith(groupView.PANEL_ID));

    assert.isTrue(window.SettingsView.calledWith(
      app, container, window.SoundFeedbackSettings));
    assert.isTrue(window.SettingsView.calledWith(
      app, container, window.VibrationFeedbackSettings));
    assert.isTrue(window.SettingsView.calledWith(
      app, container, window.IMEngineSettings));
    assert.isTrue(stubSettingsView.start.calledThrice);

    groupView.stop();

    assert.isTrue(stubSettingsView.stop.calledThrice);
  });
});
