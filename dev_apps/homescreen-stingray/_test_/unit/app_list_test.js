'use strict';
/* global AppList, MockApplications, MocksHelper, Blob */

requireApp('homescreen-stingray/test/unit/mock_applications.js');
requireApp('homescreen-stingray/js/vendor/evt.js');
requireApp('homescreen-stingray/js/app_list.js');

// mock classes and singletons
var mocksForAppList = new MocksHelper([
  'Applications'
]).init();

suite('AppList', function() {
  var appListDiv;
  var contianerDiv;
  var pageIndicatorDiv;
  var closeButton;
  var styleElement;
  var styleSheet;

  mocksForAppList.attachTestHelpers();

  suiteSetup(function() {
    // mock UI element
    appListDiv = document.createElement('div');
    appListDiv.id = 'app-list';
    contianerDiv = document.createElement('div');
    contianerDiv.id = 'app-list-container';
    pageIndicatorDiv = document.createElement('div');
    pageIndicatorDiv.id = 'app-list-page-indicator';
    closeButton = document.createElement('button');
    closeButton.id = 'app-list-close-button';
    styleElement = document.createElement('style');

    styleSheet = document.styleSheets[document.styleSheets.length - 1];
    styleSheet.insertRule('.app-list-icon {width: 80px; height: 80px;}', 0);

    appListDiv.appendChild(contianerDiv);
    appListDiv.appendChild(pageIndicatorDiv);
    appListDiv.appendChild(closeButton);

    appListDiv.style.width = '1280px';
    appListDiv.style.height = '800px';
    contianerDiv.style.width = '1280px';
    contianerDiv.style.height = '800px';

    document.head.appendChild(styleElement);
    document.body.appendChild(appListDiv);
  });

  suiteTeardown(function() {
    document.head.removeChild(styleElement);
    document.body.removeChild(appListDiv);
  });

  teardown(function() {
    contianerDiv.innerHTML = '';
    pageIndicatorDiv.innerHTML = '';
  });

  suite('UI APIs with no apps >', function() {
    var appList;

    setup(function() {
      appList = new AppList({
        appList: appListDiv,
        container: contianerDiv,
        pageIndicator: pageIndicatorDiv
      });
      appList.init();
      MockApplications.trigger('ready');
    });

    teardown(function() {
      appList.uninit();
    });

    test('icon size, page size', function() {
      assert.equal(appList._iconDimensions.width, 80);
      assert.equal(appList._iconDimensions.height, 80);
      assert.equal(appList._pagingSize.numIconsPerRow, 16);
      assert.equal(appList._pagingSize.numIconsPerCol, 10);
      assert.equal(appList._currentPage, 0);
    });

    test('show', function(done) {
      appList.on('opened', function() {
        assert.isFalse(appListDiv.hidden);
        assert.isFalse(appList.show());
        done();
      });
      assert.isFalse(appList.isShown());
      assert.isTrue(appList.show());
    });

    test('hide', function(done) {
      appList.on('closed', function() {
        assert.isTrue(appListDiv.hidden);
        done();
      });
      appList.on('opened', function() {
        assert.isTrue(appList.hide());
      });

      assert.isFalse(appList.hide());
      assert.isTrue(appList.show());
    });
  });

  suite('mock app loaded', function() {
    var appList;
    var dummyIcon = new Blob(['dummy icon'], {'type': 'image/jpg'});
    var dummyApps = [];

    function createMockAppEntries(count) {
      for (var i = 0; i < count; i++) {
        dummyApps.push({
          'manifestURL': 'app://test-' + i + '.gaiamobile.org/manifest.webapp',
          'entryPoint': '',
          'name': 'test-app-' + i
        });
      }
    }

    suiteSetup(function() {
      // A page can contain 160 app, we need 161 to have two pages.
      createMockAppEntries(161);
    });

    setup(function() {
      MockApplications.mEntries = dummyApps;
      MockApplications.mIconBlob = dummyIcon;

      appList = new AppList({
        appList: appListDiv,
        container: contianerDiv,
        pageIndicator: pageIndicatorDiv
      });
      appList.init();

      MockApplications.trigger('ready');

      appList.show();
    });

    teardown(function() {
      appList.uninit();
    });

    test('total pages', function() {
      assert.equal(appList._pages.length, 2);
    });

    test('set page', function() {
      assert.equal(appList._currentPage, 0);

      assert.isFalse(appList.setPage(-1));
      assert.isFalse(appList.setPage(2));
      assert.equal(appList._currentPage, 0);

      assert.isTrue(appList.setPage(1));
      assert.equal(appList._currentPage, 1);
    });

    test('add app', function() {
      var newApp = {
        'manifestURL': 'app://new-app.gaiamobile.org/manifest.webapp',
        'entryPoint': '',
        'name': 'new-app'
      };
      assert.equal(appList._pages[1].getIconCount(), 1);
      MockApplications.trigger('install', [newApp]);
      assert.equal(appList._pages[1].getIconCount(), 2);
    });

    test('remove app', function() {
      var entry = {
        'manifestURL': 'app://test-0.gaiamobile.org/manifest.webapp',
        'entryPoint': '',
        'name': 'test-app-0'
      };

      appList.setPage(1);
      assert.equal(appList._currentPage, 1);
      assert.equal(appList._pages.length, 2);

      MockApplications.trigger('uninstall', [entry]);
      assert.equal(appList._pages.length, 1);
      assert.equal(appList._currentPage, 0);
    });

    test('update app', function() {
      var entry = {
        'manifestURL': 'app://test-0.gaiamobile.org/manifest.webapp',
        'entryPoint': '',
        'name': 'test-app-0'
      };

      var spied = this.sinon.spy(MockApplications, 'getIconBlob');
      MockApplications.trigger('update', [entry]);
      assert.isTrue(spied.called);
      spied.restore();
    });

  });
});
