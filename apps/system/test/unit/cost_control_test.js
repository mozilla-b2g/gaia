'use strict';
/* global CostControl */
/* global MockApplications */
/* global MocksHelper */

requireApp('system/test/unit/mock_applications.js');

var mocksForCostControl = new MocksHelper([
  'Applications'
]).init();

suite('system/CostControl', function() {
  mocksForCostControl.attachTestHelpers();
  var stubById;
  var realApplications;
  var fakeElement;
  var subject;

  var fakeAppConfig = {
    'isActivity': false,
    'url': 'app://costcontrol.gaiamobile.org/index.html',
    'name': 'CostControl',
    'manifestURL': 'app://costcontrol.gaiamobile.org/manifest.webapp',
    'origin': 'app://costcontrol.gaiamobile.org',
    'manifest': {
      'name': 'CostControl'
    },
    target: {}
  };

  setup(function(done) {
    if (!('setVisible' in HTMLIFrameElement.prototype)) {
      HTMLIFrameElement.prototype.setVisible = function stub() {};
    }

    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));

    MockApplications.mRegisterMockApp(fakeAppConfig);
    realApplications = window.applications;
    window.applications = MockApplications;
    window.applications.ready = true;

    requireApp('system/js/cost_control.js', function() {
      subject = new CostControl();
      subject.start();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
    window.applications = realApplications;
  });

  suite('network activity threshold', function() {
    test('updates widget frame hash', function() {
      var setVisibleSpy = this.sinon.spy(HTMLIFrameElement.prototype,
        'setVisible');

      // Dispatch a utilitytrayshow to show the widget.
      window.dispatchEvent(new CustomEvent('utilitytrayshow'));

      // If we don't have activity the hash should not update.
      var oldFrameSrc = subject.widgetFrame.src;
      window.dispatchEvent(new CustomEvent('moznetworkupload'));
      assert.equal(oldFrameSrc, subject.widgetFrame.src);

      subject.activityCounter = 74;
      window.dispatchEvent(new CustomEvent('moznetworkupload'));
      assert.notEqual(oldFrameSrc, subject.widgetFrame.src);

      assert.ok(setVisibleSpy.calledOnce);
    });
  });

});
