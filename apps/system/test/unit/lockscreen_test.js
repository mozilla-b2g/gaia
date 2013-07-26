'use strict';
requireApp('system/test/unit/mock_clock.js', function() {
  window.realClock = window.Clock;
  window.Clock = MockClock;
  requireApp('system/js/lockscreen.js');
});

requireApp('system/test/unit/mock_settings_listener.js');
requireApp('system/test/unit/mocks_helper.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_telephony.js');

requireApp('system/js/lockscreen.js');

var mocksForStatusBar = ['SettingsListener'];

mocksForStatusBar.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

suite('lockscreen', function() {
  var subject;

  var mocksHelper;

  var realSettingsListener, realMozL10n;

  var fakeLockscreenPanel;

  var red_png, green_png;

  var realMozTelephony;
  var domPasscodePad;
  var domEmergencyCallBtn;

  suiteSetup(function() {
    mocksHelper = new MocksHelper(mocksForStatusBar);
    mocksHelper.suiteSetup();
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    red_png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAHgAQMAAADuQiYHAAAAA1BMVEX/AAAZ4gk3AAAAKUlEQVR4Xu3AMQEAAADCIPuntsROWAQAAAAAAAAAAAAAAAAAAAAAAADgTOAAAZXle7kAAAAASUVORK5CYII=';
    green_png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAHgAQMAAAAlmcL5AAAAA1BMVEUAgACc+aWRAAAAKUlEQVR4Xu3BMQEAAADCoPVPbQ0PoAAAAAAAAAAAAAAAAAAAAAAAAL4MSSAAAZTTyRkAAAAASUVORK5CYII=';
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    subject = window.LockScreen;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = window.MockNavigatorMozTelephony;

    fakeLockscreenPanel = document.createElement('div');
    fakeLockscreenPanel.classList.add('lockscreen-panel');
    fakeLockscreenPanel.setAttribute('data-wallpaper', '');
    document.body.appendChild(fakeLockscreenPanel);

    domPasscodePad = document.createElement('div');
    domPasscodePad.id = 'lockscreen-passcode-pad';
    domEmergencyCallBtn = document.createElement('a');
    domEmergencyCallBtn.dataset.key = 'e';
    domPasscodePad.appendChild(domEmergencyCallBtn);
    document.body.appendChild(domPasscodePad);
    subject.passcodePad = domPasscodePad;

    mocksHelper.setup();
  });

  teardown(function() {
    fakeLockscreenPanel.parentNode.removeChild(fakeLockscreenPanel);
    navigator.mozTelephony = realMozTelephony;
    document.body.removeChild(domPasscodePad);
    LockScreen.passcodePad = null;

    mocksHelper.teardown();
  });

  test('wallpaper has vignette effect', function(done) {
    LockScreen.updateBackground(red_png);

    (function checkCanvas() {
      var canvas = fakeLockscreenPanel.getElementsByTagName('canvas')[0];
      if (!canvas) {
        setTimeout(checkCanvas, 10);
        return;
      }

      try {
        var ctx = canvas.getContext('2d');
        var top_pixel = ctx.getImageData(0, 0, 1, 1).data;

        assert.equal(top_pixel[0], 77);
        assert.equal(top_pixel[1], 0);
        assert.equal(top_pixel[2], 0);

        var center_width = Math.floor(canvas.width / 2);
        var center_height = Math.floor(canvas.height / 2);
        var center_pixel = ctx.getImageData(center_width, center_height,
                                            1 , 1).data;
        assert.ok(center_pixel[0] <= 251 || center_pixel[0] >= 250);
        assert.equal(center_pixel[1], 0);
        assert.equal(center_pixel[2], 0);

        done();
      } catch (e) {
        done(e);
      }
    })();

  });

  test('multiple wallpaper updates only keep one canvas', function(done) {
    function waitFirstUpdate(callback) {
      var first_canvas = fakeLockscreenPanel.getElementsByTagName('canvas')[0];
      if (!first_canvas) {
        setTimeout(waitFirstUpdate, 10, callback);
        return;
      }

      setTimeout(callback, 10);
    }

    function waitSecondUpdate(callback) {
      var second_canvas = fakeLockscreenPanel.getElementsByTagName('canvas')[0];

      var ctx = second_canvas.getContext('2d');
      var top_pixel = ctx.getImageData(0, 0, 1, 1).data;
      // Canvas is not green yet
      if (top_pixel[1] == 0) {
        setTimeout(waitSecondUpdate, 10, callback);
        return;
      }

      setTimeout(callback, 10);
    }

    LockScreen.updateBackground(red_png);
    setTimeout(waitFirstUpdate, 10, function then() {
      LockScreen.updateBackground(green_png);

      setTimeout(waitSecondUpdate, 10, function then2() {
        assert.equal(
          fakeLockscreenPanel.getElementsByTagName('canvas').length, 1);
        done();
      });
    });
  });

  test('Emergency call: should disable emergency-call button',
  function() {
    navigator.mozTelephony.calls = {length: 1};
    var evt = {type: 'callschanged'};
    subject.handleEvent(evt);
    assert.isTrue(domEmergencyCallBtn.classList.contains('disabled'));
  });

  test('Emergency call: should enable emergency-call button',
  function() {
    navigator.mozTelephony.calls = {length: 0};
    var evt = {type: 'callschanged'};
    subject.handleEvent(evt);
    assert.isFalse(domEmergencyCallBtn.classList.contains('disabled'));
  });
});
