'use strict';
/* global eme */

(function(exports) {

  function ViewBgImage(collection) {

    var elements = {
      content: document.getElementById('content')
    };

    // draw stored background
    if (collection.background) {
      drawBackground(collection.background);
    }

    eme.init().then(queueRequest);

    function queueRequest() {
      if (navigator.onLine) {
        onOnline();
      } else {
        addListeners();
      }
    }

    function drawBackground(background) {
      if (elements.content.style.backgroundImage) {
        eme.log('drawBackground', 'skipping, reopen to refresh');
      } else if (background.src) {
        elements.content.style.backgroundImage = 'url(' + background.src + ')';
      }
    }

    function getBackground() {
      var checksum;
      var options = collection.categoryId ? {categoryId: collection.categoryId}
                                          : {query: collection.query};

      if (collection.background) {
        checksum = collection.background.checksum;

        // when we send _checksum server will not return an image if checksum
        // was not updated, so check that we really have a background src
        if (collection.background.src) {
          options._checksum = checksum;
        }
      }

      return eme.api.Search.bgimage(options).then(function success(response) {
        if (checksum && checksum === response.checksum) {
          eme.log('background didn\'t change (checksum match)');
        } else {
          // update background
          var src;
          var image = response.response.image;
          if (image) {
            src = image.data;
            if (/image\//.test(image.MIMEType)) {  // base64 image data
              src = 'data:' + image.MIMEType + ';base64,' + image.data;
            }

            var newBackground = {
              src: src,
              source: response.response.source,
              checksum: response.checksum
            };

            drawBackground(newBackground);

            collection.background = newBackground;
            collection.save();
          }
        }
      });
    }

    function onOnline() {
      getBackground().then(function success() {
        removeListeners();
      }, function error(e) {
        // no background
        eme.error(e);
      });
    }

    function addListeners() {
      window.addEventListener('online', onOnline);
    }

    function removeListeners() {
      window.removeEventListener('online', onOnline);
    }
  }

  exports.ViewBgImage = ViewBgImage;

}(window));
