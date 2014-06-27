'use strict';
/* global eme */

(function(exports) {

  var elements = {
    content: document.getElementById('content-background-image')
  };

  function ViewBgImage(collection) {
    ViewBgImage.drawBackground(collection.background);

    eme.init().then(queueRequest);

    function queueRequest() {
      if (navigator.onLine) {
        onOnline();
      } else {
        addListeners();
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
          ViewBgImage.drawBackground(collection.background);
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
              checksum: response.checksum,
              isFullSize: true
            };

            ViewBgImage.drawBackground(newBackground);

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

  ViewBgImage.drawBackground = function drawBackground(bg) {
    if (elements.content.style.backgroundImage) {
      eme.log('drawBackground', 'already drawn, skipping');
      return;
    }

    // draw stored background if in full size (as opposed to square icon size)
    if (bg && bg.src && bg.isFullSize) {
      elements.content.style.backgroundImage = 'url(' + bg.src + ')';
      // Bug 1029971 - Workaround the disappearing image.
      elements.content.style.backgroundColor = 'transparent';

      eme.log('drawBackground', 'drawn');
    } else {
      eme.log('drawBackground', 'not drawn, failed conditions', bg);
    }
  };

  exports.ViewBgImage = ViewBgImage;

}(window));
