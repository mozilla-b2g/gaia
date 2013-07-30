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
  setupPassParent: function(view, eventName){
    if (view[eventName]){
      var oldFn = view[eventName].bind(view);
      view[eventName] = function(){
        var val = oldFn.apply(null, arguments);
        wrapper.apply(null, arguments);
        return val;
      }
    }
    else {
      view[eventName] = wrapper;
    }
      
    function wrapper(){
      if (view['on' + eventName])
        return view['on' + eventName].apply(view, arguments);
      else
        console.log('@' + (view || view.name) + ' dropped: ' + eventName);
    }
  },
  copyArray: function(array){
    return array.slice(0);
  },
  shuffleArray: function(array){
    var range = array.length-1;
    while (range > 0){ 
      var idx = Math.floor(Math.random() * range);
      var temp = array[range];
      array[range] = array[idx];
      array[idx] = temp;
      range -= 1;
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
  onButtonLongTap: function(div, ontap, onlongTap){
    var tapManager = new TapManager(div);
    tapManager.ontap = ontap;
    tapManager.ondown = function(){ div.classList.add('buttonDown'); };
    tapManager.onup = function(){ div.classList.remove('buttonDown'); div.classList.remove('buttonLong'); };
    tapManager.onlong = function(){ div.classList.remove('buttonDown'); div.classList.add('buttonLong'); };
    tapManager.onlongTap = onlongTap;
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
  select: function(values, done, srcElem){

    var select = document.createElement('select');
    select.style.width = '0px';
    select.style.height = '0px';

    for (var text in values){
      var option = document.createElement('option');
      option.innerHTML = text;
      var value = values[text];
      if (typeof value === 'string'){
        option.value = value;
      }
      else {
        option.value = value.value;
        if (value.default)
          option.setAttribute('selected', 'selected');
      }
      select.appendChild(option);
    }

    document.body.appendChild(select);
    select.onblur = function(){
      var option = select.options[select.selectedIndex];
      done(option.value);
      document.body.removeChild(select);
    }
    setTimeout(function(){
      select.focus();
    }, 0);
  }
}
