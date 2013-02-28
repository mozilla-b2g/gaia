'use strict';

var utils = this.utils || {};
(function() {
  utils.overlay = {};

  var overlay = document.querySelector('#loading-overlay'),
      statusContainer = overlay.querySelector('p[role="status"]'),
      progressActivity = document.querySelector('#progress-activity'),
      progressTitle = document.querySelector('#progress-title'),
      progressElement = document.querySelector('#progress-element'),
      progressMsg = document.querySelector('#progress-msg');

  utils.overlay.show = function showOverlay(message, progressClass, textId) {
    // Constructor for the progress element
    function ProgressBar(pMsgId, pClass) {
      var counter = 0;
      var total = 0;
      var progressTextId = pMsgId || 'genericProgress';
      var clazz = pClass;

      progressElement.setAttribute('value', 0);

      function showMessage() {
        progressMsg.textContent = _(progressTextId, {
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

      this.setClass = function(clazzName) {
        setClass(clazzName);
        clazz = clazzName;
        // To refresh the message according to the new clazzName
        if (clazzName === 'activityBar' || clazzName === 'spinner') {
          progressMsg.textContent = null;
        }
      };

      this.setHeaderMsg = function(headerMsg) {
        progressTitle.textContent = headerMsg;
      };
    } // ProgressBar

    var out;

    overlay.classList.remove('hide');
    overlay.classList.remove('fadeOut');
    overlay.classList.add('fadeIn');
    progressActivity.classList.remove('hide');
    progressTitle.textContent = message;

    progressMsg.textContent = null;

    // In the case of an spinner this object will not be really used
    out = new ProgressBar(textId, progressClass);

    setClass(progressClass);

    return out;
  };

  function setAsProgress() {
    statusContainer.classList.remove('loading-icon');
    progressElement.setAttribute('max', '100');
    progressElement.setAttribute('value', '0');
  }

  function setClass(clazzName) {
    switch (clazzName) {
      case 'spinner':
        progressElement.classList.remove('pack-activity');
        statusContainer.classList.add('loading-icon');
        progressElement.removeAttribute('max');
        progressElement.removeAttribute('value');
      break;
      case 'activityBar':
      case 'progressActivity':
        progressElement.classList.add('pack-activity');
        setAsProgress();
      break;
      case 'progressBar':
        progressElement.classList.remove('pack-activity');
         setAsProgress();
      break;
    }
  }

  utils.overlay.hide = function hideOverlay() {
    overlay.classList.remove('fadeIn');
    overlay.classList.add('fadeOut');
    overlay.addEventListener('animationend', function onFadeOut(ev) {
      overlay.removeEventListener('animationend', onFadeOut);
      progressActivity.classList.add('hide');
      overlay.classList.add('hide');
    });
  };
})();
