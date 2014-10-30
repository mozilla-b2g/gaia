// all builds which contain a gecko product end in _gecko.
var SUFFIX = /_gecko$/;

// mapping from normalized OS to tinderbox os list.
var OS_MAP = {
  win32: 'win32',
  'mac': 'macosx64',
  'linux-i686': 'linux32',
  'linux-x86_64': 'linux64'
};

function filterBuild(options, item) {
  var name = item.name;

  return (
    // must start with tinderbox branch name
    name.indexOf(options.branch) === 0 &&
    // must end with the gecko string if its b2g
    (options.product !== 'b2g' || SUFFIX.test(name)) &&
    // must contain the os string
    name.indexOf(OS_MAP[options.os]) !== -1
  );
}

function filterBuilds(options, list) {
  var choices = list.
    filter(filterBuild.bind(null, options));

  if (!choices.length)
    return null;

  return choices[0].name;
}

module.exports = filterBuilds;
