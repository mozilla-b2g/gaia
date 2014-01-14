# mozilla-get-url

Find the url where a given mozilla product lives for all kinds of branches / releases / pre-releases.

Inspired by [firefox-get](https://github.com/jsantell/node-firefox-get) which I initially contributed to for the
b2g-support... The primary difference is mozilla-get-url is designed to handle most mozilla products up front and
uses ftp rather then html scraping.


## Usage

```js
var locate = require('mozilla-get-url');

var options = {
  /**
    - optional
    - default: release
    - examples: ['release', 'prerelease', 'tinderbox', 'try']
  
  Channels determine how builds are fetched and map to lib/channels/$CHANNEL.
  Not all options are available across all channels
  */
  channel: null,

  /*
    - required
    - examples: 'win32', 'mac', 'linux-i686', 'linux-x86_64'
  */
  os: 'mac',

  /*
    - optional
    - default: 'latest'
    - examples (release channel): '17.0', '3.6', 'latest', 'beta'
    - examples (prerelease channel): 'aurora', 'nightly', 'mozilla-central'
    - examples (tinderbox channel): 'mozilla-central', 'mozilla-inbound'
    - examples (try channel): 'email@something.com-rev'

  What type of available branches vary on the channel.
  */
  branch: '17.0',
  /*
    - optional
    - default: 'en-US'

  Only used in the "release" channel.
  List of languages: http://ftp.mozilla.org/pub/mozilla.org/firefox/releases/latest/linux-x86_64/
  */
  language: 'en-US',

  /*
    - optional
    - default: 'firefox'
    - examples: 'firefox', 'b2g'
  
  Gecko product... Only tested with firefox and b2g-desktop (b2g)
  */
  product: 'firefox',

};

locate(options, function(err, url) {
  url; // => http url to the build
});
```

## CLI Usage

```sh
# get latest firefox
mozilla-get-url --os mac

# get latest b2g-desktop from mozilla central
mozilla-get-url --channel tinderbox --os mac --branch mozilla-central --product b2g
```
