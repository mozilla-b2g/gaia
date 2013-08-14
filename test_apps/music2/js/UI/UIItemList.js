var UIItemList = function(div){
  this.dom = {};
  this.dom.list = div;
  div.classList.add('itemList');

  this.items = [];

  this.draggable = false;

  Router.route(this, 'elemMoved');
}

UIItemList.prototype = {
  empty: function(){
    Utils.empty(this.dom.list);
    this.items = [];
  },
  hide: function(){
    this.dom.list.classList.add('hidden');
  },
  show: function(){
    this.dom.list.classList.remove('hidden');
  },
  append: function(item){
    if (!item.dom.div)
      item.createDiv();
    var div = item.dom.div;
    if (this.draggable){
      this.setupHold(item);
    }
    this.dom.list.appendChild(div);
    item.index = this.items.length;
    this.items.push(item);
  },
  remove: function(item){
    var index = this.items.indexOf(item);
    this.dom.list.removeChild(item.dom.div);
    item.dom.div.style.background = 'blue';
    this.items.splice(index, 1);
    for (var i = index; i < this.items.length; i++){
      this.items[i].index = i;
    }
  },
  itemByIndex: function(index){
    return this.items[index];
  },
  setupHold: function(item){
    var drag = new UIItemDrag(item.dom.div, this.dom.list);
    drag.onmoved = function(elem, dir){
      var relativeItem = null;
      for (var i = 0; i < this.items.length; i++){
        if (this.items[i].dom.div === elem){
          relativeItem = this.items[i];
          break;
        }
      }
      this.elemMoved({
        'item': item,
        'relativeItem': relativeItem,
        'relativeDir': dir
      });
    }.bind(this);
  }

}
