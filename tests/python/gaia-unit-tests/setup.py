import os
from setuptools import setup, find_packages

version = '0.2'

# get documentation from the README
try:
    here = os.path.dirname(os.path.abspath(__file__))
    description = file(os.path.join(here, 'README.md')).read()
except (OSError, IOError):
    description = ''

# dependencies
deps = ['tornado >= 2.4.1', 'mozlog >= 1.1', 'mozrunner >= 5.15']

setup(name='gaia_unit_test',
      version=version,
      description="Python testrunner for Gaia unit tests",
      long_description=description,
      classifiers=[],  # Get strings from http://pypi.python.org/pypi?%3Aaction=list_classifiers
      keywords='mozilla',
      author='Mozilla',
      url='https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Platform/Testing/Gaia_unit_tests',
      license='MPL',
      packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
      zip_safe=False,
      install_requires=deps,
      )
