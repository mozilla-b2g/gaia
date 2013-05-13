var cmd = require('../lib/script')({
  desc: 'Outputs host file section for gaia apps',
  usage: 'hostfile --gaia $GAIA_DIR',
  options: {

    gaia: {
      alias: 'g',
      desc: 'path to gaia directory',
      demand: true
    },

    domain: {
      desc: 'domain name to use in host file',
      default: 'gaiamobile.org'
    },

    ip: {
      desc: 'up to use in definition',
      default: '127.0.0.1'
    }

  }
}, function(argv) {
  var fs = require('fs'),
      path = require('path'),
      dirs,
      gaiaPath = path.join(argv.gaia, 'apps'),
      output = "# GAIA : " + argv.domain + ' / ' + argv.ip + '\n';

  if (!path.existsSync(gaiaPath)) {
    console.error('"' + argv.gaia + '"', 'is not a valid path');
    process.exit(1);
  }

  output += argv.ip + ' ' + argv.domain + '\n';

  //don't care about performance
  dirs = fs.readdirSync(gaiaPath);

  dirs.forEach(function(app) {
    if(fs.statSync(path.join(gaiaPath, app)).isDirectory()) {
      output += argv.ip + ' ' + app + '.' + argv.domain + '\n'
    }
  });

  output += '# GAIA END';

  console.log(output);

});

module.exports = cmd;

