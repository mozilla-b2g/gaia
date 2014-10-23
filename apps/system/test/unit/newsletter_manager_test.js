/* global MockDatastore, MockNavigatorDatastore, MockFtuLauncher,
          MockBasket, MockL10n, MocksHelper,
          NewsletterManager, idleObserver */

'use strict';

require('/shared/test/unit/mocks/mock_basket_client.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_ftu_launcher.js');

var mocksHelperForNewsletterManager = new MocksHelper([
  'FtuLauncher',
  'Datastore',
  'LazyLoader',
  'Basket'
]).init();

suite('Newsletter Manager >', function() {
  var realL10n, mockOnce,
      realOnLine,
      realDatastores;

  mocksHelperForNewsletterManager.attachTestHelpers();

  suiteSetup(function(done) {
    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      fakeOnLine: false,
      configurable: true,
      get: function() { return this.fakeOnLine; },
      set: function(status) { this.fakeOnLine = status; }
    });

    realL10n = navigator.mozL10n;
    mockOnce = MockL10n.once;
    navigator.mozL10n = MockL10n;
    navigator.mozL10n.once = function(callback) {
      callback();
    };

    realDatastores = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;

    navigator.addIdleObserver = sinon.spy();
    navigator.removeIdleObserver = sinon.spy();

    MockBasket._dataStore= MockDatastore;

    requireApp('system/js/newsletter_manager.js', done);
  });

  suiteTeardown(function() {
    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
    MockL10n.once = mockOnce;
    navigator.mozL10n = realL10n;
    navigator.getDataStores = realDatastores;
  });

  test('Added a idle observer >', function() {
    assert.isTrue(navigator.addIdleObserver.called);
  });

  suite('FTU is running >', function() {
    setup(function() {
      this.sinon.spy(NewsletterManager, 'start');
      MockFtuLauncher.mIsRunning = true;
      idleObserver.onidle();
    });

    test('Do nothing', function() {
      sinon.assert.notCalled(navigator.removeIdleObserver);
      sinon.assert.notCalled(NewsletterManager.start);
    });
  });

  suite('FTU not running >', function() {
    setup(function() {
      this.sinon.spy(NewsletterManager, 'start');
      MockFtuLauncher.mIsRunning = false;
      idleObserver.onidle();
    });

    test('Removed the idle observer when FTU is not running >', function() {
      assert.isTrue(navigator.removeIdleObserver.called);
    });

    test('Start the manager when FTU is not running >', function() {
      assert.isTrue(NewsletterManager.start.called);
    });
  });

  suite('DataStore accessed >', function() {
    var onlineListener;
    var email = {
      'newsletter_email': 'email@ser.er'
    };

    setup(function() {
      this.sinon.spy(MockDatastore, 'get');
      this.sinon.spy(NewsletterManager, 'sendNewsletter');
      onlineListener = this.sinon.stub(window, 'addEventListener');
    });

    teardown(function() {
      MockDatastore.clear();
    });

    test('Recovered email >', function(done) {
      MockDatastore.add({
        'emailSent': true
      }, 1).then(NewsletterManager.start).then(function() {
          sinon.assert.calledWith(MockDatastore.get, 1);
          done();
      }, done);
    });

    test('Do not send if email already sent >', function(done) {
      MockDatastore.add({
        'emailSent': true
      }, 1).then(NewsletterManager.start).then(function() {
          sinon.assert.notCalled(NewsletterManager.sendNewsletter);
          done();
      }, done);
    });

    test('Send it if online >', function(done) {
      navigator.onLine = true;
      MockDatastore.add(email, 1).then(NewsletterManager.start).then(
        function() {
          sinon.assert.calledWith(NewsletterManager.sendNewsletter,
                                email.newsletter_email);
          done();
      }, done);
    });

    test('Wait for connection if offline >', function(done) {
      navigator.onLine = false;
      MockDatastore.add(email, 1).then(NewsletterManager.start).then(
        function() {
          sinon.assert.notCalled(NewsletterManager.sendNewsletter);
          sinon.assert.called(window.addEventListener, 'online');
          done();
      }, done);
    });

    test('Online change triggers listener >', function(done) {
      navigator.onLine = false;
      onlineListener.yields();
      MockDatastore.add(email, 1).then(NewsletterManager.start).then(
        function() {
          sinon.assert.called(NewsletterManager.sendNewsletter);
          done();
      }, done);
    });

    suite('Sending the info >', function() {
      var updatedEmail = {
        'emailSent': true
      };

      setup(function() {
        sinon.spy(MockDatastore, 'put');
      });

      test('Datastore updated when email sent >', function(done) {
        NewsletterManager.sendNewsletter(email).then(function() {
          sinon.assert.calledWith(MockDatastore.put, updatedEmail);
          done();
        });
      });
    });
  });

});
