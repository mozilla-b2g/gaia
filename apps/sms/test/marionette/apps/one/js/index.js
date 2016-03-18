(function() {
  'use strict';

  console.log('[Test] Before we set system message handler %s', new Date());

  setTimeout(() => {
    navigator.mozSetMessageHandler('activity', (request) => {
      console.log('[Test] System message handler is called %s', new Date());

      document.querySelector('.status').textContent = 'GOT_SYSTEM_MESSAGE';

      setTimeout(() => {
        console.log('[Test] Post result %s', new Date());
        request.postResult({ success: true });
      }, 10000);
    });
    console.log('[Test] After we set system message handler %s', new Date());
  }, 10000);
})();
