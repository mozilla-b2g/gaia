'use strict';

function DragManager(dom) {
  this.dom = dom;

  this.router = new Router(this);

  this.tapManager = new TapManager(this.dom);

  this.state = {
    inCanceledTap: false,
    lastYs: []
  };

  this.router.declareRoutes([
    'start',
    'drag',
    'end'
  ]);

  this.tapManager.router.when('cancel', [this, 'tapCanceled']);

  this.dom.addEventListener('touchmove', this.touchMove.bind(this));
  this.dom.addEventListener('touchend', this.touchEnd.bind(this));
  this.dom.addEventListener('touchleave', this.touchEnd.bind(this));


}

DragManager.prototype = {
  name: 'dragManager',
  tapCanceled: function() {
    this.state.inCanceledTap = true;
    this.state.lastYs = [];
    this.router.route('start')();
  },
  touchMove: function(event) {
    if (this.state.inCanceledTap) {
      this.router.route('drag')(event.touches[0].clientY);
      this.state.lastYs.unshift(event.touches[0].clientY);
      if (this.state.lastYs.length > 5)
        this.state.lastYs.pop();
    }
  },
  touchEnd: function(event) {
    if (this.state.inCanceledTap) {
      var deltas = [];
      for (var i = 0; i < this.state.lastYs.length - 1; i++) {
        deltas.push(this.state.lastYs[i] - this.state.lastYs[i + 1]);
      }
      var deltaSum = deltas.reduce(function(a, b) { return a + b; }, 0);
      var vel = 0;
      if (deltas.length > 0)
        vel = deltaSum /= deltas.length;
      this.router.route('end')(vel);
      this.state.inCanceledTap = false;
    }
  }
};
