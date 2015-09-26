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
    name: 'finish',
    init: function() {
      var readyEvent = new CustomEvent('panelready', { detail: this });
      window.dispatchEvent(readyEvent);
      // defer most of the initialization to when the panel is shown
    },
    show: function (isUpgrade) {
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
          dom.tutorialFinished.removeEventListener('click', ftuEnd);
          window.close();
        });
      } else {
        // In 'tablet', we have to use IAC to tell system ftu is done
        this.notify('done', 'done');
      }

      initialized = true;
    }
  };

  exports.FinishScreen = FinishScreen;

}(this));
