# NSRestlet

A module which makes connecting to Netsuite RESTlets using OAuth and NLAuth much easier.

## Why NSRestlet?

Connecting to Netsuite RESTlets with external programs can be really hard.
* NLAuth has to deal with password changes and two factor authentication problems (which will soon be required on high-permission accounts)
* OAuth is really hard to set up
* Netsuite errors for debugging NLAuth and OAuth applications are somewhat vauge
* The examples they have on SuiteAnswers don't always seem to work

This module will make your life easier.  It's as easy as:

```javascript

var nsrestlet = require('ns-restlet');

//For OAuth (we can do NLAuth too, see later in documentation):
var accountSettings = {
    accountId: "PUT YOUR ACCOUNT ID HERE",
    tokenKey: "PUT YOUR TOKEN KEY HERE",
    tokenSecret: "PUT YOUR TOKEN SECRET HERE",
    consumerKey: "PUT YOUR CONSUMER KEY HERE",
    consumerSecret: "PUT YOUR CONSUMER SECRET HERE" };
var urlSettings = {url: 'https://ACCOUNTID.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=SCRIPTID&deploy=DEPLOYID'}

//crate a link
var myInvoices = nsRestlet.createLink(accountSettings, urlSettings)
//then call get, post, put, or delete
myInvoices.get({id: '12345'}, function(error, body)
{
    console.log(body);
});

```
That may look a bit intimidating, but trust me, it's not.  [We also have a tutorial on how to set up OAuth with Netsuite](./tutorial.md), which makes things much easier, even if you aren't familiar with OAuth.

## Setting Things Up

Follow these four steps:

1.  [Read this tutorial](./tutorial.md).  It contains instructions on how to set up your Netsuite environment for OAuth or NLAuth.

2.  [Install Node.JS](https://nodejs.org) (if you haven't already).  This module will work with any version as long as it's not too old.

3.  Open the command line and change your directory (using `````cd`````) to your project.

4.  Then run:

```
npm install nsrestlet
```

## Setting Up Account Settings

In order to create a connection to Netsuite, you need to provide some account settings.

For OAuth, the acount settings will look like this:

`````js
//all fields are required
var accountSettings = {
    accountId: "PUT YOUR ACCOUNT ID HERE",
    tokenKey: "PUT YOUR TOKEN KEY HERE",
    tokenSecret: "PUT YOUR TOKEN SECRET HERE",
    consumerKey: "PUT YOUR CONSUMER KEY HERE",
    consumerSecret: "PUT YOUR CONSUMER SECRET HERE" }; 
`````
For NLAuth, the account settings look like this:

`````js
//all fields except role are required
var accountSettings = {
    accountId: "PUT YOUR ACCOUNT ID HERE",
    email: "PUT YOUR EMAIL HERE",
    password: "PUT YOUR PASSWORD HERE",
    role: "PUT YOUR ROLE KEY HERE" };   //optional, but reccomended
`````

## Setting Up URL Settings

You also need to provide some URL settings.  The URL settings can be formatted in one of two ways.

The first is by using a direct URL.  This is listed on the script deployment page in Netsuite as the **EXTERNAL URL** field:

`````js
var urlSettings = { url: "https://12345.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=1&deploy=1 };
`````
The second way is to provide the script id and deployment id (either the string version or number version).  These can be found on the script and script deployment pages in Netsuite in the **ID** field:
`````js
//You can use the string version...
var urlSettings = {
    script: "customscript_test_rlet",
    deployment: "customdeploy_test_rlet"
}

//...or the number version
var urlSettings = {
    script: 142,
    deployment: 1
}
`````
There are three additional optional fields.  You can set the `````content-type````` of the request by giving your url settings a `````contentType````` field.  If the field isn't provided, the request defaults to `````application/json````` (which is what you'll want most of the time).

`````js
var urlSettings = {
        script: 142,
        deployment: 1,
        contentType: 'text/html' }   //defaults to application/json if no contentType is provided
`````

(Note that with `````application/json`````, Netsuite returns information in a different format based on the request type.  `````GET````` always returns data as a string. `````POST````` or `````PUT````` returns data as a direct JSON object.  You can get the hang of this by trying it out.)

You can read about the other two further down in the Error Handling section. 

## Creating a Link

Once you've created the account settings and url settings objects, pass them into `````createLink()`````:

`````javascript

var invoice_link = nsrestlet.createLink(accountSettings, urlSettings);
`````

This link allows you to call a restlet endpoint in an easy, clean, and repeatable way.  It also allows you to reuse the account settings to connect to other restlets.

## Calling the Endpoint

Once you have a link, you can directly call the four basic HTTP methods (`````GET`````, `````POST`````, `````PUT`````, `````DELETE`````).

The first paramater you provide is the data which will be sent to the restlet.

The second paramater is optional.  You can either provide a callback which will be called when the data is returned, or not provide one (in which case, a promise will be returned instead).

`````javascript
//Callbacks work great...
invoice_link.get({tranid:12345}, function(error, body)
{
    console.log(error, body);
});

//... and so do promises.
invoice_link.post({tranid:24680})
.then(function(body)
{
    console.log(body);
})
.catch(function(error)
{
    console.log(error);
});

//invoice_link also has .put() and .delete() methods
`````

## Passing Data to the RESTlet

For `````GET````` and `````DELETE````` requests, the payload is added to the URL as a query string.  For example, with `````invoice_link.get({tranid:12345});````` the module would call:

 `````https://ACCOUNTID.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=SCRIPTID&deploy=DEPLOYID&id=12345`````.

For `````POST````` and `````PUT````` requests, the payload is sent in the request body instead.  So with with `````invoice_link.post({tranid:12345});`````, the module would call:

 `````https://ACCOUNTID.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=SCRIPTID&deploy=DEPLOYID`````.

Regardless of the HTTP method, you can recieve the data in Netsuite directly as the first paramater:

`````javascript
function restlet_called(body)
{
  //you recieve the payload as 'body'
  
  //if you are using application/json, you can send data back to your application from Netsuite like this:
  return {message: "I got your message", data: body}
  
  //...otherwise you should probably send it as a string.
}
`````

`````GET`````, `````POST`````, and `````PUT````` all allow you to send data back from the restlet to your application.  This data is delivered to the callback you provided or to the resolution function of the promise:

`````javascript
//for example as a callback
invoice_link.post({tranid:12345}, function(error, body)
{
    console.log(body);
    /*
        You'd see this printed out:
        
        { message: "I got your message",
          data: { tranid:12345 } }
    */
});
`````
`````DELETE````` itself does not send any data back, but you should still provide a callback or recieve a promise to ensure no errors occured while making the request.

## Error Handling and Endpoint Retries

This module divides errors into two categories - retryable and non-retryable.

Retryable errors are errors related to rate limiting or other conditions where the restlet didn't recieve the request at all.  If this module  recieves these errors, it'll retry the connection up to 3 times (by default).  If it can't connect, you'll recieve the error as is normal for callbacks (`````error````` paramater) or promises (`````.catch()`````).

Non-Retryable errors are recieved as normal through callbacks or promises without retrying the endpoint at all.

You can customize the options for how this module will retry on retryable errors by adding fields to the __URLSettings__ object.

`````javascript
var urlSettings = {
        script: 142,
        deployment: 1,
        contentType: 'text/html',
        retries: 5,     //specifies the number of retries, default is 3
        backoff: 120 }  //specifies the multiplicative backoff, default is 0
`````
The retries field should be pretty obvious.  For backoff, it specifies how many miliseconds of a delay you want in the case of a failiure.

For example, if the backoff was 120, the module would delay 120 millseconds if the first request failed, and 240 millseconds if the second request failed (and so on).

## Need more Customization?

[Here is some basic code you can start with.](https://stackoverflow.com/questions/50611578/netsuite-oauth-not-working/50651498)  It provides a good base for a custom solution.

## Want to help with Development?

Feel free.  I have included a VERY basic test.js file with the module.  Run `````npm install mocha -g````` to get the test utility loadead and then run `````npm test`````.  You may see occasional errors due to timeouts, but that isn't related to the module's functionality.

## Credits

This module was made after looking at a lot of good code.  Here is some the code that inspired this module and effected how it was designed:

* [bknight's](https://github.com/bknights) response in [this thread](https://stackoverflow.com/questions/50611578/netsuite-oauth-not-working/50651498) is excellent - the idea of a facade for four HTTP codes works really well.  The error handling and retrying capabilities also comes from looking at his code.  He was generous enough to post a full example of what was working on his end.
* [suiteplus](https://github.com/suiteplus) has an excellent module called [nscabinet](https://github.com/suiteplus/nscabinet), which helps upload and download files from Netsuite as a gulp task.  Reading through it helped me understand how to use the `````querystring````` module and NLAuth.
* Marty Zigman has a [good sample](http://blog.prolecto.com/2017/10/14/download-netsuite-oauth-token-based-authentication-sample-node-js-program/) that got me pointed in the right direction.
* These excellent modules are used in this project -   [request](https://www.npmjs.com/package/request), [oauth-1.0a](https://www.npmjs.com/package/oauth-1.0a) (version 1.0.1), and [qs](https://www.npmjs.com/package/qs).
