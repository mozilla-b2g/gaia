// Cards Helper Test
/* globals AppWindow, CardsHelper, MocksHelper   */

'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/js/cards_helper.js');

var mocksForCard = new MocksHelper([
  'AppWindow'
]).init();

var iconDataURI = 'data:image/png;base64,' +
                  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAa0lEQVR4nL' +
                  '2SwQ3AMAgDTTdpVmH/FdJR6KMSIUAR/dSvyD5LjhLgoyhaUsabIyGO0Dq/' +
                  '0Y4jpa85AZxjKOScBz1sVh9gC8xg3jZEZxXq9SrRYZItTh2yhY5I79DXnw' +
                  'X3/vl30AKFwNFp1NINUVMgoXCifAgAAAAASUVORK5CYII=';
var appProto = {
  launchTime: 5,
  name: 'SMS',
  frame: document.createElement('div'),
  iframe: document.createElement('iframe'),
  manifest: {
    orientation: 'portrait-primary'
  },
  rotatingDegree: 0,
  requestScreenshotURL: function() {
    return null;
  },
  getScreenshot: function(callback) {
    callback();
  },
  origin: 'http://sms.gaiamobile.org',
  blur: function() {}
};

suite('cards helper >', function() {
  mocksForCard.attachTestHelpers();
  function makeApp(config) {
    var appConfig = Object.create(appProto);
    for (var key in config) {
      appConfig[key] = config[key];
    }
    return new AppWindow(appConfig);
  }

  suite('getIconURIForApp > ', function() {
    test('gets icon from manifest.icons', function() {
      var testApp = makeApp({
        manifest: {
          'icons': {
            '32': '/img/icon-32.png'
          }
        }
      });

      var url = CardsHelper.getIconURIForApp(testApp);
      assert.equal(0, url.indexOf('http://sms.gaiamobile.org/img/icon-'),
                'got icon from manifest resolved relative to origin');
    });

    test('fallback to app.icon when manifest provides none', function() {
      var iconPath = '/img/foo.png';
      var testApp = makeApp({
        icon: iconPath,
        manifest: {}
      });
      var url = CardsHelper.getIconURIForApp(testApp);
      assert.equal(url, 'http://sms.gaiamobile.org' + iconPath,
                  'return uri from .icon resolved from origin');
    });

    test('handles data URIs', function() {
      var testApp = makeApp({
        icon: iconDataURI,
        manifest: {}
      });

      var url = CardsHelper.getIconURIForApp(testApp);
      assert.equal(url, iconDataURI,
                  'return data uri as-is');
    });
  });

  test('test escapeHTML', function() {
    var escapedStr1 =
      CardsHelper.escapeHTML('<script>"\'script  \n\r</script>', false);
    var escapedStr2 =
      CardsHelper.escapeHTML('<script>"\'script  \n\r</script>', true);
    assert.equal(escapedStr1,
      '&#60;script>"\'script &nbsp;<br/><br/>&#60;/script>');
    assert.equal(escapedStr2,
      '&#60;script>&quot;&#x27;script &nbsp;<br/><br/>&#60;/script>');
  });

});
