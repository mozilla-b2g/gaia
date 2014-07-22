'use strict';
/* global eme */
/* global Common */

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

    function onOnline() {
      Common.getBackground(collection).then(function success(background) {
        // XXX better to drop the isFullSize flag
        // a better approach would be not to store non-fullsize backgrounds
        background.isFullSize = true;

        ViewBgImage.drawBackground(background);

        if (!collection.background ||
             collection.background.checksum !== background.checksum) {

          collection.background = background;
          collection.save();
        }

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
    if (bg && bg.blob && bg.isFullSize) {
      var url = URL.createObjectURL(bg.blob);
      elements.content.style.backgroundImage = 'url(' + url + ')';
      eme.log('drawBackground', 'drawn', url);

    } else {
      eme.log('drawBackground', 'not drawn, failed conditions', bg);
    }
  };

  exports.ViewBgImage = ViewBgImage;

}(window));
