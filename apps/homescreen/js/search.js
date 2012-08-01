
'use strict';

const Search = (function() {
  var URI_BROWSER;
  var searchPage = document.querySelector('#search');
  var searchIcon = document.querySelector('#searchAction');

  // It should be an activity to search anything on search engine launching
  // the browser and reading the text from an input in the landing page
  searchIcon.addEventListener('click',
    function launchBrowser(evt) {
      Applications.getByOrigin(URI_BROWSER).launch();
    }
  );

  function onLongPress() {
    var a = new MozActivity({
        name: "pick",
        data: {
          type: "image/jpeg",
          multiple: false
        }
    });
    a.onsuccess = function pickSuccess() {
      var image = a.result;
      // XXX: to do: set the homescreen.wallpaper in mozSettings
    };
    a.onerror = function pickFail() {
      console.warn("Failure when trying to pick an image!");
    };
  }

  searchPage.addEventListener('contextmenu', onLongPress);

  function resetIcon() {
    searchIcon.style.MozTransform = '';
  }

  return {
    /*
     * Initializes the search module
     *
     * @param {String} domain
     */
    init: function s_init(domain) {
      URI_BROWSER = document.location.protocol + '//browser.' + domain;
    },
    resetIcon: resetIcon
  };
}());
