
# Options to add: post2dot0, ref_image, fuzz_factor
class ImageCompareOptionsMixin(object):

    # verify_usage
    def endurance_verify_usage(self, options, tests):
            if options.fuzzfactor < 0  or options.fuzzfactor > 100:
                raise ValueError('fuzz_factor must be between 0 and 100')
            if not options.ref_loc:
                raise ValueError('reference image folder must be defined')
            if not options.shot_loc:
                raise ValueError('shot image folder must be defined')

    # Inheriting object must call this __init__ to set up option handling
    def __init__(self, **kwargs):
        group = self.add_option_group('imagecompare')

        group.add_option('--post2dot0',
                              action='store_true',
                              dest='post2dot0',
                              default=True,
                              metavar='boolean',
                              help='B2G build is 2.1 or above')

        group.add_option('--ref_image',
                              action='store_true',
                              dest='refimage',
                              default=False,
                              metavar='boolean',
                              help='save the captured shots as reference image')

        group.add_option('--fuzz_factor',
                              action='store',
                              dest='fuzzfactor',
                              type='int',
                              default=5,
                              metavar='int',
                              help='fuzz value supplied to ImageMagick call, in percentage')

        group.add_option('--r_loc',
                              action='store',
                              dest='ref_loc',
                              type='string',
                              default="refimages",
                              metavar='string',
                              help='Location of reference images, relative to the current location')

        group.add_option('--s_loc',
                              action='store',
                              dest='shot_loc',
                              type='string',
                              default="shots",
                              help='Location of screenshot images, relative to the current location')

        self.verify_usage_handlers.append(self.endurance_verify_usage)


class ImageCompareTestCaseMixin(object):

    def __init__(self, *args, **kwargs):
        self.post2dot0 = kwargs.pop('post2dot0') or True
        self.collect_ref_images = kwargs.pop('refimage') or False
        self.fuzz_factor = kwargs.pop('fuzzfactor')
        self.ref_dir = kwargs.pop('ref_loc')
        self.shots_dir = kwargs.pop('shot_loc')
