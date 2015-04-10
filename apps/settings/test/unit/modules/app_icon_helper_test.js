'use strict';

suite('AppIconHelper > ', function() {
  var AppIconHelper;

  // null icons
  var mockapp1 = {
    manifest: {
      name: 'testAppName1',
      icons: null
    },
    manifestURL: 'testManifestURL',
    origin: 'app://testOrigin1'
  };

  // empty icons
  var mockapp2 = {
    manifest: {
      name: 'testAppName1',
      icons: {}
    },
    manifestURL: 'testManifestURL',
    origin: 'app://testOrigin1'
  };

  // relative icon urls
  var mockapp3 = {
    manifest: {
      name: 'atestAppName2',
      icons: {
        64: '64.png',
        128: '128.png',
        256: '256.png',
      }
    },
    manifestURL: 'testManifestURL',
    origin: 'app://testOrigin2'
  };

  // absolute icon urls
  var mockapp4 = {
    manifest: {
      name: 'atestAppName2',
      icons: {
        64: 'http://example.com/64.png',
        128: 'http://example.com/128.png',
        256: 'http://example.com/256.png',
      }
    },
    manifestURL: 'testManifestURL',
    origin: 'app://testOrigin2'
  };

  setup(function(done) {
    testRequire(['modules/app_icon_helper'], function(module) {
      AppIconHelper = module;
      done();
    });
  });

  test('has getIconURL method', function() {
    assert.ok(AppIconHelper.getIconURL);
  });

  test('getIconURL returns default url if app has icons:null', function() {
    assert.equal(AppIconHelper.getIconURL(mockapp1, 128),
                 '../style/images/default.png');
    assert.equal(AppIconHelper.getIconURL(mockapp1, 30),
                 '../style/images/default.png');
  });

  test('getIconURL returns default url if app has icons:{}', function() {
    assert.equal(AppIconHelper.getIconURL(mockapp2, 128),
                 '../style/images/default.png');
    assert.equal(AppIconHelper.getIconURL(mockapp2, 30),
                 '../style/images/default.png');
  });

  test('getIconURL works for exact size match, relative URLs', function() {
    assert.equal(AppIconHelper.getIconURL(mockapp3, 64),
                 'app://testorigin2/64.png');
    assert.equal(AppIconHelper.getIconURL(mockapp3, 128),
                 'app://testorigin2/128.png');
    assert.equal(AppIconHelper.getIconURL(mockapp3, 256),
                 'app://testorigin2/256.png');
  });

  test('getIconURL works for exact size match, absolute URLs', function() {
    assert.equal(AppIconHelper.getIconURL(mockapp4, 64),
                 'http://example.com/64.png');
    assert.equal(AppIconHelper.getIconURL(mockapp4, 128),
                 'http://example.com/128.png');
    assert.equal(AppIconHelper.getIconURL(mockapp4, 256),
                 'http://example.com/256.png');
  });

  test('getIconURL rounds up for non-exact size match', function() {
    assert.equal(AppIconHelper.getIconURL(mockapp4, 0),
                 'http://example.com/64.png');
    assert.equal(AppIconHelper.getIconURL(mockapp3, 32),
                 'app://testorigin2/64.png');
    assert.equal(AppIconHelper.getIconURL(mockapp3, 65),
                 'app://testorigin2/128.png');
    assert.equal(AppIconHelper.getIconURL(mockapp4, 255),
                 'http://example.com/256.png');
  });

  test('getIconURL returns largest size when nothing else is big enough',
       function() {
    assert.equal(AppIconHelper.getIconURL(mockapp3, 257),
                 'app://testorigin2/256.png');
    assert.equal(AppIconHelper.getIconURL(mockapp4, 2550),
                 'http://example.com/256.png');
  });
});
