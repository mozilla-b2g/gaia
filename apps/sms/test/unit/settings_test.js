/*
  Settings Tests
*/
'use strict';

requireApp('sms/test/unit/mock_moz_settings.js');
requireApp('sms/js/settings.js');


suite('Message App settings Unit-Test', function() {
  var nativeSettings = navigator.mozSettings;

  suite('Fetch mms messaage size limitation', function() {
    test('Query size limitation without settings', function(done) {
      Settings.getMmsSizeLimitation(function callback(size) {
        assert.equal(size, null);
        done();
      });
    });

    test('Query size limitation with settings exist(300KB)', function(done) {
      navigator.mozSettings = MockMozSettings;
      Settings.getMmsSizeLimitation(function callback(size) {
        assert.equal(size, 300 * 1024);
        navigator.mozSettings = nativeSettings;
        done();
      });
    });
  });
});
