var L20n = {
  getContext: function() {
    return new L20n.Context();
  },
  _startLoading: function(res, callback) {
    var httpRequest;
    httpRequest = new XMLHttpRequest();
    httpRequest.overrideMimeType('text/plain');
    httpRequest.addEventListener("load", function() {
      return callback(httpRequest.responseText)
    }, false);
    httpRequest.open('GET', res.uri, true);
    httpRequest.send('');
  },
  _paths: {'sys': 'js/l20n/data/sys.j20n',
           'globals': 'js/l20n/data/default.j20n'},
}

L20n.Resource = function(aURI) {
  this.uri = aURI;
}

L20n.Resource.prototype = {
  _loading: true,
  uri: null,
}

L20n.Context = function() {
  mFrozen = false;
  mResources = [];
  mEvents = {'ready': null}

  mObjects = {
    'resources': {},
    'context': {},
    'system': {},
    'globals': {},
  }

  this._getObject(mObjects['system'], L20n._paths['sys']);
  this._getObject(mObjects['globals'], L20n._paths['globals']);
}

L20n.Context.prototype = {
  addResource: function(aURI) {
    var res = this._getObject(mObjects['resources'], aURI);
  },
  get: function(id, args) {
    var curObj = mObjects['resources'];
    if (mObjects['context']) {
      mObjects['context'].__proto__ = curObj;
      curObj = mObjects['context'];
    }
    if (args) {
      args.__proto__ = curObj;
      curObj = args;
    }
    mObjects['globals'].__proto__ = curObj;
    curObj = mObjects['globals'];
    return mObjects['system'].getent(curObj, mObjects['system'], id);
  },
  getAttributes: function(id, args) {
    var curObj = mObjects['resources'];
    if (mObjects['context']) {
      mObjects['context'].__proto__ = curObj;
      curObj = mObjects['context'];
    }
    if (args) {
      args.__proto__ = curObj;
      curObj = args;
    }
    mObjects['globals'].__proto__ = curObj;
    curObj = mObjects['globals'];
    return mObjects['system'].getattrs(curObj, mObjects['system'], id);
  },
  isFrozen: function() {
    return mFrozen; 
  },
  freeze: function() {
    mFrozen = true;
    if (this.isReady()) {
      this._fireObserver();
    }
  },
  isReady: function() {
    if (!mFrozen)
      return false;
    for (var i=0;i<mResources.length;i++) {
      if (mResources[i]._loading)
        return false;
    }
    return true;
  },
  set onReady(obs) {
    mEvents['ready'] = obs;
  },
  set data(data) {
    mObjects['context'] = data
  },
  get data() {
    return mObjects['context'];
  },

  // Private
  _loadObject: function(data, obj) {
    var read = function(data) {
      eval(data);
    }
    read.apply(obj, Array(data));
  },
  _getObject: function(obj, url) {
    var self = this;
    var res = new L20n.Resource(url);
    var _injectResource = function(data) {
      self._loadObject(data, obj);
      res._loading = false;

      if (self.isReady()) {
        self._fireObserver();
      }

    }
    L20n._startLoading(res, _injectResource);
    mResources.push(res);
  },
  _fireObserver: function() {
    if (mEvents['ready']) {
      mEvents['ready']();
      mEvents['ready'] = null;
    }
  }
}

