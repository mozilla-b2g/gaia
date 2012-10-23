import os
from setuptools import setup, find_packages
import shutil

version = '0.2'

# get documentation from the README
try:
    here = os.path.dirname(os.path.abspath(__file__))
    description = file(os.path.join(here, 'README.md')).read()
except (OSError, IOError):
    description = ''

# dependencies
deps = ['marionette_client']

# copy atoms directory over
setupdir = os.path.dirname(__file__)
jsdir = os.path.join(setupdir, os.pardir, 'atoms')
pythondir = os.path.join(setupdir, 'gaiatest', 'atoms')

if (os.path.isdir(pythondir)):
    shutil.rmtree(pythondir);

shutil.copytree(jsdir, os.path.join('gaiatest', 'atoms'))

setup(name='gaiatest',
      version=version,
      description="Marionette test automation client for Gaia",
      long_description=description,
      classifiers=[], # Get strings from http://pypi.python.org/pypi?%3Aaction=list_classifiers
      keywords='mozilla',
      author='Jonathan Griffin',
      author_email='jgriffin@mozilla.com',
      url='https://developer.mozilla.org/en-US/docs/Marionette',
      license='MPL',
      packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
      package_data={'gaiatest': ['atoms/*.js']},
      include_package_data=True,
      zip_safe=False,
      entry_points="""
      # -*- Entry points: -*-
      [console_scripts]
      gaiatest = gaiatest.runtests:main
      """,
      install_requires=deps,
      )
