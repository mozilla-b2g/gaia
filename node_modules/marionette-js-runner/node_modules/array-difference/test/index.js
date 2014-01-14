var difference = require("../");
var test = require("tape");

test("difference", function(t) {
  var result = difference([3, 1, 2, 4], [5, 4, 3, 6]);
  t.deepEqual(result, [1, 2, 5, 6]);
  t.end();
});
