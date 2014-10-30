#include <stdlib.h>
#include "v8.h"
#include "node.h"

#ifdef _WIN32
  #define __alignof__ __alignof
#endif

using namespace v8;
using namespace node;

namespace {

typedef struct _test1 {
  int a;
  int b;
  double c;
} test1;

typedef struct _test2 {
  int a;
  double b;
  int c;
} test2;

typedef struct _test3 {
  double a;
  int b;
  int c;
} test3;

typedef struct _test4 {
  double a;
  double b;
  int c;
} test4;

typedef struct _test5 {
  int a;
  double b;
  double c;
} test5;

typedef struct _test6 {
  char a;
  short b;
  int c;
} test6;

typedef struct _test7 {
  int a;
  short b;
  char c;
} test7;

typedef struct _test8 {
  int a;
  short b;
  char c;
  char d;
} test8;

typedef struct _test9 {
  int a;
  short b;
  char c;
  char d;
  char e;
} test9;

typedef struct _test10 {
  test1 a;
  char b;
} test10;

// this one simulates the `ffi_type` struct
typedef struct _test11 {
  size_t a;
  unsigned short b;
  unsigned short c;
  struct _test11 **d;
} test11;

typedef struct _test12 {
  char *a;
  int b;
} test12;

typedef struct _test13 {
  char a;
  char b[2];
} test13;

typedef struct _test14 {
  char a;
  char b[2];
  short c;
  char d;
} test14;

typedef struct _test15 {
  test1 a;
  test1 b;
} test15;

typedef struct _test16 {
  double a[10];
  char b[3];
  int c[6];
} test16;

typedef struct _test17 {
  char a[3];
} test17;

typedef struct _test18 {
  test17 a[100];
} test18;

/* test19 example is from libdespotify
 * See: https://github.com/TooTallNate/ref-struct/issues/1
 */

#define STRING_LENGTH 256
typedef struct _test19 {
  bool has_meta_data;
  bool playable;
  bool geo_restricted;
  unsigned char track_id[33];
  unsigned char file_id[41];
  unsigned int file_bitrate;
  unsigned char album_id[33];
  unsigned char cover_id[41];
  unsigned char *key;

  char *allowed;
  char *forbidden;

  char title[STRING_LENGTH];
  struct artist* artist;
  char album[STRING_LENGTH];
  int length;
  int tracknumber;
  int year;
  float popularity;
  struct _test19 *next; /* in case of multiple tracks
                          in an album or playlist struct */
} test19;

void Initialize(Handle<Object> target) {
  HandleScope scope;

  target->Set(String::NewSymbol("test1 sizeof"), Number::New(sizeof(test1)));
  target->Set(String::NewSymbol("test1 alignof"), Number::New(__alignof__(test1)));
  target->Set(String::NewSymbol("test1 offsetof a"), Number::New(offsetof(test1, a)));
  target->Set(String::NewSymbol("test1 offsetof b"), Number::New(offsetof(test1, b)));
  target->Set(String::NewSymbol("test1 offsetof c"), Number::New(offsetof(test1, c)));

  target->Set(String::NewSymbol("test2 sizeof"), Number::New(sizeof(test2)));
  target->Set(String::NewSymbol("test2 alignof"), Number::New(__alignof__(test2)));
  target->Set(String::NewSymbol("test2 offsetof a"), Number::New(offsetof(test2, a)));
  target->Set(String::NewSymbol("test2 offsetof b"), Number::New(offsetof(test2, b)));
  target->Set(String::NewSymbol("test2 offsetof c"), Number::New(offsetof(test2, c)));

  target->Set(String::NewSymbol("test3 sizeof"), Number::New(sizeof(test3)));
  target->Set(String::NewSymbol("test3 alignof"), Number::New(__alignof__(test3)));
  target->Set(String::NewSymbol("test3 offsetof a"), Number::New(offsetof(test3, a)));
  target->Set(String::NewSymbol("test3 offsetof b"), Number::New(offsetof(test3, b)));
  target->Set(String::NewSymbol("test3 offsetof c"), Number::New(offsetof(test3, c)));

  target->Set(String::NewSymbol("test4 sizeof"), Number::New(sizeof(test4)));
  target->Set(String::NewSymbol("test4 alignof"), Number::New(__alignof__(test4)));
  target->Set(String::NewSymbol("test4 offsetof a"), Number::New(offsetof(test4, a)));
  target->Set(String::NewSymbol("test4 offsetof b"), Number::New(offsetof(test4, b)));
  target->Set(String::NewSymbol("test4 offsetof c"), Number::New(offsetof(test4, c)));

  target->Set(String::NewSymbol("test5 sizeof"), Number::New(sizeof(test5)));
  target->Set(String::NewSymbol("test5 alignof"), Number::New(__alignof__(test5)));
  target->Set(String::NewSymbol("test5 offsetof a"), Number::New(offsetof(test5, a)));
  target->Set(String::NewSymbol("test5 offsetof b"), Number::New(offsetof(test5, b)));
  target->Set(String::NewSymbol("test5 offsetof c"), Number::New(offsetof(test5, c)));

  target->Set(String::NewSymbol("test6 sizeof"), Number::New(sizeof(test6)));
  target->Set(String::NewSymbol("test6 alignof"), Number::New(__alignof__(test6)));
  target->Set(String::NewSymbol("test6 offsetof a"), Number::New(offsetof(test6, a)));
  target->Set(String::NewSymbol("test6 offsetof b"), Number::New(offsetof(test6, b)));
  target->Set(String::NewSymbol("test6 offsetof c"), Number::New(offsetof(test6, c)));

  target->Set(String::NewSymbol("test7 sizeof"), Number::New(sizeof(test7)));
  target->Set(String::NewSymbol("test7 alignof"), Number::New(__alignof__(test7)));
  target->Set(String::NewSymbol("test7 offsetof a"), Number::New(offsetof(test7, a)));
  target->Set(String::NewSymbol("test7 offsetof b"), Number::New(offsetof(test7, b)));
  target->Set(String::NewSymbol("test7 offsetof c"), Number::New(offsetof(test7, c)));

  target->Set(String::NewSymbol("test8 sizeof"), Number::New(sizeof(test8)));
  target->Set(String::NewSymbol("test8 alignof"), Number::New(__alignof__(test8)));
  target->Set(String::NewSymbol("test8 offsetof a"), Number::New(offsetof(test8, a)));
  target->Set(String::NewSymbol("test8 offsetof b"), Number::New(offsetof(test8, b)));
  target->Set(String::NewSymbol("test8 offsetof c"), Number::New(offsetof(test8, c)));
  target->Set(String::NewSymbol("test8 offsetof d"), Number::New(offsetof(test8, d)));

  target->Set(String::NewSymbol("test9 sizeof"), Number::New(sizeof(test9)));
  target->Set(String::NewSymbol("test9 alignof"), Number::New(__alignof__(test9)));
  target->Set(String::NewSymbol("test9 offsetof a"), Number::New(offsetof(test9, a)));
  target->Set(String::NewSymbol("test9 offsetof b"), Number::New(offsetof(test9, b)));
  target->Set(String::NewSymbol("test9 offsetof c"), Number::New(offsetof(test9, c)));
  target->Set(String::NewSymbol("test9 offsetof d"), Number::New(offsetof(test9, d)));
  target->Set(String::NewSymbol("test9 offsetof e"), Number::New(offsetof(test9, e)));

  target->Set(String::NewSymbol("test10 sizeof"), Number::New(sizeof(test10)));
  target->Set(String::NewSymbol("test10 alignof"), Number::New(__alignof__(test10)));
  target->Set(String::NewSymbol("test10 offsetof a"), Number::New(offsetof(test10, a)));
  target->Set(String::NewSymbol("test10 offsetof b"), Number::New(offsetof(test10, b)));

  target->Set(String::NewSymbol("test11 sizeof"), Number::New(sizeof(test11)));
  target->Set(String::NewSymbol("test11 alignof"), Number::New(__alignof__(test11)));
  target->Set(String::NewSymbol("test11 offsetof a"), Number::New(offsetof(test11, a)));
  target->Set(String::NewSymbol("test11 offsetof b"), Number::New(offsetof(test11, b)));
  target->Set(String::NewSymbol("test11 offsetof c"), Number::New(offsetof(test11, c)));
  target->Set(String::NewSymbol("test11 offsetof d"), Number::New(offsetof(test11, d)));

  target->Set(String::NewSymbol("test12 sizeof"), Number::New(sizeof(test12)));
  target->Set(String::NewSymbol("test12 alignof"), Number::New(__alignof__(test12)));
  target->Set(String::NewSymbol("test12 offsetof a"), Number::New(offsetof(test12, a)));
  target->Set(String::NewSymbol("test12 offsetof b"), Number::New(offsetof(test12, b)));

  target->Set(String::NewSymbol("test13 sizeof"), Number::New(sizeof(test13)));
  target->Set(String::NewSymbol("test13 alignof"), Number::New(__alignof__(test13)));
  target->Set(String::NewSymbol("test13 offsetof a"), Number::New(offsetof(test13, a)));
  target->Set(String::NewSymbol("test13 offsetof b"), Number::New(offsetof(test13, b)));

  target->Set(String::NewSymbol("test14 sizeof"), Number::New(sizeof(test14)));
  target->Set(String::NewSymbol("test14 alignof"), Number::New(__alignof__(test14)));
  target->Set(String::NewSymbol("test14 offsetof a"), Number::New(offsetof(test14, a)));
  target->Set(String::NewSymbol("test14 offsetof b"), Number::New(offsetof(test14, b)));
  target->Set(String::NewSymbol("test14 offsetof c"), Number::New(offsetof(test14, c)));
  target->Set(String::NewSymbol("test14 offsetof d"), Number::New(offsetof(test14, d)));

  target->Set(String::NewSymbol("test15 sizeof"), Number::New(sizeof(test15)));
  target->Set(String::NewSymbol("test15 alignof"), Number::New(__alignof__(test15)));
  target->Set(String::NewSymbol("test15 offsetof a"), Number::New(offsetof(test15, a)));
  target->Set(String::NewSymbol("test15 offsetof b"), Number::New(offsetof(test15, b)));

  target->Set(String::NewSymbol("test16 sizeof"), Number::New(sizeof(test16)));
  target->Set(String::NewSymbol("test16 alignof"), Number::New(__alignof__(test16)));
  target->Set(String::NewSymbol("test16 offsetof a"), Number::New(offsetof(test16, a)));
  target->Set(String::NewSymbol("test16 offsetof b"), Number::New(offsetof(test16, b)));
  target->Set(String::NewSymbol("test16 offsetof c"), Number::New(offsetof(test16, c)));

  target->Set(String::NewSymbol("test17 sizeof"), Number::New(sizeof(test17)));
  target->Set(String::NewSymbol("test17 alignof"), Number::New(__alignof__(test17)));
  target->Set(String::NewSymbol("test17 offsetof a"), Number::New(offsetof(test17, a)));

  target->Set(String::NewSymbol("test18 sizeof"), Number::New(sizeof(test18)));
  target->Set(String::NewSymbol("test18 alignof"), Number::New(__alignof__(test18)));
  target->Set(String::NewSymbol("test18 offsetof a"), Number::New(offsetof(test18, a)));

  target->Set(String::NewSymbol("test19 sizeof"), Number::New(sizeof(test19)));
  target->Set(String::NewSymbol("test19 alignof"), Number::New(__alignof__(test19)));
  target->Set(String::NewSymbol("test19 offsetof has_meta_data"), Number::New(offsetof(test19, has_meta_data)));
  target->Set(String::NewSymbol("test19 offsetof playable"), Number::New(offsetof(test19, playable)));
  target->Set(String::NewSymbol("test19 offsetof geo_restricted"), Number::New(offsetof(test19, geo_restricted)));
  target->Set(String::NewSymbol("test19 offsetof track_id"), Number::New(offsetof(test19, track_id)));
  target->Set(String::NewSymbol("test19 offsetof file_id"), Number::New(offsetof(test19, file_id)));
  target->Set(String::NewSymbol("test19 offsetof file_bitrate"), Number::New(offsetof(test19, file_bitrate)));
  target->Set(String::NewSymbol("test19 offsetof album_id"), Number::New(offsetof(test19, album_id)));
  target->Set(String::NewSymbol("test19 offsetof cover_id"), Number::New(offsetof(test19, cover_id)));
  target->Set(String::NewSymbol("test19 offsetof key"), Number::New(offsetof(test19, key)));
  target->Set(String::NewSymbol("test19 offsetof allowed"), Number::New(offsetof(test19, allowed)));
  target->Set(String::NewSymbol("test19 offsetof forbidden"), Number::New(offsetof(test19, forbidden)));
  target->Set(String::NewSymbol("test19 offsetof title"), Number::New(offsetof(test19, title)));
  target->Set(String::NewSymbol("test19 offsetof artist"), Number::New(offsetof(test19, artist)));
  target->Set(String::NewSymbol("test19 offsetof album"), Number::New(offsetof(test19, album)));
  target->Set(String::NewSymbol("test19 offsetof length"), Number::New(offsetof(test19, length)));
  target->Set(String::NewSymbol("test19 offsetof tracknumber"), Number::New(offsetof(test19, tracknumber)));
  target->Set(String::NewSymbol("test19 offsetof year"), Number::New(offsetof(test19, year)));
  target->Set(String::NewSymbol("test19 offsetof popularity"), Number::New(offsetof(test19, popularity)));
  target->Set(String::NewSymbol("test19 offsetof next"), Number::New(offsetof(test19, next)));

}

} // anonymous namespace

NODE_MODULE(struct_tests, Initialize);
