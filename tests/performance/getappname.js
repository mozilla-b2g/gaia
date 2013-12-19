var fs = require('fs');

function GetAppName(app)
{
  var client = app.client.scope({ context: 'chrome' });
  var appName = client.executeScript(
    'var manifestUrl = \'' +
      app.instance.manifestURL + '\';\n' +
      fs.readFileSync('./tests/performance/getappname_atom.js')
  );
  return appName;
}

module.exports = GetAppName;
