/* exported FinishScreen */
/* global ScreenLayout, Utils */
(function(exports) {
  'use strict';
  // Defaut layout is 'tiny', the one for mobile device
  var currentLayout = 'tiny';

  var elementIDs = [
    'tutorialFinished',
    'enjoyYourPhone',
    'enjoyYourPhoneUpdated'
  ];

  var dom = {};

  var initialized = false;

  var FinishScreen = {
    init: function (isUpgrade) {
      if (initialized) {
        return;
      }

      // We consider only 'tablet' & 'mobile' (tiny)
      if (ScreenLayout.getCurrentLayout() !== 'tiny') {
        currentLayout = 'large';
      }
      // Get panel selector based on layout
      var panelSelector = 'tutorial-finish-' +  currentLayout;

      // Show finish panel
      var finishPanel = document.getElementById(panelSelector);
      finishPanel.classList.add('show');
      
      // Cache non-layout-related DOM elements
      elementIDs.forEach(function (name) {
        dom[Utils.camelCase(name)] = document.getElementById(name);
      }, this);

      if (isUpgrade) {
        dom.enjoyYourPhone.hidden = true;
        dom.enjoyYourPhoneUpdated.hidden = false;
      }

      // Add regular listener if needed
      if (currentLayout === 'tiny') {
        dom.tutorialFinished.addEventListener('click', function ftuEnd() {
          window.close();
        });
      } else {
        // In 'tablet', we have to use IAC to tell system ftu is done
        navigator.mozApps.getSelf().onsuccess = function(evt) {
          var app = evt.target.result;
          app.connect('ftucomms').then(function onConnAccepted(ports) {
            ports.forEach(function(port) {
              port.postMessage('done');
            });
          }, function onConnRejected(reason) {
            console.warn('FTU is rejected due to ' + reason);
          });
        };
      }

      initialized = true;
    }
  };

  exports.FinishScreen = FinishScreen;

}(this));
