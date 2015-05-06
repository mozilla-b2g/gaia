'use strict';
/* global MockNavigatormozApps */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');

require('/shared/js/metrics_helper.js');

suite('metricshelper', function() {
  var realMozApps;
  var subject = null;

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
  });

  setup(function() {
    subject = new window.MetricsHelper();
    subject._portMetrics = { postMessage: function() {} };
  });

  suite('init', function() {
    test('will call metrics init method', function() {
      subject.init();

      MockNavigatormozApps.mTriggerLastRequestSuccess();
      assert.equal(MockNavigatormozApps.mLastConnectionKeyword,
        'app-metrics');
      MockNavigatormozApps.mLastConnectionCallback(['fakePort']);

      assert.ok(subject._initialized);
    });
  });

  suite('report', function() {
    test('will postMessage to system app', function() {
      var stub = this.sinon.stub(subject._portMetrics, 'postMessage');
      subject._initialized = true;
      subject.report('websearch', 'providerTest');

      assert.ok(stub.calledWith({action: 'websearch',
                                 data: 'providerTest'}));
    });
  });
});
