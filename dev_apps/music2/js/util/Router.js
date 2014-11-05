'use strict';

var Router = function(module) {
  this.module = module;
  this.routeTable = {};
  this.unsentData = {};
};


Router.prototype = {
  when: function(route, fn, logData) {
    if (fn instanceof Array) {
      var module = fn[0];
      var fnName = fn[1];
      try {
        fn = module[fnName].bind(module);
        if (logData === undefined) {
          logData = {
            module: module,
            name: fnName
          };
        }
      } catch (e) {
        console.warn(e, e.stack);
        throw e;
      }
    }
    var fnData = { 'fn': fn, 'logData': logData };
    if (this.routeTable[route] === undefined)
      this.routeTable[route] = [];
    if (this.unsentData[route] !== undefined) {
      this.unsentData[route].forEach(function(args) {
        if (this._shouldLogRouting())
          console.log('defered route:', this._stringifyRoute(route, fnData));
        fn.apply(null, args);
      }.bind(this));
    }
    this.routeTable[route].push(fnData);
  },
  route: function(route) {
    return function() {
      if (this.routeTable[route] === undefined) {
        if (this.unsentData[route] === undefined)
          this.unsentData[route] = [];
        if (this._shouldLogRouting())
          console.log('defered:', this._stringifyRoute(route, { }));
        this.unsentData[route].push(arguments);
      }
      else {
        var args = arguments;
        var results = this.routeTable[route].map(function(fnData) {
          if (this._shouldLogRouting())
            console.log('route:', this._stringifyRoute(route, fnData));
          return fnData.fn.apply(null, args);
        }.bind(this)).filter(function(x) { return x !== undefined; });
        if (results.length === 1)
          return results[0];
      }
    }.bind(this);
  },
  declareRoutes: function(routes) {
    // just for readability for now
  },
  _shouldLogRouting: function() {
    if (this.logRouting !== undefined)
      return this.logRouting;
    else
      return Router.logRouting;
  },
  _stringifyRoute: function(route, fnData) {
    var logData = fnData.logData || {};
    var fn = fnData.fn || {};
    var sourceModuleName = '?';
    if (this.module)
      sourceModuleName = this.module.name;
    var sinkModuleName = '?';
    if (logData.module)
      sinkModuleName = logData.module.name;
    return sourceModuleName + '[' + route + ']' + ' --> ' +
           sinkModuleName + '[' + (logData.name || fn.name || '?') + ']';
  }
};

Router.logRouting = true;

Router.connect = function(source, sink, sourceToTarget) {
  for (var sourceRoute in sourceToTarget) {
    var targetRoute = sourceToTarget[sourceRoute];
    source.router.when(sourceRoute, [sink, targetRoute]);
  }
};

Router.proxy = function(source, sink, sourceToTarget) {
  if (sourceToTarget === undefined) {
    var sourceModule = source[0];
    var sourceFnName = source[1];

    var sinkModule = sink[0];
    var sinkFnName = sink[1];

    sourceModule.router.when(sourceFnName, function() {
      return sinkModule.router.route(sinkFnName).apply(null, arguments);
    }, { 'module': sinkModule, 'name': sinkFnName });
  }
  else {
    for (var sourceRoute in sourceToTarget) {
      var targetRoute = sourceToTarget[sourceRoute];
      (function(targetRoute) {
        source.router.when(sourceRoute, function() {
          return sink.router.route(targetRoute).apply(null, arguments);
        }, { 'module': sink, 'name': targetRoute });
      })(targetRoute);
    }
  }
};
