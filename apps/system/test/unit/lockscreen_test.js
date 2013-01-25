'use strict';

requireApp('system/test/unit/mock_settings_listener.js');
requireApp('system/test/unit/mocks_helper.js');
requireApp('system/test/unit/mock_l10n.js');

requireApp('system/js/lockscreen.js');

var mocksForStatusBar = ['SettingsListener'];

mocksForStatusBar.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

suite('lockscreen', function() {
  var mocksHelper;

  var realSettingsListener, realMozL10n;

  var fakeLockscreenPanel;

  suiteSetup(function() {
    mocksHelper = new MocksHelper(mocksForStatusBar);
    mocksHelper.suiteSetup();
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    fakeLockscreenPanel = document.createElement('div');
    fakeLockscreenPanel.classList.add('lockscreen-panel');
    fakeLockscreenPanel.setAttribute('data-wallpaper', '');
    document.body.appendChild(fakeLockscreenPanel);
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    navigator.mozL10n = realMozL10n;
  });

  teardown(function() {
    mocksHelper.teardown();
  });

  test('wallpaper', function(done) {
    var red_png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAHgAQMAAADuQiYHAAAAA1BMVEX/AAAZ4gk3AAAAKUlEQVR4Xu3AMQEAAADCIPuntsROWAQAAAAAAAAAAAAAAAAAAAAAAADgTOAAAZXle7kAAAAASUVORK5CYII=';

    LockScreen.updateBackground(red_png);

    (function checkCanvas() {
      var canvas = fakeLockscreenPanel.getElementsByTagName('canvas')[0];
      if (!canvas) {
        setTimeout(checkCanvas, 10);
        return;
      }
      var ctx = canvas.getContext('2d');
      var top_pixel = ctx.getImageData(0, 0, 1, 1).data;
      var canvasNotDrawn = top_pixel[3] == 0;

      assert.equal(top_pixel[0], 77);
      assert.equal(top_pixel[1], 0);
      assert.equal(top_pixel[2], 0);

      var center_width = Math.floor(canvas.width / 2);
      var center_height = Math.floor(canvas.height / 2);
      var center_pixel = ctx.getImageData(center_width, center_height,
                                          1 , 1).data;
      assert.equal(center_pixel[0], 251);
      assert.equal(center_pixel[1], 0);
      assert.equal(center_pixel[2], 0);

      done();
    })();

  });
});
