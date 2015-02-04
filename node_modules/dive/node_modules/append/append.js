module.exports = function(o1, o2) {
  for (var prop in o2)
    o1[prop] = o2[prop];
  return o1;
};
