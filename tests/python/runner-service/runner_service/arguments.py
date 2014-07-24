# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from argparse import ArgumentParser

class GaiaIntegrationParser(ArgumentParser):
    """Usage: %prog [args]"""

    args = [
        [["--buildapp"],
        { "dest": "buildapp",
          "choices": ["emulator", "device", "desktop"],
          "default": "desktop",
          "help": "The type of build to run gaia-integration tests on.",
        }],
        [["--manifest"],
        { "dest": "manifest",
          "default": None,
          "help": "Path to a test manifest to use."
        }],
        [["--b2gpath"],
        { "dest": "b2g_home",
          "default": None,
          "help": "Path to b2g directory."
        }],
    ]

    def __init__(self, *args, **kwargs):
        ArgumentParser.__init__(self, *args, **kwargs)

        for arg, value in self.args:
            self.add_argument(*arg, **value)

    def parse_args(self, *args, **kwargs):
        args = ArgumentParser.parse_args(self, *args, **kwargs)

        if args.b2g_home and args.buildapp == 'desktop':
            self.error("Can only specify --b2gpath with a device or emulator buildapp.")

        if not args.b2g_home and args.buildapp == 'emulator':
            self.error("Must specify --b2gpath with a %s buildapp." % args.buildapp)

        return args

