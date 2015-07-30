'use strict';

/* global StopRecordingEvent, MockNavigatorSettings */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/stop_recording_event.js');

suite('StopRecordingEvent', function() {

  setup(function() {
    this.realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    this.handler = this.sinon.stub();
    window.addEventListener('stoprecording', this.handler);

    StopRecordingEvent.start();
  });

  teardown(function() {
    StopRecordingEvent.stop();
    navigator.mozSettings = this.realMozSettings;
    window.removeEventListener('stoprecording', this.handler);
  });

  test('test runner has does not have document.hidden set', function() {
    // The StopRecordingEvent module will not work when the document is
    // hidden so bail out explictly if that is not the case.
    assert.isFalse(document.hidden,
                   'StopRecordingEvent only works when !document.hidden');
  });

  test('setting private.broadcast.stop_recording triggers event',
       function() {
         // Setting this property to true should send an event
         navigator.mozSettings.createLock().set({
           'private.broadcast.stop_recording': true
         });
         assert.ok(this.handler.calledOnce);

         // Resetting to false should not send another event
         navigator.mozSettings.createLock().set({
           'private.broadcast.stop_recording': false
         });
         assert.ok(this.handler.calledOnce);
       });

  test('no events triggered after stop() called', function() {
    StopRecordingEvent.stop();
    navigator.mozSettings.createLock().set({
      'private.broadcast.stop_recording': true
    });
    assert.ok(this.handler.notCalled);
  });
});
