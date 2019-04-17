# Change Log for nsrestlet

## 2.0.0  (WIP, not in NPM yet)
### Updated the `oauth-1.0a` module from version `1.0.1` to version `2.2.5`.
This required a breaking change, as `crypto` is no longer built in to oauth-1.0a and is instead supplied
by Node.JS (which is better for security).  In rare situations, Node.JS may be built without `crypto`,
causing the module not to work.  In these situations, I'll suggest to people that they use the earlier
versions (I don't want to be the judge on whether a 3rd party cryptography module is secure).
### Fixed a bug in the backoff.
There was a bug in the backoff that might have prevented the backoff from being implemented appropriately.
It's now fixed.
### Removed the `contentType` option from URL Settings
It turns out that Netsuite doesn't care too much about what `contentType` you request.  It all depends on
what you return in the restlet.  If you return an object, it returns straight JSON, if you return a string,
it will return text.  I'm not sure if this is new behavior or if it's always been this way and I just didn't
realize it.  It will throw an error if you ask for `text/html` and you return a JS object, but besides that,
it doesn't make a difference at all.  So `contentType` option is useless, and might as well be removed
### Can now return JSON with `GET`
Originally, the module always returned a request from GET as a string, regardless of whether it was returned
in the restlet as a JS object or a string.  This is because Netsuite always sent it back as a string.  The
new version of the module will now return strings as strings and JSON as JSON.  I felt this was more consistent
and so it'd be a good change.  DELETE doesn't return anything, as per usual.
### Coverage and Testing
This is a bit of a work in progress.  I'm trying to integrate the module into Travis-CI and Coveralls.  That
will help it appear a bit higher in the npm search, and also give you guys a bit more confidence about the
testing.  I found a few bugs in implementing it, so it seems to work great!
## Added a Webpage
This is expected for npm packages, so I just did something simple.  I'll make it more nice looking later.
It feels kinda unnecessary though.
## Added a Development file
I wanted to make it easier for other people to contribute to the library, if they wanted to.
There's a lot of steps, this file helps streamline them so they can get it going pretty easily.

## 1.0.1
### Updated the Readme.
Just spelling changes.  No code changes.

## 1.0.0
### The Initial Commit.


# Upcoming Changes (haven't happened yet)
## Considering moving off of the request() module
See [this](https://github.com/request/request/issues/3142).  While it might be completely fine, I'm
a bit worried that they are letting contributors automatically commit.  That could be easily abused
if it gets in the wrong hands.  I'll either wait a bit and see if it remains safe, or change to a
similar module in the future.
## Cleaning Up The Documentation
While the doucmentation is very detailed, it's also a bit of a mess.  Honestly, I'd like it to
be 'so simple you can't get it wrong'.  This means I need to add pictures, and organize it so
it's really easy to get set up.  Maybe a Youtube video?