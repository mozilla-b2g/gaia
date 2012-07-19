
'use strict';

const Search = (function() {
  var URI_BROWSER;
  var searchPage = document.querySelector('#search');
  var _ = navigator.mozL10n.get;
  var options = [
    {
      label: _('camera photos'),
      value: 'gallery'
    },
    {
      label: _('wallpapers'),
      value: 'wallpapers'
    },
    {
      label: _('cancel'),
      value: 'cancel'
    }
  ];

  // It should be an activity to search anything on search engine launching
  // the browser and reading the text from an input in the landing page
  document.querySelector('#searchAction').addEventListener('click',
    function launchBrowser(evt) {
      Applications.getByOrigin(URI_BROWSER).launch();
    }
  );

  function onLongPress() {
    var a = new Activity({
        name: "pick",
        data: {
          type: "image/png",
          multiple: false
        }
    });
    a.onsuccess = function pickSuccess() {
      var image = a.result;
    };
    a.onerror = function pickFail() {
      console.warn("Failure when trying to pick an image!");
    };
  }

  searchPage.addEventListener('contextmenu', onLongPress);

  return {
    /*
     * Initializes the search module
     *
     * @param {String} domain
     */
    init: function s_init(domain) {
      URI_BROWSER = document.location.protocol + '//browser.' + domain;
    }
  };
}());
