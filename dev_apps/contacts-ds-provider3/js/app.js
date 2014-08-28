/* global DAVLib */

'use strict';

var App = function App() {

  var store = null;
  var info = null;
  var fillButton, resetButton;

  var DS_NAME = 'contacts';

  var init = function init() {
    info = document.getElementById('info');
    fillButton = document.getElementById('fillDS');
    resetButton = document.getElementById('resetDS');

    fillButton.addEventListener('click', handleEvent);
    resetButton.addEventListener('click', handleEvent);

    initDS();
  };

  function handleEvent(evt) {
    var btn = evt.target.id;
    var accountData = {
      url: document.getElementById('url').value,
      user: document.getElementById('user').value,
      password: document.getElementById('passwd').value
    };

    switch (btn) {
      case 'fillDS':
      fillButton.disabled = true;
      DAVLib.initLogin(store, accountData, function() {
        DAVLib.importContacts(function() {
          fillButton.disabled = false;
          store.getLength().then(function(count) {
            info.textContent = count + ' elements';
          });
        });
      });
      break;
      case 'resetDS':
      store.clear().then(function() {
        store.getLength().then(function(count) {
          info.textContent = count + ' elements';
        });
      });
      break;
      default:
      break;
    }
  }

  function initDS() {
    function storeError() {
      info.textContent = 'Error getting store';
    }

    if (!navigator.getDataStores) {
      info.textContent = 'NO DataStore API!';
      return;
    }

    navigator.getDataStores(DS_NAME).then(function(ds) {
      if (!ds || ds.length < 1) {
        storeError();
        return;
      }
      ds.forEach(function onDs(datastore) {
        if (datastore.owner.indexOf('provider3')) {
          store = datastore;
          console.log('Got store ' + store.owner);
        }
      });

      store.getLength().then(function(count) {
        info.textContent = count + ' elements';
      });
    }, function() {
      storeError();
    });
  }

  return {
    init: init
  };

}();

App.init();