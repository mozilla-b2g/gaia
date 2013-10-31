var UIItemDrag = function(div, list, noSetTM, extra){
  this.dom = {};
  this.dom.div = div;
  this.dom.list = list;

  this.extra = extra;
  if (extra && extra.dom.content)
    this.dom.watch = extra.dom.content;

  this.state = {
    scrollVel: 0,
    currentScroll: 0,
    currentDropElement: null,
    currentDropDir: 'above'
  };

  this.router = new Router(this);

  this.router.declareRoutes([
    'moved'
  ]);

  if (!noSetTM){
    var tapManager = new TapManager(div);
    tapManager.router.when('long', [this, 'start']);
  }

  this.fns = [];

}
UIItemDrag.prototype = {
  name: "UIItemDrag",
  addEvent: function(div, eventName, fn){
    div.addEventListener(eventName, fn);
    this.fns.push({ 'type': eventName, 'fn': fn, 'div': div });
  },
  start: function(x, y){
    if (this.dom.list.childNodes.length === 1)
      return;

    this.dom.div.classList.add('floating');
    this.dom.div.style.top = (y - this.dom.div.clientHeight/2) + 'px';
    if (this.dom.watch){
      this.dom.watch.classList.add('floating');
      this.dom.watch.classList.add('topFloat');
      this.dom.watch.style.top = (y - this.dom.watch.clientHeight/2) + 'px';
    }

    this.state.currentScroll = this.dom.list.scrollTop;
    this.state.scrollVel = 0;
    this.state.currentDropElement = null;
    this.state.currentDropDir = 'above';


    if (this.dom.watch)
      this.addEvent(this.dom.watch, 'touchmove', this.onmove.bind(this));
    else
      this.addEvent(this.dom.div, 'touchmove', this.onmove.bind(this));
    this.addEvent(this.dom.list, 'scroll', this.onscroll.bind(this));

    this.intervalId = window.setInterval(this.updateScroll.bind(this), 50);

    if (this.dom.watch)
      this.addEvent(this.dom.watch, 'touchend',this.stop.bind(this));
    else
      this.addEvent(this.dom.div, 'touchend',this.stop.bind(this));

    this.dom.list.removeChild(this.dom.div);
    document.body.appendChild(this.dom.div);
    if (this.dom.watch){
      this.dom.list.removeChild(this.dom.watch);
      document.body.appendChild(this.dom.watch);
    }

    var listRect = this.dom.list.getBoundingClientRect();
    this.setDropPoint(listRect, x, y);
  },
  stop: function(){
    document.body.removeChild(this.dom.div);
    this.dom.div.classList.remove('floating');
    if (this.dom.watch){
      document.body.removeChild(this.dom.watch);
      this.dom.watch.classList.remove('floating');
    }
    this.dom.div.style.top = 0;
    if (this.dom.watch)
      this.dom.watch.style.top = 0;

    for (var i = 0; i < this.fns.length; i++){
      this.fns[i].div.removeEventListener(this.fns[i].type, this.fns[i].fn);
    }
    this.fns = [];

    window.clearInterval(this.intervalId);

    this.state.currentDropElement.style.borderTop = 'none';
    this.state.currentDropElement.style.borderBottom = 'none';

    if (this.state.currentDropDir === 'above'){
      this.dom.list.insertBefore(this.dom.div, this.state.currentDropElement);
    }
    else if (this.state.currentDropDir === 'below'){
      this.dom.list.insertBefore(this.dom.div, this.state.currentDropElement.nextElementSibling);
    }
    else {
      console.warn('this.state.currentDropDir in bad state: ' + this.state.currentDropDir);
    }

    this.router.route('moved')(this.state.currentDropElement, this.state.currentDropDir);
  },
  onmove: function(event){
    var x = event.touches[0].clientX;
    var y = event.touches[0].clientY;
    this.dom.div.style.top = (y - this.dom.div.clientHeight/2) + 'px';
    if (this.dom.watch)
      this.dom.watch.style.top = (y - this.dom.watch.clientHeight/2) + 'px';
    
    var listRect = this.dom.list.getBoundingClientRect();

    this.setDropPoint(listRect, x, y);

    this.updateScrollVel(listRect, y);

  },
  setDropPoint: function(listRect, x, y){
    var next;
    if (y < listRect.top){
      next = this.dom.list.firstElementChild;
      while (next.offsetTop + next.offsetHeight < this.dom.list.scrollTop){
        next = next.nextElementSibling;
      }
    }
    else if (y > listRect.top + listRect.height){
      next = this.dom.list.lastElementChild;
      while (next.offsetTop >= this.dom.list.scrollTop + this.dom.list.offsetHeight){
        next = next.previousElementSibling;
      }
    }
    else {
      this.dom.div.style.display = 'none';
      if (this.dom.watch)
        this.dom.watch.style.display = 'none';
      next = document.elementFromPoint(x, y);
      while (next && next.classList && !next.classList.contains('uiItem')){
        next = next.parentNode;
      }
      this.dom.div.style.display = 'block';
      if (this.dom.watch)
        this.dom.watch.style.display = 'block';
    }
    if (!next)
      return;

    if (next.getBoundingClientRect === undefined)
      return;
    var nextRect = next.getBoundingClientRect();
    var center = nextRect.top + nextRect.height/2;

    if (y < center){
      this.state.currentDropDir = 'above'
      next.style.borderTop = '1px solid #00c9f1';
      next.style.borderBottom = 'none';
    }
    else {
      this.state.currentDropDir = 'below'
      next.style.borderBottom = '1px solid #00c9f1';
      next.style.borderTop = 'none';
    }

    if (next === this.state.currentDropElement)
      return;

    if (this.state.currentDropElement){
      this.state.currentDropElement.style.borderTop = 'none';
      this.state.currentDropElement.style.borderBottom = 'none';
    }
    this.state.currentDropElement = next;

  },
  updateScrollVel: function(listRect, y){

    var distBottom = listRect.top + listRect.height - y;
    var distTop = y - listRect.top;

    var dist = 0;
    var dir = 0;
    if (distBottom < listRect.height/3){
      dir = 1;
      dist = distBottom/(listRect.height/3);
    }
    else if (distTop < listRect.height/3){
      dir = -1;
      dist = distTop/(listRect.height/3);
    }
    if (dist < 0)
      dist = 0;
    var SCROLL_SPEED = 50;
    this.state.scrollVel = dir*SCROLL_SPEED*(1-dist);
  },
  updateScroll: function(){
    this.state.currentScroll += this.state.scrollVel;
    if (this.state.currentScroll > this.dom.list.scrollHeight - this.dom.list.clientHeight)
      this.state.currentScroll = this.dom.list.scrollHeight - this.dom.list.clientHeight;
    else if (this.state.currentScroll < 0)
      this.state.currentScroll = 0;
    this.dom.list.scrollTop = this.state.currentScroll;
  },
  onscroll: function(event){
    this.dom.list.scrollTop = this.state.currentScroll;
    event.preventDefault();
  }
}
