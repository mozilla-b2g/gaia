var fs = require('fs'),
    profile = require('../index'),
    remove = require('remove');

var PROFILE_DIR = __dirname + '/profile';

if (fs.existsSync(PROFILE_DIR))
  remove.removeSync(PROFILE_DIR);

fs.mkdirSync(PROFILE_DIR);
fs.mkdirSync(PROFILE_DIR + '/webapps');

// launch about:config in firefox for more pref names.
var options = {
  profile: PROFILE_DIR,

  prefs: {
    // turn on dump so it will output to stdout
    'browser.dom.window.dump.enabled': true,

    // bump up max workers
    'dom.workers.maxPerDomain': 100
  },

  settings: {
    'lockscreen.enabled': true
  },

  apps: {
    'my-new-app.com': __dirname + '/../test/fixtures/test-app-a',
    'other-app.com': __dirname + '/../test/fixtures/test-app-b'
  }
};



// this will create a temp dir for a profile that will be
// removed when the process closes... keep: true can be passed
// to turn off the default behaviour
profile.create(options, function(err, instance) {
  console.log('user.js');
  console.log(fs.readFileSync(instance.path + '/user.js', 'utf8').trim());

  console.log('\n----\n')

  console.log('settings.json');
  console.log(fs.readFileSync(instance.path + '/settings.json', 'utf8').trim());

  console.log('\n see profile at: ', instance.path);
});
