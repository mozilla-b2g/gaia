'use strict';

function List() {
  this.dom = {};
  this.dom.list = document.createElement('ul');

  this.dom.list.classList.add('list');

  // The way we group the artists is different for bigger resolutions, so
  // check the screen size here to display different information to users.
  this.isTiny = (ScreenLayout.getCurrentLayout() === 'tiny');
  this.lastCriterion = null;

  this.router = new Router(this);
}

List.prototype = {
  name: 'List',
  //============== API ===============
  addItem: function(item) {
    var template, htmlText, criterion, node;

    switch (item.option) {
      case 'playlist':
        template = new Template('list-playlist-template');

        htmlText = template.interpolate({
          'title': item.metadata.title
        });

        criterion = null;
        break;
      case 'album':
        template = new Template('list-album-template');

        htmlText = template.interpolate({
          'main-title': item.metadata.album,
          'sub-title': item.metadata.artist
        });

        criterion = item.metadata.album.charAt(0);
        break;
      case 'artist':
        template = new Template('list-artist-template');

        htmlText = template.interpolate({
          'title': (this.isTiny) ? item.metadata.artist : item.metadata.album
        });

        criterion = (this.isTiny) ?
          item.metadata.artist.charAt(0) : item.metadata.album;
        break;
      case 'title':
        template = new Template('list-album-template');

        htmlText = template.interpolate({
          'main-title': item.metadata.title,
          'sub-title': item.metadata.artist
        });

        criterion = item.metadata.title.charAt(0);
        break;
    }

    node = this._convertToDOM(htmlText);
    node.onclick = item.onclick;

    // Create header for each section.
    if (this.lastCriterion !== criterion) {
      this.lastCriterion = criterion;
      criterion = (!this.isTiny && item.option === 'artist') ?
        item.metadata.artist : criterion;

      template = new Template('list-header-template');

      htmlText = template.interpolate({
        'header': criterion || '?'
      });

      this.dom.list.appendChild(this._convertToDOM(htmlText));
    }

    // Getting the url of background-image is async so we append child to
    // the DOM tree then assign the url after the callback of the function,
    // or should we also use template to interpolate the background image?
    item.getImgUrl(function(url) {
      node.style.backgroundImage = 'url(' + url + ')';
    });

    this.dom.list.appendChild(node);
  },
  //============== helpers ===============
  _convertToDOM: function(htmlText) {
    // convert as DOM node
    var dummyDiv = document.createElement('div');
    dummyDiv.innerHTML = htmlText;

    return dummyDiv.firstElementChild;
  }
};
