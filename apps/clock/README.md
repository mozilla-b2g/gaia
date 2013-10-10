# Clock

## Build Notes ##

The Clock app takes advantage of some features in the gaia build system to do
some optimizations:

* Apps can define an app-specific Makefile in their directory. This is run
  before the rest of the general Gaia build steps. Email uses this to create
  a directory in `gaia/build_stage/clock` and runs some optimizations around
  JS and CSS concatenation.
* The Gaia build system knows to use `gaia/build_stage/clock` to do the rest of
  the Gaia build steps because Clock specifies the "dir" in the
  `gaia_build.json` in this directory.
* Since the shared resources referenced by Clock are not listed in the HTML,
  but as CSS @imports or via JS module dependencies, the Clock Makefile
  runs `clock/build/make_gaia_shared.js` to generate a `gaia_shared.json` file
  in the `gaia/build_stage/clock` directory to list out the shared items use by
  the clock app. `gaia_shared.json` is used by the general Gaia build system to
  know what shared resources to keep. The Gaia build system also does HTML file
  scanning to find shared resources too.

For DEBUG=1 builds, the clock source directory is used as-is, and the shared
resources are magically linked in via the Gaia build system.

If you want to give snapshots of builds, say for UX reviews, you should use
the contents of the `gaia/build_stage/clock` directory as it will be a fully
functional snapshot.
