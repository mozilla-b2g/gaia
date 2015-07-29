/* global loadBodyHTML */
'use strict';

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('homescreens > panel', () => {
  var modules = [
    'panels/homescreens/panel'
  ];

  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'panels/homescreens/wallpaper': 'MockWallpaper',
      'panels/homescreens/homescreen_name': 'MockHomescreenName'
    }
  };

  var panel;
  var mockWallpaper;
  var mockWallpaperSrc;
  var mockHomescreenName;
  var mockHomescreenNameName;

  suiteSetup(done => {
    loadBodyHTML('_homescreens.html');

    // Define MockSettingsPanel.
    define('MockSettingsPanel', () => {
      return options => {
        return {
          init: options.onInit.bind(options),
          beforeShow: options.onBeforeShow.bind(options),
          beforeHide: options.onBeforeHide.bind(options)
        };
      };
    });

    // Define MockWallpaper.
    mockWallpaperSrc = 'mockSrc';
    mockWallpaper = {
      wallpaperSrc: mockWallpaperSrc,
      selectWallpaper: () => {
      },
      observe: () => {
      },
      unobserve: () => {
      }
    };
    define('MockWallpaper', () => {
      return () => {
        return mockWallpaper;
      };
    });

    // Define MockHomescreenName.
    mockHomescreenNameName = 'New Home Screen';
    mockHomescreenName = {
      name: mockHomescreenNameName,
      observe: () => {
      },
      unobserve: () => {
      }
    };
    define('MockHomescreenName', () => {
      return () => {
        return mockHomescreenName;
      };
    });

    testRequire(modules, map, Panel => {
      panel = Panel();
      done();
    });
  });

  test('observe wallpaperSrc when onBeforeShow', () => {
    panel.init(document.body);
    this.sinon.stub(mockWallpaper, 'observe');
    panel.beforeShow();
    assert.ok(mockWallpaper.observe.calledWith('wallpaperSrc'));

    var location = document.location;
    assert.equal(
      document.querySelector('.wallpaper-preview').src,
      location.protocol + '//' + location.host +
      location.pathname.replace('_sandbox.html', mockWallpaperSrc));
  });

  test('unobserve wallpaperSrc when onHide', () => {
    panel.init(document.body);
    this.sinon.stub(mockWallpaper, 'unobserve');
    panel.beforeHide();
    assert.ok(mockWallpaper.unobserve.calledWith('wallpaperSrc'));
  });

  test('observe name when onBeforeShow', () => {
    panel.init(document.body);
    this.sinon.stub(mockHomescreenName, 'observe');
    panel.beforeShow();
    assert.ok(mockHomescreenName.observe.calledWith('name'));

    assert.equal(document.querySelector('.current-homescreen').textContent,
      mockHomescreenNameName);
  });

  test('unobserve name when onHide', () => {
    panel.init(document.body);
    this.sinon.stub(mockHomescreenName, 'unobserve');
    panel.beforeHide();
    assert.ok(mockHomescreenName.unobserve.calledWith('name'));
  });
});
