'use strict';
/* global GaiaGrid */

var grid = document.getElementById('grid');

var icon = 'mozilla.png';
var whitePixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///' +
  'wAAACwAAAAAAQABAAACAkQBADs=';

var items = [
  new GaiaGrid.Bookmark({
    id: 1,
    name: 'Mozilla',
    icon: icon,
    url: 'http://mozilla.org'
  }),
  new GaiaGrid.Bookmark({
    id: 2,
    name: 'Two',
    icon: icon,
    url: 'http://2'
  }),
  new GaiaGrid.Bookmark({
    id: 3,
    name: 'Three',
    icon: icon,
    url: 'http://3'
  }),
  new GaiaGrid.Bookmark({
    id: 4,
    name: 'Four',
    icon: icon,
    url: 'http://4'
  }),
  new GaiaGrid.Mozapp({
    id: 5,
    icon: icon,
    manifest: {
      name: 'A Webapp',
      icons: {
        64: whitePixel
      }
    }
  }),
  new GaiaGrid.Divider(),
  new GaiaGrid.Mozapp({
    id: 6,
    manifestURL: 'app://xfoobar',
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

document.getElementById('clear').addEventListener('click', function() {
  grid.clear();
});

