/* global AppTitleBar, AppWindow, MocksHelper */
'use strict';

requireApp('system/test/unit/mock_app_window.js');

var mocksForAppTitleBar = new MocksHelper([
  'AppWindow'
]).init();

suite('system/AppTitleBar', function() {
  var stubById;
  mocksForAppTitleBar.attachTestHelpers();

  var fakeApp = {
    url: 'app://communications.gaiamobile.org/dialer/index.html',
    manifest: {name: 'Dialer'},
    manifestURL: 'app://communications.gaiamobile.org/manifest.webapp',
    origin: 'app://communications.gaiamobile.org'
  };

  var fakeAppWithName = {
    url: 'app://communications.gaiamobile.org/dialer/index.html',
    name: 'Phone',
    manifest: {name: 'Dialer'},
    manifestURL: 'app://communications.gaiamobile.org/manifest.webapp',
    origin: 'app://communications.gaiamobile.org'
  };

  var fakeWebSite = {
    url: 'http://google.com/index.html',
    origin: 'app://google.com'
  };

  suiteSetup(function(done) {
    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/app_titlebar.js', done);
  });

  setup(function() {
    this.sinon.useFakeTimers();
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
  });

  suite('mozbrowsermetachange', function() {
    var subject = null;
    setup(function() {
      var app = new AppWindow(fakeApp);
      subject = new AppTitleBar(app);
      subject._registerEvents();
    });

    teardown(function() {
      subject._unregisterEvents();
    });

    test('should set background when the meta is added', function() {
      subject.element.style.backgroundColor = '';
      var evt = new CustomEvent('mozbrowsermetachange', {
        detail: {
          type: 'added',
          name: 'theme-color',
          content: 'orange'
        }
      });
      subject.app.element.dispatchEvent(evt);

      assert.equal(subject.element.style.backgroundColor, 'orange');
    });

    test('should remove color when the meta is removed', function() {
      subject.element.style.backgroundColor = 'orange';
      var evt = new CustomEvent('mozbrowsermetachange', {
        detail: {
          type: 'removed',
          name: 'theme-color',
          content: 'orange'
        }
      });
      subject.app.element.dispatchEvent(evt);

      assert.equal(subject.element.style.backgroundColor, '');
    });
  });

  suite('mozbrowsertitlechange', function() {
    var subject = null;
    setup(function() {
      var app = new AppWindow(fakeApp);
      subject = new AppTitleBar(app);
      subject._registerEvents();
    });

    teardown(function() {
      subject._unregisterEvents();
    });

    test('should set background when the meta is added', function() {
      var evt = new CustomEvent('mozbrowsertitlechange', {
        detail: 'Missed calls (2)'
      });
      subject.app.element.dispatchEvent(evt);

      assert.equal(subject.title.textContent, 'Missed calls (2)');
    });
  });

  suite('mozbrowserlocationchange', function() {
    var subject = null;
    setup(function() {
      var website = new AppWindow(fakeWebSite);
      subject = new AppTitleBar(website);
      subject._registerEvents();
    });

    teardown(function() {
      subject._unregisterEvents();
    });

    test('should not do anything on apps with manifests', function() {
      var app = new AppWindow(fakeAppWithName);
      var appTitle = new AppTitleBar(app);
      appTitle._registerEvents();

      var evt = new CustomEvent('mozbrowserlocationchange', {
        detail: 'app://communications.gaiamobile.org/calllog.html'
      });
      appTitle.app.element.dispatchEvent(evt);
      this.sinon.clock.tick(500);

      assert.equal(appTitle.title.textContent, 'Phone');
      appTitle._unregisterEvents();
    });

    test('should wait before updating the title', function() {
      subject.title.textContent = 'Google';
      var evt = new CustomEvent('mozbrowserlocationchange', {
        detail: 'http://bing.com'
      });
      subject.app.element.dispatchEvent(evt);

      assert.equal(subject.title.textContent, 'Google');
      this.sinon.clock.tick(500);
      assert.equal(subject.title.textContent, 'http://bing.com');
    });

    test('should not update the title if we get a titlechange right after',
    function() {
      subject.title.textContent = 'Google';
      var evt = new CustomEvent('mozbrowserlocationchange', {
        detail: 'http://bing.com'
      });
      subject.app.element.dispatchEvent(evt);

      assert.equal(subject.title.textContent, 'Google');
      this.sinon.clock.tick(100);
      var titleEvent = new CustomEvent('mozbrowsertitlechange', {
        detail: 'Bing'
      });
      subject.app.element.dispatchEvent(titleEvent);
      this.sinon.clock.tick(500);
      assert.equal(subject.title.textContent, 'Bing');
    });
  });

  suite('name localization', function() {
    var subject = null;
    setup(function() {
      var app = new AppWindow(fakeAppWithName);
      subject = new AppTitleBar(app);
      subject._registerEvents();
    });

    teardown(function() {
      subject._unregisterEvents();
    });

    test('should set the name when created', function() {
      assert.equal(subject.title.textContent, 'Phone');
    });

    test('should update the name when it changes', function() {
      subject.app.name = 'Téléphone';
      var evt = new CustomEvent('_namechanged');
      subject.app.element.dispatchEvent(evt);

      assert.equal(subject.title.textContent, 'Téléphone');
    });

    test('localized app is not immediately overridden by titlechange event',
      function() {
      var app = new AppWindow(fakeAppWithName);
      subject = new AppTitleBar(app);
      subject._registerEvents();
      subject._handle_mozbrowsertitlechange({detail: 'Do not update.'});
      assert.equal(subject.title.textContent, fakeAppWithName.name);
    });
  });
});
