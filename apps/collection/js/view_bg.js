'use strict';
/* global eme */

(function(exports) {

  function ViewBgImage(collection) {

    var elements = {
      content: document.getElementById('content')
    };

    var options = collection.categoryId ? {categoryId: collection.categoryId}
                                        : {query: collection.query};

    if (navigator.onLine) {
      onOnline();
    } else {
      addListeners();
    }

    function getBackground() {
      var src;
      var checksum;

      if (collection.background) {
        src = collection.background.src;
        checksum = collection.background.checksum;

        options._checksum = checksum;
      }

      return eme.api.Search.bgimage(options).then(function success(response) {
        if (checksum && checksum === response.checksum) {
          eme.log('background didn\'t change (checksum match)');
          return collection.background;

        } else {
          var image = response.response.image;
          if (image) {
            src = image.data;
            if (/image\//.test(image.MIMEType)) {  // base64 image data
              src = 'data:' + image.MIMEType + ';base64,' + image.data;
            }
          }

          return {
            src: src,
            source: response.response.source,
            checksum: response.checksum || null
          };
        }

      });
    }

    function onOnline() {
      getBackground().then(function setBackground(newBackground) {
        removeListeners();

        // update collection if background changed
        if (collection.background &&
            collection.background.checksum !== newBackground.checksum) {

          collection.background = newBackground;
          collection.save();
        }

        if (collection.background.src) {
          elements.content.style.backgroundImage =
                                      'url(' + collection.background.src + ')';
        }
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
