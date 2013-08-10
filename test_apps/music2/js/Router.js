var Router = {
  logRouting: false,
  MaxUnsentBeforeWarn: 5,
  onroute: null,
  onrouteDefered: null,
  route: function(view, data){
    if (typeof data === 'string'){
      Router._routeSingle(view, data)
    }
    else {
      for (var i = 0; i < data.length; i++){
        Router._routeSingle(view, data[i]);
      }
    }
  },
  addRouterReceptor: function(view, name, listener){
    var oldFn = null;
    if (view['on' + name]){
      oldFn = view['on' + name].bind(view);
    }
    view['on' + name] = function(){
      if (oldFn)
        oldFn.apply(null, arguments);
      listener.apply(null, arguments);
    }
  },
  _routeSingle: function(view, name){
    if (view[name]){
      var oldFn = view[name].bind(view);
      view[name] = function(){
        var val = oldFn.apply(null, arguments);
        wrapper.apply(null, arguments);
        return val;
      }
    }
    else {
      view[name] = wrapper;
    }

    var unsent = [];
      
    function wrapper(){
      if (view['on' + name]){
        if (Router.logRouting)
          console.log('@' + (view.name || view) + ': ' + name + ' --> ' + view['on' + name].__target.module + "|" + view['on' + name].__target.lineNumber);
        if (Router.onroute)
          Router.onroute(view.name, name, view['on' + name].__target.module, view['on' + name].__target.lineNumber, arguments);

        return view['on' + name].apply(view, arguments);
      }
      else {
        unsent.push(arguments);
        if (Router.logRouting)
          console.log('@' + (view.name || view) + ' defer: ' + name);
        if (Router.onrouteDefered)
          Router.onrouteDefered(view.name, name, arguments);
        if (unsent.length > Router.MaxUnsentBeforeWarn){
          console.warn('@' + (view.name || view) + ' defered ' + name + ' ' + unsent.length + ' times, possible unintercepted route');
        }
      }
    }

    var listener = null;

    Object.defineProperty(view, 'on' + name, 
      { get: function(){
          return listener;
        }, 
        set: function(fn){
          var stack = new Error().stack;
          var caller = stack.split('\n')[1].split('@')[0];
          var lineNumber = stack.split('\n')[1].split('@')[1].split(':')[2];
          if (caller === 'Router.addRouterReceptor'){
            caller = stack.split('\n')[2].split('@')[0];
            lineNumber = stack.split('\n')[2].split('@')[1].split(':')[2];
          }
          var __target = {}
          __target.module = caller;
          __target.lineNumber = lineNumber;

          fn.__target = __target;

          unsent.forEach(function(args){ 
            if (Router.logRouting)
              console.log('@' + (view.name || view) + ' run defered: ' + name + ' --> ' + fn.__target.module + "|" + fn.__target.lineNumber);
            if (Router.onroute)
              Router.onroute(view.name, name, fn.__target.module, fn.__target.lineNumber, arguments);
            fn.apply(view, args);
          });
          listener = fn;
        },
    });
  },
  proxy: function(view, child, data){
    Router.route(view, data);
    if (typeof data === 'string'){
      child['on' + data] = view[data];
    }
    else {
      for (var i = 0; i < data.length; i++){
        child['on' + data[i]] = view[data[i]];
      }
    }
  },
}
