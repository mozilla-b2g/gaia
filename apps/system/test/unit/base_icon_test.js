/* global BaseIcon, Service, MockL10n, MocksHelper */
'use strict';

require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('system/BaseIcon', function() {
  var subject, manager, realL10n;

  var mocksForBaseIcon = new MocksHelper([
    'Service'
  ]).init();

  mocksForBaseIcon.attachTestHelpers();

  setup(function() {
    this.sinon.stub(Service, 'request', function() {
      var container = document.createElement('div');
      return {
        then: function(callback) {
          callback(container);
        }
      };
    });
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    subject = new BaseIcon(manager);
    subject.shouldDisplay = function() {};
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    subject.stop();
  });

  suite('Service registration', function() {
    test('Should register to service while starting', function() {
      this.sinon.stub(Service, 'register');
      this.sinon.stub(Service, 'registerState');
      subject.start();
      assert.isTrue(Service.register.calledWith('show', subject));
      assert.isTrue(Service.register.calledWith('hide', subject));
      assert.isTrue(Service.register.calledWith('update', subject));
      assert.isTrue(Service.register.calledWith('stop', subject));
      assert.isTrue(Service.registerState.calledWith('isVisible', subject));
    });
  });

  suite('Render', function() {
    setup(function() {
      this.sinon.stub(subject, 'update');
    });

    test('Should get the icon if it is already rendered', function(done) {
      subject.onrender = function() {
        assert.isDefined(subject.element);
        assert.isTrue(subject.element.classList.contains('active'));
        assert.isFalse(subject.isVisible());
        assert.isTrue(subject.update.called);
        done();
      };
      this.sinon.stub(document, 'getElementById').returns(
        document.createElement('div'));
      subject.start();
    });

    test('Should get the icon if it is lazily loaded', function(done) {
      subject.onrender = function() {
        assert.isDefined(subject.element);
        assert.isTrue(subject.element.classList.contains('active'));
        assert.isFalse(subject.isVisible());
        assert.isTrue(subject.update.called);
        done();
      };
      subject.start();
      this.sinon.stub(document, 'getElementById').returns(
        document.createElement('div'));
      window.dispatchEvent(new CustomEvent('statusbariconrendered'));
    });

    test('Should not update after rendering if UPDATE_ON_START is false',
      function(done) {
        subject.UPDATE_ON_START = false;
        subject.onrender = function() {
          assert.isDefined(subject.element);
          assert.isTrue(subject.element.classList.contains('active'));
          assert.isFalse(subject.isVisible());
          assert.isFalse(subject.update.called);
          done();
        };
        subject.start();
        this.sinon.stub(document, 'getElementById').returns(
          document.createElement('div'));
        window.dispatchEvent(new CustomEvent('statusbariconrendered'));
      });
  });

  suite('UPDATE_ON_START', function() {
    setup(function() {
      subject.element = document.createElement('div');
      subject.element.hidden = true;
      this.sinon.stub(subject, 'update');
    });

    test('Should update right away', function() {
      subject.UPDATE_ON_START = true;
      subject.start();
      assert.isTrue(subject.update.called);
    });

    test('Should not update right away if not specified', function() {
      subject.UPDATE_ON_START = false;
      subject.start();
      assert.isFalse(subject.update.called);
    });
  });

  suite('UpdateLabel', function() {
    setup(function() {
      subject.start();
      subject.element = document.createElement('div');
      subject.element.hidden = true;
      this.sinon.spy(MockL10n, 'setAttributes');
    });

    test('Should set l10n id', function() {
      subject.show();
      subject.updateLabel('test');
      assert.equal(MockL10n.getAttributes(subject.element).id,
        'statusbarIconOn-test');
    });

    test('Should set l10n id when active', function() {
      subject.show();
      subject.updateLabel('test', true);
      assert.equal(MockL10n.getAttributes(subject.element).id,
        'statusbarIconOnActive-test');
    });
  });

  suite('Update', function() {
    setup(function() {
      subject.start();
      subject.element = document.createElement('div');
      subject.element.hidden = true;
      this.sinon.stub(subject, 'publish');
    });

    test('Should show icon if shouldDisplay is true', function() {
      this.sinon.stub(subject, 'shouldDisplay').returns(true);
      subject.update();
      assert.isTrue(subject.isVisible());
    });

    test('Should hide icon if shouldDisplay is false', function() {
      this.sinon.stub(subject, 'shouldDisplay').returns(false);
      subject.update();
      assert.isFalse(subject.isVisible());
    });
  });

  suite('Show/Hide', function() {
    setup(function() {
      subject.start();
      subject.element = document.createElement('div');
      subject.element.hidden = true;
      this.sinon.stub(subject, 'publish');
    });

    test('Should dispatch shown when show is called', function() {
      subject.hide();
      subject.show();
      assert.isTrue(subject.publish.calledWith('shown'));
      assert.isTrue(subject.isVisible());
    });

    test('Should dispatch hidden when hide is called', function() {
      subject.show();
      subject.hide();
      assert.isTrue(subject.publish.calledWith('hidden'));
      assert.isFalse(subject.isVisible());
    });
  });
});
