'use strict';
/* global Applications, MockAppsMgmt, MockApp, MockL10n*/

requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/js/applications.js');

suite('applications test', function() {
  var realMozApps, testApplications, realL10n;

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = { mgmt: MockAppsMgmt };

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    /**
     * Since the script still initialize itself, we should not allow
     * the "global" instance from being responsive in our tests here.
     */
    if (window.applications) {
      window.applications.stop();
      window.applications = null;
    }
    window.sessionStorage.removeItem('webapps-registry-ready');
    testApplications = new Applications();
  });

  teardown(function() {
    testApplications.stop();
  });

  suite('init tests', function() {
    var clock;
    setup(function() {
      clock = this.sinon.useFakeTimers();
    });

    teardown(function() {
      clock.restore();
    });
    
    test('webapps-registry-ready is "no" applications.ready should be false',
                                                                    function() {
      testApplications.start();
      clock.tick(1);
      assert.isFalse(testApplications.ready);
    });

    test('webapps-registry-ready is "yes" applications.ready should be ture',
                                                                    function() {
      window.sessionStorage.setItem('webapps-registry-ready', 'yes');
      testApplications.start();
      clock.tick(1);
      assert.isTrue(testApplications.ready);
    });

    test('fire "mozChromeEvent" to let applications.ready be true',
                                                                    function() {
      testApplications.start();
      var evt = new CustomEvent('mozChromeEvent',
                               { detail: { type: 'webapps-registry-ready' } });
      window.dispatchEvent(evt);
      clock.tick(1);
      assert.isTrue(testApplications.ready);
    });
  });

  suite('getByManifestURL tests', function() {
    var app;

    setup(function() {
      app = new MockApp({
                manifestURL:'https://testapp.aaa.org/manifest.webapp'});
    });

    teardown(function() {
      app = null;
    });

    test('Should not be found App.', function() {
      var testApp = testApplications.getByManifestURL(app.manifestURL);
      assert.equal(testApp, null);
    });

    test('Should be found App.', function() {
      testApplications.installedApps[app.manifestURL] = app;
      var testApp = testApplications.getByManifestURL(app.manifestURL);
      assert.equal(testApp.manifestURL, app.manifestURL);
    });

  });

  suite('fireEvent tests', function() {
    var called;

    setup(function() {
      called = false;
    });

    teardown(function() {
      called = false;
    });

    test('Trigger oninstall', function() {
      window.addEventListener('applicationinstall', function mozAppTest() {
        window.removeEventListener('applicationinstall', mozAppTest);
        called = true;
      });
      testApplications.start();
      navigator.mozApps.mgmt.mTriggerOninstall(new MockApp());
      assert.isTrue(called);
    });

    test('Trigger onuninstall', function() {
      window.addEventListener('applicationuninstall', function mozAppTest() {
        window.removeEventListener('applicationuninstall', mozAppTest);
        called = true;
      });
      testApplications.start();
      navigator.mozApps.mgmt.mTriggerOnuninstall(new MockApp());
      assert.isTrue(called);
    });

    test('Trigger fireApplicationReadyEvent', function() {
      window.addEventListener('applicationready', function mozAppTest() {
        window.removeEventListener('applicationready', mozAppTest);
        called = true;
      });
      testApplications.fireApplicationReadyEvent();
      assert.isTrue(called);
    });

    test('Trigger fireApplicationInstallEvent', function() {
      window.addEventListener('applicationinstall', function mozAppTest() {
        window.removeEventListener('applicationinstall', mozAppTest);
        called = true;
      });
      testApplications.fireApplicationInstallEvent(new MockApp());
      assert.isTrue(called);
    });

    test('Trigger fireApplicationUninstallEvent', function() {
      window.addEventListener('applicationuninstall', function mozAppTest() {
        window.removeEventListener('applicationuninstall', mozAppTest);
        called = true;
      });
      testApplications.fireApplicationUninstallEvent(new MockApp());
      assert.isTrue(called);
    });

  });

});
