
'use strict';

const Search = (function() {
  var URI_BROWSER;
  var searchIcon = document.querySelector('#searchAction');

  // It should be an activity to search anything on search engine launching
  // the browser and reading the text from an input in the landing page
  searchIcon.addEventListener('click',
    function launchBrowser(evt) {
      Applications.getByOrigin(URI_BROWSER).launch();
    }
  );

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
