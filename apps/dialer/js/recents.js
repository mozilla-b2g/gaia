'use strict';

var Recents = {
  get view() {
    delete this.view;
    return this.view = document.getElementById('recents-view');
  },

  setup: function re_setup() {
    content = '';

    for (var i = 0 ; i < this.last.length ; i++) {
      var recent = this.last[i];

      content += '<div class="recent" data-number="' + recent.number + '">' +
                 profilePictureForNumber(i) +
                 '<div class="name">' + recent.name + '</div>' +
                 '<div class="number">' + recent.number + '</div>' +
                 '<div class="timestamp">' + recent.timestamp + '</div>' +
                 '</div>';
    };

    this.view.innerHTML = content;
  },

  // XXX: fake content for the demo
  last: [
    {name: 'Andreas Gal', number: '1-555-765-655', timestamp: '2 hours ago'},
    {name: 'Herman Meyer', number: '1-543-323-325', timestamp: '4 hours ago'},
    {name: 'Jordan Campbell', number: '1-555-765-655', timestamp: '1 day ago'},
    {name: 'Simon Hall', number: '1-555-765-655', timestamp: '1 day ago'},
    {name: 'Timon Horton', number: '1-555-765-655', timestamp: '2 days ago'},
    {name: 'Beau Baird', number: '1-555-765-655', timestamp: '2 days ago'},
    {name: 'Ali Chase', number: '1-555-765-643', timestamp: '2 days ago'},
    {name: 'Hi Avila', number: '1-555-779-655', timestamp: '3 days ago'},
    {name: 'Reuben Dalton', number: '1-533-765-655', timestamp: '4 days ago'},
    {name: 'Wang Cote', number: '1-555-765-665', timestamp: '5 days ago'}
  ]
};

window.addEventListener('load', function recentsSetup(evt) {
  window.removeEventListener('load', recentsSetup);
  Recents.setup();
});
