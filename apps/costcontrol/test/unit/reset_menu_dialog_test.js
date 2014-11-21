'use strict';

require('/test/unit/mock_settings.js');
require('/test/unit/mock_common.js');
require('/test/unit/mock_moz_l10n.js');
require('/js/utils/formatting.js');
require('/js/utils/toolkit.js');
require('/js/views/ConfirmDialog.js');
require('/js/views/ResetMenuDialog.js');
require('/js/view_manager.js');

/* global ResetMenuDialog, ConfirmDialog, ViewManager, ConfirmDialog, Common,
          MocksHelper, MockCommon, MockSettings, Formatting
*/

var realMozL10n;

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

var MocksHelperForUnitTest = new MocksHelper([
  'Common',
  'Settings'
]).init();

suite('Reset Menu Dialog Test Suite >', function() {

  MocksHelperForUnitTest.attachTestHelpers();

  var confirmDialog, vManager, resetMenuDialog;
  var container, menuContainer, header, message, confirmContainer, dataUsage;

  suiteSetup(function() {
    window.Common = new MockCommon();
    window.Settings = new MockSettings();

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;
  });

  setup(function() {

    vManager = new ViewManager();
    initConfirmContainer();
    initResetMenuContainer();

    dataUsage = {
      wifi: 123435435,
      mobile: 323423
    };

    confirmDialog = new ConfirmDialog(confirmContainer, vManager);
    resetMenuDialog = new ResetMenuDialog(container, vManager);
  });

  function initConfirmContainer() {
      var cancelButton = document.createElement('button');
      var okButton = document.createElement('button');
      confirmContainer = document.createElement('div');
      cancelButton.classList.add('close-reset-dialog');
      okButton.classList.add('danger');
      confirmContainer.appendChild(cancelButton);
      confirmContainer.appendChild(okButton);

      message = document.createElement('p');
      header = document.createElement('h1');
      confirmContainer.appendChild(header);
      confirmContainer.appendChild(message);
      confirmContainer.id = 'confirmReset';
  }

  function initResetMenuContainer() {
    var cancelButton = document.createElement('button');
    cancelButton.classList.add('close-reset-dialog');
    container = document.createElement('div');
    menuContainer = document.createElement('menu');

    menuContainer.appendChild(cancelButton);
    container.appendChild(menuContainer);
    container.id = 'resetMenu';
  }

  test('initializeResetModes() creates the reset buttons', function() {
    resetMenuDialog.initializeResetModes(confirmDialog);
    // Checking if exists a button for each reset Mode
    resetMenuDialog.resetModes.forEach(function(resetMode) {
      assert.isNotNull(
        container.querySelector('#reset-' + resetMode + '-data-usage'));
    });
  });

  test('closeConfirmDialog() closes view', function() {
    this.sinon.spy(vManager, 'closeCurrentView');
    resetMenuDialog.closeResetMenuDialog();
    sinon.assert.calledOnce(vManager.closeCurrentView);
  });

  test('showResetMenuDialog() changes the view', function() {
    this.sinon.stub(vManager, 'changeViewTo', function() {});
    resetMenuDialog.showResetMenuDialog();
    sinon.assert.calledWith(vManager.changeViewTo, container.id);
  });

  test('showResetMenuDialog() parameter is used to update the confirm message',
    function() {
      var resetMode = resetMenuDialog.resetModes[0];
      this.sinon.spy(confirmDialog, 'setMessage');
      this.sinon.stub(vManager, 'changeViewTo', function() {});
      resetMenuDialog.initializeResetModes(confirmDialog);
      resetMenuDialog.showResetMenuDialog(dataUsage);
      // Calling updateConfirm method to check the dataUsage parameter is
      // used by the view
      resetMenuDialog.updateConfirmDialog(resetMode, confirmDialog);

      // Checking the message is updated correctly
      var l10nId = 'reset-' + resetMode + '-confirmation-warning';
      var mobileUsage =
        Formatting.formatData(Formatting.roundData(dataUsage.mobile));
      var wifiUsage =
        Formatting.formatData(Formatting.roundData(dataUsage.wifi));
      var expectedData = {
        mobileData: mobileUsage,
        wifiData: wifiUsage
      };
      sinon.assert.calledWith(confirmDialog.setMessage, l10nId, expectedData);
  });

  test(
    'updateConfirmDialog() configure the Confirm dialog correctly for each' +
      ' reset service',
    function() {
      this.sinon.stub(confirmDialog, 'setMessage', function() {});
      this.sinon.stub(confirmDialog, 'showConfirmDialog',
        function() {
          resetMenuDialog.dataUsage = dataUsage;
        });
      this.sinon.stub(Common, 'resetData', function() {});

      resetMenuDialog.initializeResetModes(confirmDialog);
      // Checking if the message dialog is updated correctly
      resetMenuDialog.resetModes.forEach(function(resetMode) {
        var resetButton =
          container.querySelector('#reset-' + resetMode + '-data-usage');
        resetButton.click();

        // Checking the message is updated correctly
        var l10nId = 'reset-' + resetMode + '-confirmation-warning';
        sinon.assert.calledWith(confirmDialog.setMessage, l10nId);

        // Checking if we are resetting the correct service.
        var confirmButton = confirmContainer.querySelector('.danger');
        confirmButton.click();

        sinon.assert.calledWith(Common.resetData, resetMode);
      });
    }
  );
});
