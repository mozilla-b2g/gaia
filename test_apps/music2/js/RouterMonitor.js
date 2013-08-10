var RouterMonitor = function(url){

  this.url = url;

  Router.onroute = this._routed.bind(this);
  Router.onrouteDefered = this._routeDefered.bind(this);
}

RouterMonitor.prototype = {
  _routed: function(srcName, routeName, tgtName, tgtLineNumber, args){
    this._post('route', {
      'src': srcName,
      'route': routeName,
      'tgt': tgtName,
      'tgtLine': tgtLineNumber,
      'args': JSON.stringify(args)
    });
  },
  _routeDefered: function(srcName, routeName, args){
    this._post('defer', {
      'src': srcName,
      'route': routeName,
      'args': JSON.stringify(args)
    });
  },
  _post: function(channel, data){
    
  }
}
