`distribution_lc` is the default customization folder for low memory version.
Developer could create your own distribution based on this folder.

To build Gaia for low memory device, just change current path to main gaia folder, then pass following parameter in build script:

    GAIA_DISTRIBUTION_DIR=distribution_lc make

`GAIA_DISTRIBUTION_DIR` is used to specify target customization folder.

Please refer [Customization](https://wiki.mozilla.org/B2G/MarketCustomizations) document to understand how customization works.
