/* global FTEWizard */
(function (exports) {
'use strict';

window.addEventListener('load', function() {
  var offlineContent = document.querySelector('#offline-content');
  var mozIframe = document.querySelector('#moz-iframe[mozbrowser]');

  if (navigator.onLine) {
    mozIframe.classList.remove('hidden');

    mozIframe.addEventListener('mozbrowserloadend', () => {
      mozIframe.focus();
    });

    // The call of window.close by content inside iframe(even with mozbrowser)
    // is not allowed and does't not trigger the mozbrowserclose event.
    // As a result, we use the mozbrowserlocationchange event to observe
    // when user finishes the tutorial.
    mozIframe.addEventListener('mozbrowserlocationchange', (e) => {
      if (e.detail === mozIframe.src + '#finished') {
        window.close();
      }
    });

    // The mozbrowserclose event would be trrigered when content inside iframe
    // is crashed. When crashed, let's just leave this app.
    mozIframe.addEventListener('mozbrowserclose', () => {
      window.close();
    });

    mozIframe.src = 'https://casttv.services.mozilla.com';
  } else {

    offlineContent.classList.remove('hidden');

    var tutorial = new FTEWizard('flingTutorial');
    tutorial.init({
      container: offlineContent,
      pageClass: 'slide',
      buttonsClass: 'slide-button',
      launchEveryTime: true,
      onfinish: function () {
        window.close();
      }.bind(tutorial)
    });
  }
});

})(window);
