var Menu = function(elements){
  this.dom = {};
  this.dom.icon = document.createElement('div');
  this.dom.icon.classList.add('menu-icon');


  this.router = new Router(this);
  
  this.router.declareRoutes([
    'select'
  ]);

  Utils.onButtonTap(this.dom.icon, this.toggleVisibility.bind(this));

  this.dom.list = document.createElement('div');
  this.dom.list.classList.add('menu-list');
  this.dom.list.classList.add('hidden');
  document.body.appendChild(this.dom.list);

  this.dom.overlay = document.createElement('div');
  this.dom.overlay.classList.add('menu-overlay');
  this.dom.overlay.classList.add('hidden');
  document.body.appendChild(this.dom.overlay);
  var tapManager = new TapManager(this.dom.overlay);
  tapManager.router.when('tap', [this, 'toggleVisibility']);

  for (var title in elements){
    var elem = this._makeElem(title, elements[title]);
    this.dom.list.appendChild(elem);
  }
}

Menu.prototype = {
  name: "Menu",
  //============== API ===============
  toggleVisibility: function(){
    this.dom.list.classList.toggle('hidden');
    this.dom.overlay.classList.toggle('hidden');

    var rect = this.dom.icon.getBoundingClientRect();

    this.dom.list.style.top = this.dom.icon.offsetHeight + rect.top + 'px';

    var leftEdge = rect.left;
    var rightEdge = rect.left + this.dom.icon.offsetWidth;
    if (leftEdge >= 0 && leftEdge + this.dom.list.offsetWidth <= document.body.offsetWidth){
      this.dom.list.style.left = leftEdge + 'px';
      this.dom.list.style.right = 'auto';
    }
    else {
      this.dom.list.style.left = 'auto';
      this.dom.list.style.right = (document.body.offsetWidth - rightEdge) + 'px';
    }
  },
  //============== helpers ===============
  _makeElem: function(title, select){
    var elem = document.createElement('div');
    elem.textContent = title;
    Utils.onButtonTap(elem, function(){
      this.router.route('select')(select);
      this.toggleVisibility();
    }.bind(this));
    return elem;
  }
}
