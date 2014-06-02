'use strict';
/* global Bookmark */
/* global Divider */
/* global Icon */

var grid = document.getElementById('grid');

var icon = 'mozilla.png';
var whitePixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///' +
  'wAAACwAAAAAAQABAAACAkQBADs=';

var items = [
  new Bookmark({
    id: 1,
    name: 'Mozilla',
    icon: icon,
    url: 'http://mozilla.org'
  }),
  new Bookmark({
    id: 2,
    name: 'Two',
    icon: icon,
    url: 'http://2'
  }),
  new Bookmark({
    id: 3,
    name: 'Three',
    icon: icon,
    url: 'http://3'
  }),
  new Bookmark({
    id: 4,
    name: 'Four',
    icon: icon,
    url: 'http://4'
  }),
  new Icon({
    id: 5,
    icon: icon,
    manifest: {
      name: 'A Webapp',
      icons: {
        64: whitePixel
      }
    }
  }),
  new Divider(),
  new Icon({
    id: 6,
    manifest: {
      name: 'Another Webapp',
      icons: {
        64: whitePixel
      }
    }
  }),
];

items.forEach(grid.add.bind(grid));

grid.render();
