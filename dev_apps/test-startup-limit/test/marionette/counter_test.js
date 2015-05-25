var expect = require('chai').expect;

const APP_ORIGIN = 'app://test-startup-limit.gaiamobile.org';

function Counter(client) {
  this.client = client;
}

Counter.prototype = {
  launch: function() {
    this.client.apps.launch(APP_ORIGIN);
    this.client.apps.switchToApp(APP_ORIGIN);
  },

  getCurrentBase: function() {
    return this.client
      .findElement('.toggle')
      .text()
      .indexOf('binary') !== -1 ? 'decimal' : 'binary';
  },

  getCount: function() {
    return this.client
      .findElement('.count')
      .text();
  },

  toggleView: function() {
    var base = this.getCurrentBase();
    this.client
      .findElement('.toggle')
      .click();
    this.client.waitFor(function() {
      return this.getCurrentBase() !== base;
    }.bind(this));
  },

  plus: function() {
    this.client
      .findElement('.plus')
      .click();
  },

  minus: function() {
    this.client
      .findElement('.minus')
      .click();
  }
};

marionette('counter', function() {
  var client = marionette.client();
  var counter = new Counter(client);

  setup(function() {
    counter.launch();
  });

  test('should initially show decimal', function() {
    expect(counter.getCurrentBase()).to.equal('decimal');
  });

  test('toggling view should show binary', function() {
    counter.toggleView();
    expect(counter.getCurrentBase()).to.equal('binary');
    counter.plus();
    counter.plus();
    expect(counter.getCount()).to.equal('10');
  });

  test('+ should increment count', function() {
    expect(counter.getCount()).to.equal('0');
    counter.plus();
    counter.plus();
    expect(counter.getCount()).to.equal('2');
  });

  test('- should decrement count', function() {
    expect(counter.getCount()).to.equal('0');
    counter.plus();
    counter.plus();
    counter.minus();
    expect(counter.getCount()).to.equal('1');
  });
});
