#!/bin/sh

###############################################################################
# Compress SVG files using svgo (https://github.com/svg/svgo)
#
# The following svgo plugins are disabled:
# * convertPathData
#     Though the resulting files are OK in any browsers, they're rendered in a
#     weird way on Ubuntu files explorer.
# * mergePaths
#     Can result on wrong odd/even filling if some paths are overlapping.

###############################################################################
# Option variables

opt_help=no
opt_paths=""

###############################################################################
# Print the help message

print_help() {
    printf "Usage: `basename $0` [OPTION...] [PATH...]
Recompresses SVG files using 'svgo' tools.

Help options:
  -h, --help            Show this help message
"
}

suggest_help() {
    printf "Try \``basename $0` --help' for more information\n"
}

###############################################################################
# Parse the program arguments

parse_args() {
    # Set the options variables depending on the passed arguments
    while [ $# -gt 0 ]; do
       if [ `expr "$1" : "^-"` -eq 1 ]; then
           if [ $1 = "-h" ] || [ $1 = "--help" ]; then
                opt_help=yes
                shift 1
           else
                printf "error: Unknown option $1\n"
                exit 1
           fi
       else
            # No more arguments, the following parameters will be paths
            break
       fi
    done

    if [ $# -eq 0 ] && [ $opt_help != yes ]; then
        printf "error: no files specified\n"
        suggest_help
        exit 1
    fi

    # Gather all the paths
    while [ $# -gt 0 ]; do
        opt_paths="$opt_paths$1\n"
        shift
    done
}

###############################################################################
# Check for program

check_program() {
    which svgo 1>/dev/null 2>/dev/null

    if [ $? -ne 0 ]; then
        printf "error: svgo not found\n"
        exit 1;
    fi
}

###############################################################################
# Main script

parse_args "$@"
check_program

if [ $opt_help = yes ] || [ $# -eq 0 ]; then
    print_help
    exit 0
fi

# Process all the specified paths
while [ $# -gt 0 ]; do
    svgo --disable=convertPathData --disable=mergePaths --multipass --folder="$1"
    shift
done
