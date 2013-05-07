'use strict';

requireApp('homescreen/test/unit/mock_home_state.js');
requireApp('homescreen/test/unit/mock_app.js');
requireApp('homescreen/test/unit/mock_xmlhttprequest.js');
requireApp('homescreen/test/unit/mock_icon_retriever.js');
requireApp('homescreen/test/unit/mock_grid_manager.js');

requireApp('homescreen/js/page.js');

var mocksHelperForPage = new MocksHelper([
  'HomeState',
  'XMLHttpRequest',
  'IconRetriever',
  'GridManager'
]);
mocksHelperForPage.init();

suite('page.js >', function() {

  var mocksHelper = mocksHelperForPage;
  var containerNode;

  function createImageBlob() {
    var data = ['some stuff'];
    var properties = {
      type: 'image/png'
    };

    return new Blob(data, properties);
  }

  suiteSetup(function() {
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
    var iconsContainer, icon;

    function renderIcon(done) {
      function onImageLoad(e) {
        e.target.removeEventListener('load', onImageLoad);
        e.target.removeEventListener('error', onImageLoad);
        done();
      }

      icon.render(iconsContainer);

      // icon.img is instanciated in icon.render
      var img = icon.img;
      if (img.src && img.complete) {
        done();
      } else {
        // if this never happens, then we have a problem anyway
        img.addEventListener('load', onImageLoad);
        img.addEventListener('error', onImageLoad);
      }
    }

    function dragSuite() {
      test('onDragStart should work', function() {
        icon.onDragStart(icon.getTop(), icon.getLeft());
      });
    }

    function assertIconIsRendered() {
      test('icon should be rendered', function() {
        assert.equal(iconsContainer.querySelectorAll('li').length, 1);
        assert.ok(iconsContainer.querySelector('img').src);
      });
    }

    setup(function() {
      iconsContainer = document.createElement('ol');
    });

    suite('installed app >', function() {

      suite('no icon >', function() {
        setup(function(done) {
          var app = new MockApp();
          var descriptor = {
            manifestURL: app.manifestURL,
            name: app.name
          };

          console.log('no icon suite');
          icon = new Icon(descriptor, app);
          renderIcon(done);
        });

        assertIconIsRendered();
        dragSuite();
      });

      suite('data url icon >', function() {
        // this is the default icon converted to data/url
        var defaultIconAsDataUri = 'data:image/png;base64,iVBORw0KGgoA' +
        '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' +
        'BJRU5ErkJggg==';

        setup(function(done) {
          var app = new MockApp();
          var descriptor = {
            manifestURL: app.manifestURL,
            name: app.name,
            icon: defaultIconAsDataUri
          };

          icon = new Icon(descriptor, app);
          renderIcon(done);
          MockXMLHttpRequest.mSendReadyState({ response: createImageBlob() });
        });

        assertIconIsRendered();
        dragSuite();

        test('should use XHR to get the icon', function() {
          assert.ok(MockXMLHttpRequest.mLastOpenedUrl);
        });
      });

      suite('http url icon >', function() {
        var anIconAsHttpUrl = 'http://some.icon.name/icon.png';

        setup(function() {
          var app = new MockApp();
          var descriptor = {
            manifestURL: app.manifestURL,
            name: app.name,
            icon: anIconAsHttpUrl
          };

          icon = new Icon(descriptor, app);
        });

        suite('XHR works fine >', function() {
          setup(function(done) {
            renderIcon(done);
            MockXMLHttpRequest.mSendReadyState({ response: createImageBlob() });
          });

          assertIconIsRendered();
          dragSuite();

          test('should load the icon with XHR', function() {
            assert.equal(MockXMLHttpRequest.mLastOpenedUrl, anIconAsHttpUrl);
          });
        });


        suite('XHR throws an exception >', function() {
          setup(function(done) {
            // in this case, the code is using an Image to fetch a png, and this
            // sometimes is slow even if the server is local
            this.timeout(5000);
            MockXMLHttpRequest.mThrowAtNextSend();
            renderIcon(done);
          });

          assertIconIsRendered();
          dragSuite();
        });
      });

      suite('http url icon, wrong old rendered icon >', function() {
        var anIconAsHttpUrl = 'http://some.icon.name/icon.png';

        setup(function() {
          var app = new MockApp();
          var descriptor = {
            manifestURL: app.manifestURL,
            name: app.name,
            icon: anIconAsHttpUrl,
            oldRenderedIcon: undefined
          };

          icon = new Icon(descriptor, app);
        });

        suite('XHR works fine >', function() {
          setup(function(done) {
            renderIcon(done);
            MockXMLHttpRequest.mSendReadyState({ response: createImageBlob() });
          });

          assertIconIsRendered();
          dragSuite();

          test('should load the icon with XHR', function() {
            assert.equal(MockXMLHttpRequest.mLastOpenedUrl, anIconAsHttpUrl);
          });
        });


        suite('XHR throws an exception >', function() {
          setup(function(done) {
            // in this case, the code is using an Image to fetch a png, and this
            // sometimes is slow even if the server is local
            this.timeout(5000);
            MockXMLHttpRequest.mThrowAtNextSend();
            renderIcon(done);
          });
          assertIconIsRendered();
          dragSuite();
        });
      });


    });

    suite('downloading app >', function() {
      setup(function(done) {
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
        renderIcon(done);
      });

      assertIconIsRendered();
      dragSuite();

    });



  });
});
