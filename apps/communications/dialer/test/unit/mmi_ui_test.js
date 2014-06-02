/* globals MocksHelper, MmiUI */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');

var mocksHelperForMmiUI = new MocksHelper([
  'LazyL10n'
]).init();

suite('dialer/mmi UI', function() {

  mocksHelperForMmiUI.attachTestHelpers();

  suiteSetup(function(done) {
    loadBodyHTML('/dialer/index.html');
    requireApp('communications/dialer/js/mmi_ui.js', done);
  });

  suite('MMI sending success >', function() {
    var data;

    setup(function() {
      data = {
        type: 'mmi-success',
        result: 'success',
        title: 'Success Title'
      };

      this.sinon.spy(MmiUI, 'hideResponseForm');
      this.sinon.spy(MmiUI, 'showMessage');
      this.sinon.spy(MmiUI, 'showWindow');

      window.postMessage(data, MmiUI.COMMS_APP_ORIGIN);
    });

    test('UI is modified properly', function(done) {
      window.addEventListener('message', function(evt) {
        // Bug 874510 - Update mocha
        // Mocha uses message event so we're filtering them out
        if (evt.data.type != 'mmi-success') {
          return;
        }
        // Response form is hidden
        assert.isTrue(MmiUI.hideResponseForm.calledOnce);
        assert.isTrue(MmiUI.sendNode.classList.contains('hide'));
        assert.isFalse(MmiUI.mmiScreen.classList.contains('responseForm'));

        // Message is shown
        assert.isTrue(MmiUI.showMessage.calledOnce);
        assert.isTrue(MmiUI.showWindow.calledOnce);
        assert.isFalse(MmiUI.mmiScreen.hidden);
        // Header is set with title
        assert.equal(MmiUI.headerTitleNode.textContent, data.title);
        // Message is correct
        assert.equal(MmiUI.messageNode.textContent, data.result);

        done();
      });
    });
  });

  suite('MMI error >', function() {
    var data;

    setup(function() {
      data = {
        type: 'mmi-error',
        result: 'error',
        title: 'Error Title',
        error: 'Error Type'
      };

      this.sinon.spy(MmiUI, 'hideResponseForm');
      this.sinon.spy(MmiUI, 'showMessage');
      this.sinon.spy(MmiUI, 'showWindow');
      this.sinon.spy(MmiUI, 'handleError');

      window.postMessage(data, MmiUI.COMMS_APP_ORIGIN);
    });

    test('UI is modified properly', function(done) {
      window.addEventListener('message', function(evt) {
        // Bug 874510 - Update mocha
        // Mocha uses message event so we're filtering them out
        if (evt.data.type != 'mmi-error') {
          return;
        }
        // Error handled
        assert.isTrue(MmiUI.handleError.calledOnce);
        // Response form is hidden
        assert.isTrue(MmiUI.hideResponseForm.calledOnce);
        assert.isTrue(MmiUI.sendNode.classList.contains('hide'));
        assert.isFalse(MmiUI.mmiScreen.classList.contains('responseForm'));

        // Message is shown
        assert.isTrue(MmiUI.showMessage.calledOnce);
        assert.isTrue(MmiUI.showWindow.calledOnce);
        assert.isFalse(MmiUI.mmiScreen.hidden);
        // Header is set with title
        assert.equal(MmiUI.headerTitleNode.textContent, data.title);
        // Message is correct
        assert.equal(MmiUI.messageNode.textContent, data.error);

        done();
      });
    });
  });

  suite('MMI received >', function() {
    var data;

    setup(function() {
      data = {
        type: 'mmi-received-ui',
        message: 'received ui',
        title: 'Received UI Title'
      };

      this.sinon.spy(MmiUI, 'hideResponseForm');
      this.sinon.spy(MmiUI, 'showResponseForm');
      this.sinon.spy(MmiUI, 'showMessage');
      this.sinon.spy(MmiUI, 'showWindow');

      window.postMessage(data, MmiUI.COMMS_APP_ORIGIN);
    });

    test('UI is modified properly ', function(done) {
      window.addEventListener('message', function(evt) {
        // Bug 874510 - Update mocha
        // Mocha uses message event so we're filtering them out
        if (evt.data.type != 'mmi-received-ui') {
          return;
        }
        // Response form is shown
        assert.isTrue(MmiUI.showResponseForm.calledOnce);
        assert.isFalse(MmiUI.sendNode.classList.contains('hide'));
        assert.isTrue(MmiUI.mmiScreen.classList.contains('responseForm'));

        // Message is shown
        assert.isTrue(MmiUI.showMessage.calledOnce);
        assert.isTrue(MmiUI.showWindow.calledOnce);
        assert.isFalse(MmiUI.mmiScreen.hidden);
        // Header is set with title
        assert.equal(MmiUI.headerTitleNode.textContent, data.title);
        // Message is correct
        assert.equal(MmiUI.messageNode.textContent, data.message);

        done();
      });
    });

    // Test commented till we find another way of testing postMessage
    // due to bug 874510, we can only test one type of message per suite
    // If we have to tests litening for the same data.type, they
    // interfere with each other.
    // test('UI is modified properly (session expired)', function(done) {
    //   data.sessionEnded = true;
    //   window.postMessage(data, MmiUI.COMMS_APP_ORIGIN);

    //   window.addEventListener('message', function(evt) {
    //     // Bug 874510 - Update mocha
    //     // Mocha uses message event so we're filtering them out
    //     if (evt.data.type != 'mmi-received-ui') {
    //       return;
    //     }
    //     // Response form is hidden
    //     assert.isTrue(MmiUI.hideResponseForm.calledOnce);
    //     assert.isTrue(MmiUI.sendNode.classList.contains('hide'));
    //     assert.isFalse(MmiUI.mmiScreen.classList.contains('responseForm'));

    //     // Message is shown
    //     assert.isTrue(MmiUI.showMessage.calledOnce);
    //     assert.isTrue(MmiUI.showWindow.calledOnce);
    //     assert.isFalse(MmiUI.mmiScreen.hidden);
    //     // Header is set with title
    //     assert.equal(MmiUI.headerTitleNode.textContent, data.title);
    //     // Message is correct
    //     assert.equal(MmiUI.messageNode.textContent, data.message);

    //     done();
    //   });
    // });
  });

  suite('MMI loading >', function() {
    var data;

    setup(function() {
      data = {
        type: 'mmi-loading'
      };

      window.postMessage(data, MmiUI.COMMS_APP_ORIGIN);
    });

    test('UI is modified properly', function(done) {
      window.addEventListener('message', function(evt) {
        // Bug 874510 - Update mocha
        // Mocha uses message event so we're filtering them out
        if (evt.data.type != 'mmi-loading') {
          return;
        }

        // Show loading panel
        assert.isFalse(MmiUI.loadingOverlay.classList.contains('hide'));
        // Response disabled
        assert.isTrue(MmiUI.responseTextNode.disabled);
        // Reply disabled
        assert.isTrue(MmiUI.sendNode.disabled);

        done();
      });
    });
  });
});
