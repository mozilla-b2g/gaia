console.log('=======================================================');

window.startTime = Date.now();

var Utils = {
  size: function(obj){
    var i = 0;
    for (var prop in obj){
      i++;
    }
    return i;
  },
  runEventOnce: function(elem, eventName, fn){
    var onceFn = function(event){
      fn(event);
      elem.removeEventListener(eventName, onceFn);
    };
    elem.addEventListener(eventName, onceFn);
  },
  putOnEventQueue: function(fn){
    setTimeout(fn, 0);
  },
  loadDomIds: function(view, ids){
    view.dom = {};
    for (var i = 0; i < ids.length; i++){
      var id = ids[i];
      view.dom[id] = document.getElementById(id);
    }

  },
  setupPassEvent: function(view, eventName){
    if (view[eventName]){
      var oldFn = view[eventName].bind(view);
      view[eventName] = function(){
        var val = oldFn.apply(null, arguments);
        wrapper();
        return val;
      }
    }
    else {
      view[eventName] = wrapper;
    }
      
    function wrapper(){
      if (view['on' + eventName])
        view['on' + eventName].apply(view, arguments);
      else
        console.log('@' + view + ' dropped: ' + eventName);
    }
  },
  empty: function(node){
    while (node.hasChildNodes()){
      node.removeChild(node.lastChild);
    }
  },
  onButtonTap: function(div, fn){
    var tapManager = new TapManager(div);
    tapManager.ontap = fn;
    tapManager.ondown = function(){ div.classList.add('buttonDown'); };
    tapManager.onup = function(){ div.classList.remove('buttonDown'); };
    return tapManager;
  },
  classDiv: function(className){
    var classDiv = document.createElement('div');
    for (var i = 0; i < arguments.length; i++){
      classDiv.classList.add(arguments[i]);
    }
    return classDiv;
  },
  strCmp: function strCmp(a, b){
    if (a < b)
      return -1;
    else if (a > b)
      return 1;
    return 0;
  },
}
