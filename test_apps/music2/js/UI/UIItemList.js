var UIItemList = function(div){
  this.dom = {};
  this.dom.list = div;
  div.classList.add('itemList');

  this.items = [];

  this.draggable = false;

  Utils.setupPassParent(this, 'elemMoved');
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
    var div = item.createDiv();
    if (this.draggable){
      this.setupHold(item);
    }
    this.dom.list.appendChild(div);
    this.items.push(item);
  },
  remove: function(item){
    this.dom.list.removeChild(item.dom.div);
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
