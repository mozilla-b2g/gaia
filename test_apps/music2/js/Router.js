var Router = function(debug){
  this.debug = debug;
  this.fnTable = {};
}

Router.prototype = {
  call: function(event){
    var args = Array.prototype.slice.call(arguments);
    args.shift();
    if (this.debug)
      console.log('call: ' + event);
    return this.fnTable[event].apply(null, args);
  },
  on: function(event, fn){
    this.fnTable[event] = fn;
  }
}

