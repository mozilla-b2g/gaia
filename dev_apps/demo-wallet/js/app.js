/* globals simAccessManager, Timer, AppletListController,
   SettingsView */

window.addEventListener('DOMContentLoaded', function() {
  'use strict';

  if(!window.navigator.seManager) {
    document.querySelector('.error').textContent =
      'SECURE ELEMENT API NOT AVAILABLE';
    return;
  }

  var successfulInit = false;

  var appletListCtrl = new AppletListController(simAccessManager,'applet-ctrl',
                                                'applets-view');
  var showError = function showError(errorMsg) {
    if(successfulInit) {
      appletListCtrl.hideView();
    }
    document.querySelector('#splash').classList.remove('hide');
    document.querySelector('.error').textContent = errorMsg;
  };

  var showWalletView = function showWalletView() {
    document.querySelector('#splash').classList.add('hide');
    appletListCtrl.showView();
  };

  var initApp = function intitApp() {
    simAccessManager.start()
    .then(() => {
      console.log('Init access, getting applets from CRS');
      return appletListCtrl.init();
    })
    .then((time) => {
      console.log('Applet data retrieved from CRS in ' + time + ' ms');
      showWalletView();
      successfulInit = true;
    })
    .catch((error) => {
      console.log('Init promise chain broken. Clean up');
      showError(error);
      simAccessManager.stop();
      successfulInit = false;
    });
  };

  var refresh = function refresh() {
    console.log('Refreshing SIM data');
    appletListCtrl.refreshModelView()
    .then((time) => {
      console.log('CRS data refresh in ' + time + ' ms');
      showWalletView();
    })
    .catch((error) => {
      showError(error);
    });
  };

  document.querySelector('.refresh').addEventListener('click', () => {
    if(successfulInit) {
      refresh();
    } else {
      initApp();
    }
  });

  var settingsView = new SettingsView('settings', simAccessManager.crsAid,
                                      simAccessManager.m4mAid);

  document.querySelector('#settings-edit').addEventListener('click',
    () => settingsView.visible = true);

  settingsView.addListener({ onEvent: (id, data) => {
    if('crsAid' in data) {
      simAccessManager.crsAid = data.crsAid;
    }
  }});

  initApp();
});
