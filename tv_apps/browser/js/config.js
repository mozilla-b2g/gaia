'use strict';

/**
 * The default config object. This will be generated at build time once
 * the customization process is implemented.
 */

(function (exports) {

  var config = {
    'historyCount': 20,
    'topSitesCount': 9,
    'bookmarks': [
      { 'title': 'Mozilla',
        'uri': 'http://mozilla.org',
        'iconUri': ''
      },
      { 'title': 'Firefox OS',
        'uri': 'http://mozilla.org/firefoxos',
        'iconUri': ''
      }
    ],
    'searchEngines': [
      {
        'title': 'Google',
        'uri': 'https://www.google.com/search?q={searchTerms}',
        'iconUri': ''
      },
      {
        'title': 'Yahoo',
        'uri': 'https://search.yahoo.com/search?p={searchTerms}',
        'iconUri': ''
      },
      {
        'title': 'Bing',
        'uri': 'https://www.bing.com/search?q={searchTerms}',
        'iconUri': ''
      }
    ],
    'topSites': [
      {
        'title': 'Mozilla',
        'uri': 'http://mozilla.org',
        'iconPath': 'mozilla.png'
      },
      {
        'title': 'Firefox OS',
        'uri': 'http://mozilla.org/firefoxos',
        'iconPath': 'firefox.png'
      }
    ],
    'settings': {
      'defaultSearchEngine': 'https://www.google.com/search?q={searchTerms}'
    }
  };

  exports.config = config;

})(window);
