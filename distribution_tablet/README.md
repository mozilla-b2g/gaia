`distribution_tablet` is the default customization folder for tablet version.
Developers can create their own tablet distributions based on this folder.

To build Gaia for tablet, just change the current path to the main gaia folder, then pass the following parameters into the build script:

    GAIA_DISTRIBUTION_DIR=distribution_tablet make

`GAIA_DISTRIBUTION_DIR` is used to specify the target customization folder.

Please refer to the [Market customizations guide](https://developer.mozilla.org/en-US/Firefox_OS/Developing_Firefox_OS/Market_customizations_guide) to understand how customization works.
