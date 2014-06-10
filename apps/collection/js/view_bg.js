'use strict';
/* global eme */

(function(exports) {

  function ViewBGImage(requestParams) {

    var elements = {
      content: document.getElementById('content')
    };

    if (navigator.onLine) {
      onOnline();
    } else {
      addListeners();
    }

    function onOnline() {
      eme.api.Search.bgimage(requestParams)
        .then(function success(bgResponse) {
          removeListeners();

          var image = bgResponse.response.image;
          if (image) {
            var src = image.data;
            if (/image\//.test(image.MIMEType)) {  // base64 image data
              src = 'data:' + image.MIMEType + ';base64,' + image.data;
            }

            elements.content.style.backgroundImage = 'url(' + src + ')';
          } else {
            // TODO show default image?
          }
        });
    }

    function addListeners() {
      window.addEventListener('online', onOnline);
    }

    function removeListeners() {
      window.removeEventListener('online', onOnline);
    }
  }

  exports.ViewBGImage = ViewBGImage;

}(window));
