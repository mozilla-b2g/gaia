var realMap = Map;

function MockMap() {
  this.keys = [];
  this.vals = [];

  Object.defineProperty(this, 'size', {
    get: function() {
      return this.keys.length;
    }
  });
}

MockMap.history = [];

MockMap.prototype.has = function(key) {
  if (this.keys.indexOf(key) !== -1) {
    return true;
  }
  return false;
};

MockMap.prototype.set = function(key, val) {
  var index = this.keys.indexOf(key);

  if (index !== -1) {
    this.vals[index] = val;
  } else {
    this.keys.push(key);
    this.vals.push(val);
  }
  return this;
};

MockMap.prototype.get = function(key) {
  var index = this.keys.indexOf(key);
  if (index !== -1) {
    return this.vals[index];
  }
  return null;
};

MockMap.prototype.delete = function(key) {
  var index = this.keys.indexOf(key);
  if (index !== -1) {
    this.keys.splice(index, 1);
    this.vals.splice(index, 1);
  }
};

['has', 'get', 'set', 'delete'].forEach(function(method) {
  var orig = MockMap.prototype[method];

  MockMap.prototype[method] = function() {
    MockMap.history.push({
      called: method,
      calledWith: [].slice.call(arguments)
    });
    return orig.apply(this, arguments);
  };
});


Map = MockMap;
