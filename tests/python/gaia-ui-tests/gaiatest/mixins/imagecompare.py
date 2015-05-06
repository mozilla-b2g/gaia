# This Source Code Form is subject to the terms of the Mozilla Public
#  License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


class GaiaImageCompareOptionsMixin(object):

    # verify_usage
    def check_fuzz_factor(self, options, test):
        if not 0 <= options.fuzz_factor <= 100:
            raise ValueError('fuzz_factor must be between 0 and 100')

    # Inheriting object must call this __init__ to set up option handling
    def __init__(self, **kwargs):
        group = self.add_option_group('imagecompare')

        group.add_option('--store-reference-image',
                         action='store_true',
                         default=False,
                         help='Store the captured screenshots as reference images')

        group.add_option('--fuzz-factor',
                         type='int',
                         default=10,
                         metavar='int',
                         help='fuzz value supplied to ImageMagick call, in percentage. '
                              'Default value is %default percent.')

        group.add_option("--reference-path",
                         default="reference_images",
                         help="Location of reference images, relative to the current location, "
                              "Default folder is %default")

        group.add_option('--screenshots-path',
                         default="screenshots",
                         help="Path for screenshot images, relative to t he current location, "
                              "Default folder is %default")

        self.verify_usage_handlers.append(self.check_fuzz_factor)
