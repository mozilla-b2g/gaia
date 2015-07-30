# 0.0.6
  - fix bug in how the parent was determined. Full descriptions should
now be correct in failure cases.

# 0.0.5
  - fix bugs in error reporting from including Mocha.reporters.Base (regressions)

# 0.0.4
  - inherit from Mocha.reporters.Base

# 0.0.3
  - fix bug where lack of present main module path this module could not
    be resolved via require.resolve.

# 0.0.2
  - fix minor inconsistency with mocha

# 0.0.1
  - initial release with proxy support for most reporters.
