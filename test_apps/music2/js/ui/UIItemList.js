var UIItemList = function(div){
  this.dom = {};
  this.dom.list = div;
  div.classList.add('itemList');

  this.items = [];

  this.draggable = false;

  this.router = new Router(this);

  this.router.declareRoutes([
    'elemMoved',
  ]);
}

UIItemList.prototype = {
  empty: function(){
    this.items.forEach(function(item){
      item.emit('destroy');
    });
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
    item.emit('destroy');
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
    drag.router.when('moved', function(elem, dir){
      var relativeItem = null;
      for (var i = 0; i < this.items.length; i++){
        if (this.items[i].dom.div === elem){
          relativeItem = this.items[i];
          break;
        }
      }
      this.router.route('elemMoved')({
        'item': item,
        'relativeItem': relativeItem,
        'relativeDir': dir
      });
    }.bind(this));
  },
  startDrag: function(item, x, y, extraOptions){
    var disableTM = true;
    var drag = new UIItemDrag(item.dom.div, this.dom.list, disableTM, extraOptions);
    drag.router.when('moved', function(elem, dir){
      var relativeItem = null;
      for (var i = 0; i < this.items.length; i++){
        if (this.items[i].dom.div === elem){
          relativeItem = this.items[i];
          break;
        }
      }
      this.router.route('elemMoved')({
        'item': item,
        'relativeItem': relativeItem,
        'relativeDir': dir
      });
   }.bind(this));
   drag.start(x, y);
  },
  destroy: function(){
    this.items.forEach(function(item){
      item.emit('destroy');
    });
  }
}
