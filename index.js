/*
    IMPORTED MODULES

    We use these three modules.
    
    Request is a pretty common module which simplifies http.request().

    Oauth-1.0a is a module which does a lot of the encoding work for Oauth for us.  It's really
    important that we use the 1.01 version, for some reason the newer version isnt working.
    At some points we may want to figure out how to get the newer version working.

    QS turns JSON objects into query strings, for example, {id:12345, record:'salesord'} becomes
    'id=12345&record=salesord'.  This is useful for GET and DELETE requests
*/
const request = require('request');
const OAuth = require('oauth-1.0a');
const qs = require('qs');


/*
    EXPORT

    The idea behind the export is that it should have a single method which you can use to create facades
    for a set of account settings and url settings.  It should look something like this:

    var nsrestlet = require('ns-restlet');
    var salesorders = nsrestlet.createLink(accountSettings, urlSettings);

    This allows users to reuse the accountSettings for other links, as well as reuse the urlSettings, which
    might be useful (if they mirror a sandbox account off of a production account?  is that possible?  not sure).
*/
module.exports = {

    createLink: function(accountSettings, urlSettings)
    {

        var authType, consumer, oauth, baseUrl;     //some variables we may need to use in the process

        /*
            ACCOUNT SETTINGS

            I wanted to make the account settings simple but flexible.  There are two ways to log in to Netsuite
            with a Restlet, and this module should cover both of them.
            
            The first, OAuth requires an Account ID, a Consumer Key-Secret Pair (Found on the Integrations page in
            Netsuite), and a Token Key-Secret Pair (Found on the Tokens page in Netsuite).

            The second, NLAuth requires a Username and Password.  It also allows us to specify a role, which isn't
            required but is highly reccomended.

            Generally OAuth is reccomended over NLAuth because tokens don't expire when password change and don't
            require you to mess with two-factor-authentication which requires you to verify them through your phone.

            This part basically just verifies that all that information is there as requried, or it throws an error.
        */

        if(!accountSettings)                //an accountSettings is required
        {
            throw new Error("Not enough information was provided to createLink().  You must provide an object with the account settings as the first argument.")
        }
        if(!accountSettings.accountId)      //an accountID is required
        {
            throw new Error("Not enough information was provided to createLink().  You must have an {accountId} to connect.")
        }
        //we need to determine the authorization type we are using
        //NLAuth uses {email, password} while OAuth v1 uses {tokenKey, tokenSecret, consumerKey, consumerSecret}   
        if(!accountSettings.tokenKey || !accountSettings.tokenSecret || !accountSettings.consumerKey || !accountSettings.consumerSecret)
        {
            //it's not OAuth...
            if(!accountSettings.email || !accountSettings.password) //email and password are required for NLAuth
            {
                throw new Error("Not enough information was provided to createLink().  You can connect via OAuth {tokenKey, tokenSecret, connsumerKey, consumerSecret} or NLAuth {email, password}.")
            }
            else
            {
                authType == "NLAuth";
            }
        }
        else
        {
            authType = "OAuth";        //OAuth v1 (not v2, netsuite doesn't do OAuth v2 yet)
            
            //the basic oauth object needs the consumer token and key, as well as the encoding type we are using
            oauth = OAuth({
                consumer: {
                    public: accountSettings.consumerKey,
                    secret: accountSettings.consumerSecret
                },
                signature_method: 'HMAC-SHA256'
            })
        }

        /*
            URL SETTINGS

            I wanted to make this part flexible as well.  Most examples of OAuth restlet clients I have seen so far
            use the direct external URL.  This is great.  However, a NLAuth restlet client I saw, called nscabinet
            used a method to derive the URL from the Account ID, Script ID, and Script Deployment ID.  I decided I
            wanted this to work in the same way.

            In doing so, I discovered that the Script ID and Script Deployment ID could also be replaced by the Script
            Number and Deployment Number (actually, that's how the external URL is designed).  The section below accepts
            all of those options and just makes sure the correct arguments were passed in.  If not, it tosses an error.

            So your urlSettings object can look like either of the following:

            {
                url: https://ACCOUNTID.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=SCRIPTID&deploy=DEPLOYID
            }

            or

            {
                script: SCRIPTID,
                deployment: DEPLOYID
            }

            In addition, in the URL Settings, you can specify the content type you want to use for the response.  By default,
            this is JSON since I imagine most people are using Netsuite Restlet APIs for returning JSON.

            {
                contentType: 'application/json'
            }
        */

        if(!urlSettings)                                                            //urlSettings is required
        {
            throw new Error("Not enough information was provided to createLink().  You must provide either the URL or an object with {script, deployment} as the second argument")
        }

        if(urlSettings.url)                                                         //if a url string is provided, we are good
        {
            baseUrl = urlSettings.url;
        }
        else if(urlSettings.script && urlSettings.deployment)                       //if the url is a {script, deployment}, we design the URL and are good
        {
            baseUrl = 'https://' + accountSettings.accountId + '.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=' + urlSettings.script + '&deploy=' + urlSettings.deployment;
        }
        else                                                                        //if neither, we have a problem, and tooss an error
        {
            throw new Error("Not enough information was provided to createLink().  You must provide either the URL or an object with {script, deployment} as the second argument")
        }

        /*
            THE RESTLET CALL METHOD

            After you have created the link using createLink(accountSettings, urlSettings), you are returned a facade
            that contains get(), post(), put(), and delete().  You'll see these (and a description on how to use them)
            further down in the module.  All of these contain some common functionality though, which is contained in
            this function directly below (which happens to be the real meat of the module)

            This section does a few things.  First it sets up the headers.  The headers are a bit different depending
            on whether it's an OAuth or NLAuth call.
            
            If OAuth, we design an authorizaiton object which is encoded using the encoding specified earlier (in this
            case HMAC-SHA256).  This authorization object includes the Token Key-Secret Pair, the URL, and the HTTP
            method we are using (GET, POST, PUT, DELETE).  We add that, and your accountID to the header, and send it off.

            If instead we are doing NLAuth, your email and password are put into the header instead.  A role can also
            be added (and it's usually reccomended).  Bundle that up with the accountId, send it off, and you're good to go.

            There's are two other twist to this part though.  First, I wanted it to be both callback and promise friendly.
            This is done by detecting if there is a callback or not.  If there is, we use that callback.  If not, we return
            a promise that encapsulates this function.

            Secondly, I wanted the module to be able to retry on certain error as bknight's example code did.  So there's
            an inner function which allows this to happen.  I may move it so it's more readable in the future.
        */
        function callRestlet(method, payload, callback)
        {
            //if we don't have a callback, we create a promise that encapsulates this function
            //we may return a promise to the user, but internally we just use the callback form
            //when actually resolving things, which keeps all the code together in one
            if(!callback)
            {
                return new Promise(function(resolve, reject)
                {
                    callRestlet(method, payload, function(error, body)
                    {
                        if(error)
                        {
                            return reject(error)
                        }
                        else
                        {
                            resolve(body)
                        }
                    });
                });
            }
            else                            //if there is a callback, we can proceed as normally
            {

                var headers;                //we will use this variable later

                var url = baseUrl;          //if we are doing get or delete, we need to encode the payload into a query string
                if(method == "GET" || method == "DELETE")
                {
                    url += "&" + qs.stringify(payload);
                }

                //this is the inner function that contains all of the meaty code
                //it is called at the end of the function for the first time, and can be recalled
                //but only does so if certain errors are recieved
                function makeCall(repeats)
                {
                    if(authType == "OAuth")     //if we are doing OAuth
                    {
                        //encode an authorization of the following data using HMAC-SHA256
                        var authorization = oauth.authorize({
                            url: url,
                            method: method  },{
                            public: accountSettings.tokenKey,
                            secret: accountSettings.tokenSecret
                        })

                        //stick it and the other stuff we need in the header
                        headers = oauth.toHeader(authorization);
                        headers.Authorization += ', realm="' + accountSettings.accountId + '"';

                    }
                    else                        //if we are doing NLAUTH
                    {
                        //stick the necessary stuff in the header
                        var headers = { Authorization: '' }
                        headers.Authorization += 'NLAuth nlauth_account=' + accountSettings.accountId;
                        headers.Authorization += ',nlauth_email=' + accountSettings.email;
                        headers.Authorization += ',nlauth_signature=' + accountSettings.password;

                        //role is optional (but reccomended)
                        if(accountSettings.role)
                        {
                            headers.Authorization += ',nlauth_role=' + accountSettings.role
                        }
                    }

                    //most of the time, people will be wanting to use json, but we have the option for them not to
                    if(urlSettings.contentType)
                    {
                        headers['content-type'] = urlSettings.contentType;
                    }
                    else
                    {
                        headers['content-type'] = 'application/json';
                    }

                    //set up the request settings
                    var requestSettings = {
                        url: url,
                        method: method,
                        headers: headers,
                    }

                    //if we aren't doing get, we need to add the payload as json
                    if(method != "GET" && method != "DELETE")
                    {
                        requestSettings.json = payload;
                    }

                    //make the actual request
                    request(requestSettings, function(error, response, body)
                    {
                        if(error)
                        {
                            error_message = error.message || JSON.stringify(error)
                            //if we got an error that we can try again, and we haven't reached our repeat limit, try again
                            //otherwise throw an error
                            //largely gotten from bknight's code (see readme)
                            if(['ECONNRESET', 'ESOCKETTIMEDOUT','ETIMEDOUT', 'SSS_REQUEST_LIMIT_EXCEEDED'].indexOf(error_message) != -1)
                            {
                                if(repeats > 0)
                                {
                                    if(urlSettings.backoff && urlSettings.retries)
                                    {
                                        setTimeout(function()
                                        {
                                            makeCall(repeats - 1);
                                        }, backoff * (urlSettings.retries - (repeats + 1)));
                                    }
                                    else
                                    {
                                        makeCall(repeats - 1);
                                    }
                                }
                                else
                                {
                                    callback(error, body);
                                }
                            }
                            else
                            {
                                callback(error, body);
                            }
                        }
                        else
                        {
                            //we got a correct response - return the body
                            //(because we don't care about the headers and all that stuff, just the data)
                            callback(error, body);
                        }
                    });
                }
                //make the call to the function - we can retry up to three times
                var amount_of_calls = 3;
                if(urlSettings.retries)
                {
                    amount_of_calls = urlSettings.retries;
                }
                makeCall(amount_of_calls);
            }
        }

        /*
            HTTP METHOD FACADE

            Here we set up some facade methods which all eventually redirect to callRestlet().  This idea came
            from some wonderful sample code by BKnights.  They facade methods can be used like this:

            var nsrestlet = require('ns-restlet');
            var salesorders = nsrestlet.createLink(accountSettings, urlSettings);
            salesorders.get(payload, function(error, response)
            {
                console.log(error, response);
            })

            Or you can use them like this:

            var nsrestlet = require('ns-restlet');
            var salesorders = nsrestlet.createLink(accountSettings, urlSettings);
            var myPromise = salesorders.post(payload)
            myPromise.then(function(error, response)
            {
                console.log(error, response);
            })

            As you can see, that they are pretty straighforward.  This is the object that actually gets returned
            to the user (they can't use callRestlet() directly)
        */
        return {
            get: function(payload, callback)
            {
                return callRestlet("GET", payload, callback);
            },
            post: function(payload, callback)
            {
                return callRestlet("POST", payload, callback);
            },
            put: function(payload, callback)
            {
                return callRestlet("PUT", payload, callback);
            },
            delete: function(payload, callback)
            {
                return callRestlet("DELETE", payload, callback);
            }
        }
    }

}