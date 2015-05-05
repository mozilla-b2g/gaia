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

  getCount: function() {
    return +this.client
      .findElement('.count')
      .text();
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

  test('+ should increment count', function() {
    expect(counter.getCount()).to.equal(0);
    counter.plus();
    expect(counter.getCount()).to.equal(1);
  });

  test('- should decrement count', function() {
    expect(counter.getCount()).to.equal(0);
    counter.minus();
    expect(counter.getCount()).to.equal(-1);
  });
});
