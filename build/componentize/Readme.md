# Push all Styles to a repositoty that can be used by Bower

## Global Dependencies

* git
* node.js
* npm 
* Grunt Version 4, global install via grunt-cli
* Bower for a test

## Setup 

```
npm install grunt-cli -g
cd build/componentize/
npm install
```

## grunt

The Gruntfile works as follows

* create a folder /tmp/build
* checkout the target repo that can be used by the bower users 
* copy all files to build
* push to the targetRepo


 
