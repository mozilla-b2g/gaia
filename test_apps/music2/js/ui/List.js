function List(){
  this.dom = {};
  this.dom.list = document.createElement('ul');

  this.dom.list.classList.add('list');

  this.lastFirstLetter = null;

  this.router = new Router(this);
}

List.prototype = {
  name: 'List',
  //============== API ===============
  addItem: function(item){
    var node = document.createElement('li');
    node.classList.add('list-item');

    var a = document.createElement('a');
    node.appendChild(a);

    var title = document.createElement('span');
    title.innerHTML = item.title;
    title.className = 'list-main-title';
    node.appendChild(title);

    item.getImgUrl(function(url){
      node.style.backgroundImage = 'url(' + url + ')';
    });

    node.onclick = item.onclick;

    var firstLetter = item.title[0];

    if (this.lastFirstLetter !== firstLetter) {

      var headerLi = document.createElement('li');
      headerLi.className = 'list-header';
      headerLi.textContent = firstLetter || '?';

      this.dom.list.appendChild(headerLi);

      this.lastFirstLetter = firstLetter;
    }

    this.dom.list.appendChild(node);
  }
  //============== helpers ===============

}



