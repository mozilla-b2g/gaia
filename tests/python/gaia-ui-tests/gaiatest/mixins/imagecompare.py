# This Source Code Form is subject to the terms of the Mozilla Public
#  License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


class GaiaImageCompareArguments(object):
    name = 'Gaia Image Compare'
    args = [
        [['--store-reference-image'],
         {'action': 'store_true',
          'default': False,
          'help': 'Store the captured screenshots as reference images',
          }],
        [['--fuzz-factor'],
         {'type': int,
          'default': 15,
          'metavar': int,
          'help': 'fuzz value supplied to ImageMagick call, in percentage. Default value is %(default)s percent.',
          }],
        [['--reference-path'],
         {'default': 'reference_images',
          'help': 'Location of reference images, relative to the current location, Default folder is %(default)s',
          }],
        [['--screenshots-path'],
         {'default': 'screenshots',
          'help': 'Path of screenshot images, relative to the current location, Default folder is %(default)s',
          }]
    ]

    # verify_usage
    def verify_usage_handler(self, args):
        if not 0 <= args.fuzz_factor <= 100:
            raise ValueError('fuzz_factor must be between 0 and 100')
