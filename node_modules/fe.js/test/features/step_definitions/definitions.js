(function() {
  var definitionsWrapper = function() {
    this.World = require('../support/world.js').World;
    this.Given("I make '$path'", function(path, cb) {
      this.wrench.mkdirSyncRecursive(path);
      cb();
    });
    this.When("I check how many items in '$path'", function(path, cb) {
      var length = this.wrench.readdirSyncRecursive(path).length;
      this.readLength = length;
      cb();
    });
    this.When("I remove '$dir'", function(dir, cb) {
      this.wrench.rmdirSyncRecursive(dir);
      cb();
    });
    this.Then("I should see '$output'", function(output, cb) {
      if (parseInt(output) !== this.readLength) {
        cb.fail(new Error('Expected to see ' + output + ' but it is ' + this.readLength));
      } else {
        cb();
      }
    });
  };
  module.exports = definitionsWrapper;
})();
