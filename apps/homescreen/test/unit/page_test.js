'use strict';

requireApp('homescreen/test/unit/mock_app.js');
requireApp('homescreen/test/unit/mock_xmlhttprequest.js');
requireApp('homescreen/test/unit/mock_grid_manager.js');
requireApp('homescreen/test/unit/mocks_helper.js');

requireApp('homescreen/js/page.js');

var mocksForHomescreenPageTest = [
  'XMLHttpRequest',
  'GridManager'
];

mocksForHomescreenPageTest.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

suite('page.js >', function() {
  var mocksHelper;

  var containerNode;

  suiteSetup(function() {
    mocksHelper = new MocksHelper(mocksForHomescreenPageTest);
    mocksHelper.suiteSetup();
  });

  setup(function() {
    mocksHelper.setup();

    var fakeIconMarkup =
      '<div id="fake-icon">' +
        '<span id="fake-icon-name-wrapper" class="labelWrapper">' +
          '<span id="fake-icon-name"></span>' +
        '</span>' +
      '</div>';

    containerNode = document.createElement('div');
    containerNode.innerHTML = fakeIconMarkup;
    document.body.appendChild(containerNode);
  });

  teardown(function() {
    mocksHelper.teardown();

    containerNode.parentNode.removeChild(containerNode);
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  suite('Icon >', function() {
    var iconsContainer;

    setup(function() {
      iconsContainer = document.createElement('ol');
    });

    suite('installed app >', function() {
      var icon, descriptor;

      suite('no icon >', function() {
        setup(function() {
          var app = new MockApp();
          descriptor = {
            manifestURL: app.manifestURL,
            name: app.name
          };

          icon = new Icon(descriptor, app);
          icon.render(iconsContainer);
        });

        test('icon should be rendered', function() {
          assert.equal(iconsContainer.querySelectorAll('li').length, 1);
        });
      });

      suite('data url icon >', function() {
        // this is the default icon converted to data/url
        var defaultIconAsDataUri = 'data:image/png;base64,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';

        setup(function() {
          var app = new MockApp();
          descriptor = {
            manifestURL: app.manifestURL,
            name: app.name,
            icon: defaultIconAsDataUri
          };

          icon = new Icon(descriptor, app);
          icon.render(iconsContainer);
        });

        test('icon should be rendered', function() {
          // note: this doesn't test if the icon is actually displayed
          // but merely that we don't fail somewhere
          assert.equal(iconsContainer.querySelectorAll('li').length, 1);
        });

        test('should not use XHR to get the icon', function() {
          assert.isUndefined(MockXMLHttpRequest.mLastOpenedUrl);
        });
      });

      suite('http url icon >', function() {
        var anIconAsHttpUrl = 'http://some.icon.name/icon.png';

        setup(function() {
          var app = new MockApp();
          descriptor = {
            manifestURL: app.manifestURL,
            name: app.name,
            icon: anIconAsHttpUrl
          };

          icon = new Icon(descriptor, app);
        });

        suite('XHR works fine >', function() {
          setup(function() {
            icon.render(iconsContainer);
          });

          test('icon should be rendered', function() {
            // note: this doesn't test if the icon is actually displayed
            // but merely that we don't fail somewhere
            assert.equal(iconsContainer.querySelectorAll('li').length, 1);
          });

          test('should load the icon with XHR', function() {
            assert.equal(MockXMLHttpRequest.mLastOpenedUrl, anIconAsHttpUrl);
          });
        });


        suite('XHR throws an exception >', function() {
          setup(function() {
            MockXMLHttpRequest.mThrowAtNextSend();
            icon.render(iconsContainer);
          });
          test('icon should still be rendered', function() {
            // note: this doesn't test if the icon is actually displayed
            // but merely that we don't fail somewhere
            assert.equal(iconsContainer.querySelectorAll('li').length, 1);
          });
        });
      });

      suite('http url icon, wrong old rendered icon >', function() {
        var anIconAsHttpUrl = 'http://some.icon.name/icon.png';

        setup(function() {
          var app = new MockApp();
          descriptor = {
            manifestURL: app.manifestURL,
            name: app.name,
            icon: anIconAsHttpUrl,
            oldRenderedIcon: undefined
          };

          icon = new Icon(descriptor, app);
        });

        suite('XHR works fine >', function() {
          setup(function() {
            icon.render(iconsContainer);
          });

          test('icon should be rendered', function() {
            // note: this doesn't test if the icon is actually displayed
            // but merely that we don't fail somewhere
            assert.equal(iconsContainer.querySelectorAll('li').length, 1);
          });

          test('should load the icon with XHR', function() {
            assert.equal(MockXMLHttpRequest.mLastOpenedUrl, anIconAsHttpUrl);
          });
        });


        suite('XHR throws an exception >', function() {
          setup(function() {
            MockXMLHttpRequest.mThrowAtNextSend();
            icon.render(iconsContainer);
          });
          test('icon should still be rendered', function() {
            // note: this doesn't test if the icon is actually displayed
            // but merely that we don't fail somewhere
            assert.equal(iconsContainer.querySelectorAll('li').length, 1);
          });
        });
      });


    });

    suite('downloading app >', function() {
      var icon;

      setup(function() {
        var app = new MockApp({
          downloading: true,
          installState: 'pending',
          manifest: null
        });

        var descriptor = {
          manifestURL: app.manifestURL,
          name: app.name
        };

        icon = new Icon(descriptor, app);
        icon.render(iconsContainer);
      });

      test('icon should be rendered', function() {
        assert.ok(iconsContainer.querySelector('li'));
      });
    });



  });
});
