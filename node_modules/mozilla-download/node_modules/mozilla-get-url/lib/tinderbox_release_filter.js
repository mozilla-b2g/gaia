/**
Simplistic filter which finds the highest value in the list.
The .name is treated numerically.
*/
function releaseFilter(options, list, keep) {

  var result = list.sort(function compareNameAsNumbersDesc(a, b) {
    return b.name - a.name;
  }).slice(0, keep).map(function keepNames(item) {
    return item.name;
  });

  // in the case of zero return null.
  return result.length ? result : null;
}

module.exports = releaseFilter;
