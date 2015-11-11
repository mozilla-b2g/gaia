(function (exports) {
'use strict';

window.addEventListener('load', function() {
  var src = !navigator.onLine ?
            'offline_content/index.html' :
            'https://casttv.services.mozilla.com';

  var mozIframe = document.querySelector('#mozIframe[mozbrowser]');
  mozIframe.src = src;

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
});

})(window);
