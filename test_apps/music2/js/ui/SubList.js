'use strict';

function SubList() {
  this.dom = {};

  this.dom.list = document.createElement('div');
  this.dom.list.classList.add('sublist');

  this.dom.items = document.createElement('ul');
  this.dom.items.classList.add('sublist-items');
  this.dom.list.appendChild(this.dom.items);

  this.dom.header = document.createElement('div');
  this.dom.header.classList.add('sublist-header');
  this.dom.list.appendChild(this.dom.header);

  this.dom.image = document.createElement('div');
  this.dom.image.classList.add('sublist-header-image');
  this.dom.header.appendChild(this.dom.image);

  this.dom.title = document.createElement('div');
  this.dom.title.classList.add('sublist-header-title');
  this.dom.header.appendChild(this.dom.title);

  this.dom.controls = document.createElement('div');
  this.dom.controls.classList.add('sublist-header-controls');
  this.dom.header.appendChild(this.dom.controls);

  this.dom.play = document.createElement('div');
  this.dom.play.classList.add('sublist-header-controls-play');
  this.dom.controls.appendChild(this.dom.play);

  this.dom.shuffle = document.createElement('div');
  this.dom.shuffle.classList.add('sublist-header-controls-shuffle');
  this.dom.controls.appendChild(this.dom.shuffle);

  this.lastFirstLetter = null;

  this.router = new Router(this);
}

SubList.prototype = {
  name: 'SubList',
  //============== API ===============
  setTitle: function(title) {
    this.dom.title.innerHTML = title;
  },
  setImage: function(url) {
    this.dom.image.style.backgroundImage = 'url(' + url + ')';
  },
  addItem: function(item) {
    var node = document.createElement('li');
    node.classList.add('sublist-item');

    var a = document.createElement('a');
    node.appendChild(a);

    var title = document.createElement('span');
    title.innerHTML = item.title;
    title.className = 'sublist-item-title';
    node.appendChild(title);

    node.onclick = item.onclick;

    this.dom.items.appendChild(node);
  }
  //============== helpers ===============
};
