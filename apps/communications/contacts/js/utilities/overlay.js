'use strict';

var utils = this.utils || {};
(function() {
  utils.overlay = {};

  var progressBar = document.querySelector('#progressbar'),
      progressTitle = document.querySelector('#progress-title'),
      spinnerProgress = document.querySelector('#spinner-progress'),
      loading = document.querySelector('#loading-overlay'),
      progressElement = document.querySelector('#progress-element'),
      progressMsg = document.querySelector('#progress-msg');

  utils.overlay.show = function showOverlay(message, isProgress) {
    function ProgressBar() {
      var counter = 0;
      var total = 0;

      progressElement.setAttribute('value', 0);

      showMessage();

      function showMessage() {
        progressMsg.textContent = _('progressSIMImport', {
          current: counter,
          total: total
        });
      }

      this.update = function() {
        progressElement.setAttribute('value', (++counter * 100) / total);
        showMessage();
      };

      this.setTotal = function(ptotal) {
        total = ptotal;
      };
    }

    var out;
    var text = message || _('loadingContacts');

    loading.classList.add('show-overlay');

    if (isProgress) {
      progressBar.classList.remove('hide');
      progressTitle.textContent = message;
      out = new ProgressBar();
    }
    else {
      spinnerProgress.classList.remove('hide');
      loading.querySelector('.loading-header').textContent = text;
    }

    return out;
  };

  utils.overlay.hide = function hideOverlay() {
    loading.classList.remove('show-overlay');
    progressBar.classList.add('hide');
    spinnerProgress.classList.add('hide');
  };
})();
