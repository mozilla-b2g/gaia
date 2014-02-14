var fs = require('fs');
var config = require('./customizeConfig.js');
var maxImagePixelSize = 5 * 1024 * 1024;

var gaiaDistributionDirectory = process.env.GAIA_DISTRIBUTION_DIR;
var configurationObject = {};
var configurationFile;

var generateConfigurationFile = function() {
  var content = config.customizeMaximumImageSize(configurationObject);

  fs.writeFile('js/config.js', content, function(err) {
    if (err) {
        console.log(err);
    } else {
        console.log('Configuration file has been generated: js/config.js');
    }
  });
};

if (gaiaDistributionDirectory) {
  fs.readFile(gaiaDistributionDirectory + '/camera.json',
              'utf8', function(err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        console.log('The configuration file :' + gaiaDistributionDirectory +
                    '/camera.json doesn\'t exist');
      } else {
        return console.log(err);
      }
    } else {
      configurationObject = JSON.parse(data);
    }
    generateConfigurationFile();
  });
} else {
  generateConfigurationFile();
}
