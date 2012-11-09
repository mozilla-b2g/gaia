#!/usr/bin/env python

import sys, os
import json
import re
from optparse import OptionParser
import codecs

class FileNotFoundException(Exception): pass
class InvalidMarkupException(Exception): pass

property_line = re.compile('(?P<id>.*)=(?P<value>.*)')
import_line = re.compile('@import url\((?P<filename>.*)\)')
section_line = re.compile('\[(?P<section>.*)\]')
find_locales_link = re.compile('<link .* type="application/l10n".*>', re.M)
find_href = re.compile('href="(?P<href>.*)"')

def resolve_file(filename, approot, path_dirs=[]):
    lpath_dirs = path_dirs[:]
    lfilename = filename[:]
    lpath_dirs.insert(0, os.getcwd())
    if lfilename.startswith('/') and approot:
        path_dirs.insert(0, approot)
        # for whatever reason, lstrip wasn't working.  Ugly hack!
        while lfilename.startswith('/'): lfilename = lfilename[1:]
    for path in lpath_dirs:
        if os.path.exists('%s/%s' % (path, lfilename)):
            #print "%s --> %s" % (filename, os.path.abspath('%s/%s' % (path, lfilename)))
            return os.path.abspath('%s/%s' % (path, lfilename))
    raise FileNotFoundException("There is no file '%s' found in any of %s" % (filename, path_dirs))


def resolve_files(files, approot, path=[]):
    return [resolve_file(x, approot, path) for x in files]


def convert_property_file(filename):
    with open(filename) as f:
        data = f.readlines()
    end_result = {}
    for line in data:
        m = property_line.search(line)
        if not m or line.strip().startswith('#'):
            continue
        if '.' in m.group('id'):
            key, subkey = m.group('id').split('.',1)
        else:
            subkey = 'textContent'
            key = m.group('id')
        if not end_result.has_key(key):
            end_result[key.strip()] = {}
        end_result[key.strip()].update({subkey: m.group('value')})
    return end_result


def find_ini_files(filename, approot, shared_path=[]):
    ini_files = []
    with open(filename, 'rb') as f:
        contents = f.read()
    all_matches = find_locales_link.findall(contents)
    for match in all_matches:
        m = find_href.search(match)
        if not m:
            raise InvalidMarkupException("Could not find the href in the following tag: %s" % match)
        ini_files.append(m.group('href'))
    return resolve_files(ini_files, shared_path, approot)


def parse_ini_file(filename, default_section='en-US'):
    with open(filename, 'rb') as f:
        data = f.readlines()
    section = default_section
    imports = { section: [] }
    for line in data:
        if line.strip() == "" or line.startswith('!') or line.startswith('#'):
            continue
        elif line.strip().startswith('['): # Section header
            section = section_line.search(line).group('section')
            imports[section] = imports[default_section][:]
        elif '@import' in line: # Import lines
            import_file = import_line.search(line).group('filename')
            property_file = '%s/%s' % (filename.rstrip('/').rsplit('/',1)[0], import_file)
            imports[section].append(os.path.abspath(property_file))
    return imports


def read_strings_for_locale(locale, property_files, shared_path=[]):
    strings = {}
    for property_file in property_files:
        strings.update(convert_property_file(property_file))
    return strings


def read_strings(filename, approot, shared_path=[]):
    ini_files = find_ini_files(filename, shared_path, approot)
    ini_imports = [parse_ini_file(x) for x in ini_files]
    property_files = {}
    for ini_file in ini_imports:
       for locale in ini_file.keys():
           if not property_files.has_key(locale):
               property_files[locale] = []
           property_files[locale].extend(ini_file[locale])
    strings = {}
    for locale in property_files.keys():
        strings[locale] = read_strings_for_locale(locale, property_files[locale], shared_path)
    return strings


# Take a dictionary of locales and their strings and create a comment tag
def create_comment(strings, locale, tag="script"):
    tags = { 'json-blob': r'  <script type="text/l10n" data-l10n-strings="%s">%s</script>',
             'script': r'  <script type="application/javascript">var gProcessedL10nData={"%s":%s}</script>',
             'span':   r'  <span style="display: none" data-l10n-strings="%s"><!--%s-->'
           }
    return tags[tag] % (locale, json.dumps(strings, ensure_ascii=False))


def create_markup(infile, outfile, chunk, toreplace="</head>", where="before"):
    # Take the infile, insert the chunk where toreplace is then write to outfile
    with open(infile, 'rb') as i, open(outfile, 'wb+') as o:
        data=i.readline()
        while not data == "":
            if toreplace in data:
                if where == "before":
                    replacement = '%s\n%s' % (chunk, toreplace)
                elif where == "after":
                    replacement = '%s\n%s' % (toreplace, chunk)
                else:
                    raise Exception("You asked for a where that doesn't make sense %s" % where)
                data = data.replace(toreplace, replacement)
            o.write(data)
            data=i.readline()


def main():
    parser = OptionParser("%prog - turn properties into special sauce")
    parser.add_option("-o", "--output", help="File to write output", action="store", dest="output")
    parser.add_option("--shared-path", help="path to shared property files", action="append", dest="sharepath")
    parser.add_option("--tag", action="store", help="one of span, script to use",
                      default="script", dest="tag")
    # For apps (like the current calendar app) which use absolute lookups for HREFs, we want to be able to know
    # where to look up files.  Basically, this translates to e.g. apps/calendar/
    parser.add_option("--app-root", help="The directory that is the root of the webapp, used for absolute hrefs",
                      action="store", dest="approot", default=None)
    options, args = parser.parse_args()
    if len(args) != 1:
        parser.print_help()
        parser.exit(1)
    if not options.output:
        parser.print_help()
        parser.exit(1)
    if options.tag not in ('script', 'span'):
        parser.print_help()
        parser.exit(1)


    # Build the dictionary of L10N strings
    strings = read_strings(args[0], os.path.abspath(options.approot), shared_path=[os.path.abspath(x) for x in options.sharepath])
    for locale in strings.keys():
        comment = create_comment(strings[locale], locale, options.tag)
        create_markup(args[0], args[0] + '.' + locale, comment)


if __name__ == "__main__":
    main()
