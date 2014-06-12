'use strict';
/* global loadBodyHTML, MockNavigatormozApps, appManager, MockL10n */

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/test/unit/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('app_manager.js > ', function() {

  var realMozApps = null,
      realL10n = null,
      app = {},
      titleElement = null,
      bodyElement = null,
      cancelButton = null,
      confirmButton = null;

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');
    titleElement = document.getElementById('confirmation-message-title');
    bodyElement = document.getElementById('confirmation-message-body');
    cancelButton = document.getElementById('confirmation-message-cancel');
    confirmButton = document.getElementById('confirmation-message-ok');
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    require('/js/app_manager.js', done);
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    MockNavigatormozApps.mTeardown();
    navigator.mozL10n = realL10n;
    realL10n = realMozApps = null;
  });

  test('The library was initialized properly', function() {
    MockNavigatormozApps.mTriggerLastRequestSuccess(app);
    assert.equal(appManager.self, app);
  });

  test('Uninstall app', function(done) {
    var subject = {
      name: 'hi',
      app: {}
    };

    window.dispatchEvent(new CustomEvent('gaiagrid-uninstall-mozapp', {
      'detail': subject
    }));
    
    assert.isTrue(titleElement.textContent.contains('delete-title{"name":"' +
                                                     subject.name + '"'));
    assert.isTrue(bodyElement.textContent.contains('delete-body{"name":"' +
                                                    subject.name + '"'));
    assert.equal(cancelButton.textContent, 'cancel');
    assert.equal(confirmButton.textContent, 'delete');
    assert.isTrue(confirmButton.classList.contains('danger'));

    var stub = sinon.stub(navigator.mozApps.mgmt, 'uninstall', function(app) {
      stub.restore();
      assert.equal(app, subject.app);
      done();
    });
    confirmButton.click();
  });

  test('Cancel download', function(done) {
    var subject = {
      name: 'hi',
      app: {
        cancelDownload: done
      }
    };

    window.dispatchEvent(new CustomEvent('gaiagrid-cancel-download-mozapp', {
      'detail': subject
    }));
    
    assert.isTrue(titleElement.textContent.
          contains('stop-download-title{"name":"' + subject.name + '"'));
    assert.equal(bodyElement.textContent, 'stop-download-body');
    assert.equal(cancelButton.textContent, 'cancel');
    assert.equal(confirmButton.textContent, 'stop-download-action');
    assert.isTrue(confirmButton.classList.contains('danger'));

    confirmButton.click();
  });

  test('Resume download', function(done) {
    var subject = {
      name: 'hi',
      app: {
        download: done
      }
    };

    window.dispatchEvent(new CustomEvent('gaiagrid-resume-download-mozapp', {
      'detail': subject
    }));
    
    assert.equal(titleElement.textContent, 'resume-download-title');
    assert.isTrue(bodyElement.textContent.
          contains('resume-download-body{"name":"' + subject.name + '"'));
    assert.equal(cancelButton.textContent, 'cancel');
    assert.equal(confirmButton.textContent, 'resume-download-action');
    assert.isFalse(confirmButton.classList.contains('danger'));

    confirmButton.click();
  });

});
