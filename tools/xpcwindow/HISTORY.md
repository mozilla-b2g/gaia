# 0.4.4
 - process.nextTick to keep mocha test-stacks under control.

# 0.4.2
  - Silent installer

# 0.4.0
  - built in mkdirp module
  - fs.stat, fs.mkdirSync, fs.rmdirSync

# 0.3.0
  - module system based on nodejs allowing xpcwindow
    to run a much greater verity of nodejs scripts.

  - built in xpcwindow-mocha test runner. Using un-modified mocha ~1.0
    browser code with cli options. Base mocha-bin can be used to wrap
    different versions of mocha if the bundled one is out of date.

  - window.xpcArgv is now compatible with the nodejs style argv.
    ['/../xpcwindow', 'file_your_executing', 'etc...']

  - built in modules from node: path, event, process

  - basic fs module: fs.readFileSync, fs.writeFileSync, fs.unlinkSync

  - error handling when requring/importing files.
  - directly bundling debug module until npm will run
  - bundlded xpcshell installer code use xpcwindow --install-xulrunner

# 0.2.0
  - Change to use real TCP socket api and use real one when available.

# 0.1.0
  - Adding stack formatter (window.xpcError).
