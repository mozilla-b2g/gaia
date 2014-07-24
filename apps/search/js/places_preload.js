(function() {

  'use strict';

  // Add prepoulated history and top sites
  // Will be replaced by configuration mechanism in
  // https://bugzilla.mozilla.org/show_bug.cgi?id=997829
  var defaultHistory = [
    {url: 'http://www.nytimes.com', visited: 1, frecency: -1,
     title: 'The New York Times - Breaking News, World News & Multimedia',
     icons: {'/style/preloaded/favicons/1_NYTimes.png': {}}},
    {url: 'http://www.behance.net', visited: 1, frecency: -1,
     title: 'Online Portfolios on Behance',
     icons: {'/style/preloaded/favicons/2_Behance.png': {}}},
    {url: 'http://gizmodo.com', visited: 1, frecency: -1,
     title: 'Gizmodo - Tech By Design',
     icons: {'/style/preloaded/favicons/3_Gizmodo.png': {}}},
    {url: 'http://www.vogue.com', visited: 1, frecency: -1,
     title: 'Fashion Magazine - Latest News, Catwalk Photos & Designers',
     icons: {'/style/preloaded/favicons/4_Vouge.png': {}}}
  ];

  var defaultTopSites = [
    {url: 'http://mozilla.org',
     title: 'Home of the Mozilla Project — Mozilla',
     screenshot: '/style/preloaded/screenshots/1_Mozilla.jpg'},
    {url: 'http://ign.com/',
     title: 'IGN - Walkthroughs, Reviews, News & Videos',
     screenshot: '/style/preloaded/screenshots/2_IGN.jpg'},
    {url: 'http://edition.cnn.com/',
     title: 'CNN.com International - Breaking News',
     screenshot: '/style/preloaded/screenshots/3_CNN.jpg'},
    {url: 'http://500px.com/',
     title: '500px | The Premier Photography Community.',
     screenshot: '/style/preloaded/screenshots/4_500px.jpg'},
    {url: 'http://www.49ers.com/',
     title: 'The Official Site of the San Francisco 49ers',
     screenshot: '/style/preloaded/screenshots/5_49ers.jpg'},
    {url: 'http://espn.go.com/',
     title: 'ESPN: The Worldwide Leader In Sports',
     screenshot: '/style/preloaded/screenshots/6_ESPN.jpg'},
  ];

  if (window.Places) {
    defaultHistory.forEach(function (place) {
      window.Places.addPlace(place);
    });
    defaultTopSites.forEach(function (place) {
      window.Places.addPlace(place);
    });
  }

})();
