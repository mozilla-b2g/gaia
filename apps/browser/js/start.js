'use strict';

var Start = {
  MAX_TOP_SITES: 4, // max number of top sites to display

  init: function start_init() {
    this.thumbnails = document.getElementById('thumbnails');
    this.noTopSites = document.getElementById('no-top-sites');
    Places.init((function() {
      Places.getTopSites(this.MAX_TOP_SITES, null,
        this.showThumbnails.bind(this));
    }).bind(this));

  },

  showThumbnails: function start_showThumbnails(places) {
    var length = places.length;
    // Display a message if Top Sites empty
    if (length == 0)
      Start.noTopSites.classList.remove('hidden');
    // If an odd number greater than one, remove one
    if (length % 2 && length > 1)
      places.pop();
    // If only one, pad with another empty one
    if (length == 1)
      places.push({uri: '', title: ''});

    places.forEach(function processPlace(place) {
      var thumbnail = document.createElement('li');
      var link = document.createElement('a');
      var title = document.createElement('span');
      link.href = place.uri;
      title.textContent = place.title ? place.title : place.uri;
      link.style.backgroundImage = 'url(' + place.screenshot + ')';
      thumbnail.appendChild(link);
      thumbnail.appendChild(title);
      this.thumbnails.appendChild(thumbnail);
    }, this);
  }

};

window.addEventListener('load', function startOnLoad(evt) {
  window.removeEventListener('load', startOnLoad);
  Start.init();
});
