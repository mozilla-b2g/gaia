// Global includes
#include <node.h>
#include <node_buffer.h>

// Platform dependent includes.
#include <errno.h>
#include <unistd.h>
#include <string.h>

#include <sys/ioctl.h>
#include <sys/socket.h>
#include <sys/types.h>

#include <arpa/inet.h>
#include <netdb.h>

// Local includes
#include "sockit.h"

// So we don't spend half the time typing 'v8::'
using namespace v8;

// Clever constants
static const int    MAX_LOOKUP_RETRIES = 3;

Sockit::Sockit() : mSocket(0) {

}

Sockit::~Sockit() {
  // Close our socket if it's still open.
  if(mSocket != 0) {
    // XXXAus: We should probably report error on close.
    close(mSocket);
  }
}

/*static*/ void
Sockit::Init(Handle<Object> aExports) {
  Local<FunctionTemplate> object = FunctionTemplate::New(New);
  // Set the classname our object will have in JavaScript land.
  object->SetClassName(String::NewSymbol("Sockit"));

  // Reserve space for our object instance.
  object->InstanceTemplate()->SetInternalFieldCount(1);

  // Add the 'Connect' function.
  object->PrototypeTemplate()->Set(
    String::NewSymbol("connect"),
    FunctionTemplate::New(Connect)->GetFunction()
  );

  // Add the 'Read' function.
  object->PrototypeTemplate()->Set(
    String::NewSymbol("read"),
    FunctionTemplate::New(Read)->GetFunction()
  );

  // Add the 'Write' function.
  object->PrototypeTemplate()->Set(
    String::NewSymbol("write"),
    FunctionTemplate::New(Write)->GetFunction()
  );

  // Add the 'Close' function.
  object->PrototypeTemplate()->Set(
    String::NewSymbol("close"),
    FunctionTemplate::New(Close)->GetFunction()
  );

  // Add the constructor.
  Persistent<Function> constructor =
    Persistent<Function>::New(object->GetFunction());
  aExports->Set(String::NewSymbol("Sockit"), constructor);
}

/*static*/ Handle<Value>
Sockit::New(const Arguments& aArgs) {
  HandleScope scope;

  Sockit* sockit = new Sockit();
  sockit->Wrap(aArgs.This());

  return aArgs.This();
}

/*static*/ Handle<Value>
Sockit::Connect(const Arguments& aArgs) {
  HandleScope scope;

  if(aArgs.Length() < 1) {
    return ThrowException(
      Exception::Error(String::New("Not enough arguments."))
    );
  }

  if(aArgs.Length() > 1) {
    return ThrowException(
      Exception::Error(String::New("Too many arguments."))
    );
  }

  if(!aArgs[0]->IsObject()) {
    return ThrowException(
      Exception::Error(String::New("Invalid argument. Must be an Object."))
    );
  }

  Local<Object> options = aArgs[0]->ToObject();

  Local<String> hostKey = String::New("host");
  Local<String> portKey = String::New("port");

  if(!options->Has(hostKey) ||
     !options->Get(hostKey)->IsString()) {
    return ThrowException(
      Exception::Error(
        String::New("Object must have 'host' field and it must be a string.")
      )
    );
  }

  if(!options->Has(portKey) ||
     !options->Get(portKey)->IsNumber()) {
    return ThrowException(
      Exception::Error(
        String::New("Object must have 'port' field and it must be a number.")
      )
    );
  }

  // XXXAus: Move the DNS piece into it's own method.

  String::Utf8Value optionsHost(options->Get(hostKey)->ToString());

  bool shouldRetry = false;
  int  retryCount = 0;
  struct hostent *hostEntry;

  do {
    hostEntry = gethostbyname(*optionsHost);

    // Getting the host address failed. Let's see why.
    if(hostEntry == NULL) {
      // Check h_errno, we might retry if the error indicates we should.
      switch(h_errno) {
        case HOST_NOT_FOUND:
          return ThrowException(
            Exception::Error(String::New("Couldn't resolve host."))
          );
        break;

        case NO_RECOVERY:
          return ThrowException(
            Exception::Error(String::New("Unexpected failure during host lookup."))
          );
        break;

        case NO_DATA:
          return ThrowException(
            Exception::Error(String::New("Host exists but has no address."))
          );
        break;

        case TRY_AGAIN:
          shouldRetry = true;
          retryCount++;
        break;
      }
    }
  }
  while(shouldRetry && retryCount <= MAX_LOOKUP_RETRIES);

  if(hostEntry == NULL) {
    return ThrowException(
      Exception::Error(String::New("Couldn't resolve host even after retries."))
    );
  }

  int socketHandle = socket(PF_INET, SOCK_STREAM, IPPROTO_TCP);
  if(socketHandle < 0) {
    return ThrowException(
      Exception::Error(String::New("Failed to create socket."))
    );
  }

  Sockit *sockit = ObjectWrap::Unwrap<Sockit>(aArgs.This());
  sockit->mSocket = socketHandle;

  // Magic socket incantation.
  struct sockaddr_in address;
  memset(&address, 0, sizeof(address));
  address.sin_family = AF_INET;
  // Always use first address returned, it's good enough for our purposes.
  address.sin_addr.s_addr =
      inet_addr(inet_ntoa(*(struct in_addr *)hostEntry->h_addr_list[0]));
  // Using static cast here to enforce short as required by IPv4 functions.
  address.sin_port =
      htons(static_cast<short>(options->Get(portKey)->ToNumber()->Uint32Value()));

  if(connect(
       sockit->mSocket, (sockaddr *) &address, sizeof(struct sockaddr)
     ) < 0) {
    // We failed to connect. Close to socket we created.
    close(sockit->mSocket);
    // In case there's another connect attempt, clean up the socket data.
    sockit->mSocket = 0;
    // Report failure to connect.
    return ThrowException(Exception::Error(String::New("Failed to connect.")));
  }

  return aArgs.This();
}

/*static*/ Handle<Value>
Sockit::Read(const Arguments& aArgs) {
  HandleScope scope;

  if(aArgs.Length() != 1) {
    return ThrowException(
      Exception::Error(
        String::New("Not enough arguments, read takes the number of bytes to be read from the socket.")
      )
    );
  }

  if(!aArgs[0]->IsNumber()) {
    return ThrowException(
      Exception::Error(String::New("Argument must be a Number."))
    );
  }

  Sockit *sockit = ObjectWrap::Unwrap<Sockit>(aArgs.This());

  // Make sure we're connected to something.
  if(sockit->mSocket == 0) {
    return ThrowException(
      Exception::Error(
        String::New("Not connected. To read data you must call connect first.")
      )
    );
  }

  // Figure out how many bytes the user wants us to read from the socket.
  unsigned int bytesToRead = aArgs[0]->ToNumber()->Uint32Value();
  // Allocate a shiny buffer.
  char *buffer = new char[bytesToRead];
  // Track how many bytes we've read and total bytes read.
  int totalBytesRead = 0;
  int bytesRead = 0;
  // Read me some tasty bytes!
  do {
    bytesRead = recv(sockit->mSocket, &buffer[totalBytesRead], bytesToRead, 0);

    if(bytesRead < 0) {
      ThrowException(
          Exception::Error(String::New("Error while reading from socket!"))
      );
    }

    bytesToRead -= bytesRead;
    totalBytesRead += bytesRead;

    bytesRead = 0;
  }
  while(bytesToRead > 0);

  // Create a node heap allocated buffer first.
  node::Buffer *heapBuffer = node::Buffer::New(totalBytesRead);
  // Copy our temporary buffer data into the heap buffer.
  memcpy(node::Buffer::Data(heapBuffer), buffer, totalBytesRead);

  // Done with our temporary buffer.
  delete buffer;

  // Now we construct an actual 'Buffer' node.js object.
  // First we need the global context object.
  Local<Object> globalContext = Context::GetCurrent()->Global();
  // Now we get the constructor function for the 'Buffer' object.
  Local<Function> jsBufferConstructor =
      Local<Function>::Cast(globalContext->Get(String::NewSymbol("Buffer")));
  // Create the arguments array to call the 'Buffer' constructor.
  Handle<Value> jsBufferConstructorArgs[3] =
    { heapBuffer->handle_, Integer::New(totalBytesRead), Integer::New(0) };
  // Call the 'Buffer' constructor, finally!
  Local<Object> jsBuffer =
      jsBufferConstructor->NewInstance(3, jsBufferConstructorArgs);

  // Return those tasty bytes!
  return scope.Close(jsBuffer);
}

/*static*/ Handle<Value>
Sockit::Write(const Arguments& aArgs) {
  HandleScope scope;

  if(aArgs.Length() < 1) {
    return ThrowException(
      Exception::Error(String::New("Not enough arguments."))
    );
  }

  if(aArgs.Length() > 1) {
    return ThrowException(
      Exception::Error(String::New("Too many arguments."))
    );
  }

  Sockit *sockit = ObjectWrap::Unwrap<Sockit>(aArgs.This());

  // Make sure we're connected to something.
  if(sockit->mSocket == 0) {
    return ThrowException(
      Exception::Error(
        String::New("Not connected. To write data you must call connect first.")
      )
    );
  }

  int success = 0;

  if(aArgs[0]->IsString()) {
    // Convert to utf8 value before sending.
    Local<String> dataString = aArgs[0]->ToString();
    String::Utf8Value data(dataString);
    // Write the data to the socket.
    success = sockit->Write(*data, dataString->Utf8Length());
  }
  else if(aArgs[0]->IsObject() &&
          aArgs[0]->ToObject()->GetConstructorName()->Equals(String::NewSymbol("Buffer"))) {
    Local<Object> buffer = aArgs[0]->ToObject();
    success =
        sockit->Write(node::Buffer::Data(buffer), node::Buffer::Length(buffer));
  }
  else {
    return ThrowException(
      Exception::Error(
        String::New("Invalid argument, must be a 'String' or 'Buffer' object.")
      )
    );
  }

  if(success < 0) {
    return scope.Close(String::New("Unable to write data to socket."));
  }

  return aArgs.This();
}

int
Sockit::Write(const char *aBuffer, const int aLength) {

  int bytesToWrite = aLength;
  int totalBytesWritten = 0;
  int bytesWritten = 0;

  do {
    bytesWritten =
        send(mSocket,
             aBuffer + (totalBytesWritten * sizeof(char)),
             bytesToWrite,
             0
            );

    if(bytesWritten < 0) {
      return -1;
    }

    totalBytesWritten += bytesWritten;
    bytesToWrite -= bytesWritten;

    bytesWritten = 0;
  }
  while(bytesToWrite > 0);

  return totalBytesWritten;
}

/*static*/ Handle<Value>
Sockit::Close(const Arguments& aArgs) {
  HandleScope scope;

  Sockit *sockit = ObjectWrap::Unwrap<Sockit>(aArgs.This());
  if(sockit->mSocket != 0) {
    // If close fails we have bigger problems on our hands than a stale
    // socket that isn't closed.
    close(sockit->mSocket);
  }

  sockit->mSocket = 0;

  return aArgs.This();
}
