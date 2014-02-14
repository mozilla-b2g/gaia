/* global eme, Provider, Search */

(function() {

  'use strict';

  function formatImage(image) {
    if (!image || typeof image !== 'object') {
      return image;
    }

    if (image.MIMEType === 'image/url') {
      return image.data;
    }

    if (!image.MIMEType || image.data.length < 10) {
      return null;
    }

    return 'data:' + image.MIMEType + ';base64,' + image.data;
  }

  function BGImage(eme) {}

  BGImage.prototype = {

    __proto__: Provider.prototype,

    name: 'BGImage',

    container: document.createElement('div'),

    init: function() {
      eme.init();
    },

    /**
     * This provider does not implement a typical search
     * It only searches in the expaned view, so just clear.
     */
    search: function() {
      this.clear();
    },

    clear: function() {
      document.body.classList.remove('bgimage');
      document.body.style.backgroundImage = '';
    },

    fetchImage: function(input) {
      this.clear();
      if (!eme.api.Search) {
        return;
      }

      this.request = eme.api.Search.bgimage({
        'query': input
      });

      this.request.then((function resolve(data) {
        var response = data.response;
        document.body.classList.add('bgimage');
        document.body.style.backgroundImage = 'url(' +
          formatImage(response.image) + ')';
      }).bind(this), function reject(reason) {
        // error case
      });
    }

  };

  Search.provider(new BGImage(window.eme));

}());
