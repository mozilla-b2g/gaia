(function(window) {
  'use strict';

  window.navigator.mozSetMessageHandler('activity', function(activity) {
    var closeActivityButton = document.getElementById('close-activity');

    closeActivityButton.addEventListener('click', function() {
      activity.postResult({
        type: 'x-type/blob',
        blob: new Blob()
      });
    });
  });
})(window);
