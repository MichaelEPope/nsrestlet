//LOAD MODULES WE WILL USE
var assert = require('assert');             //node's basic assertion library
var nsrestlet = require('./nsrestlet.js');  //nsretlet module (which we are testing)
var qs = require('qs');                     //we will use this for query string processing
var url = require('url');                    //used in the query string processing

//ATTEMPT TO LOAD THE ENVIROMENTAL VARIABLES
try
{
    require('env2')('.env');
}
catch(err)
{
    //do nothing, this only happens in a travis-ci enviroment
}

//SEPERATE THE SCRIPT AND DEPLOYMENT NUMBER IDS FROM THE EXTERNAL URL
var params = qs.parse(new URL(process.env.EXTERNAL_URL).search);

//CREATE OUR VARIABLE OF SECRETS FROM THE ENVIROMENTAL VARIABLES
var secret = {
    accountSettings:[
    {
        name:               "OAuth",
        accountId:          process.env.ACCOUNT_ID,
        tokenKey:           process.env.TOKEN_KEY,
        tokenSecret:        process.env.TOKEN_SECRET,
        consumerKey:        process.env.CONSUMER_KEY,
        consumerSecret:     process.env.CONSUMER_SECRET
    },
    {
        name:               "NLAuth",
        accountId:          process.env.ACCOUNT_ID,
        email:              process.env.NON_PRIVELAGED_EMAIL,
        password:           process.env.NON_PRIVELAGED_PASSWORD,
        role:               process.env.NON_PRIVELAGED_ROLE
    },
    {
        name:               "NLAuth",
        accountId:          process.env.ACCOUNT_ID,
        email:              process.env.NON_PRIVELAGED_EMAIL,
        password:           process.env.NON_PRIVELAGED_PASSWORD
    }],
    urlSettings:[
    {
        name:               "String S&D IDs",
        script:             process.env.CUSTOMSCRIPT_STRING_ID,
        deployment:         process.env.CUSTOMDEPLOY_STRING_ID
    },
    {
        name:               "Number S&D IDs",
        script:             params["?script"],
        deployment:         params["deploy"]
    },
    {
        name:               "URL S&D",
        url:                process.env.EXTERNAL_URL
    }]
}

//CREATE LIST OF REQUESTS
//this part of the module generates combinations of each of our settings
//we test each of them because this is largely how the module is used
//so it's important it works right
var requests = [];
secret.accountSettings.forEach(function(accountSetting)
{
    secret.urlSettings.forEach(function(urlSetting)
    {
        var functions = ["get", "post", "put", "delete"];

        functions.forEach(function(func)
        {
            var messages = [{message: "hi"}];

            messages.forEach(function(message)
            {
                ["Callback Style", "Promise Style"].forEach(function(style)
                {
                    requests.push({
                        accountSetting: accountSetting,
                        urlSetting: urlSetting,
                        func: func,
                        message: message,
                        style: style
                    })
                });
            });
        });
    });
});

//save two of the requests for later
var valid_request = requests[0];
var valid_request2 = requests[requests.length - 1];

//GENERIC REQUEST TEST
//make the generic requests, one at a time
it("Testing Generic Request Calls", function(done)
{
    function performRequest()
    {
        console.log(Date.now() + " doing work...");
        if(requests.length > 0)
        {
            var req = requests.shift();
            var test_restlet = nsrestlet.createLink(req.accountSetting, req.urlSetting);
            var test_function = test_restlet[req.func];
            if(req.style == "Callback Style")
            {
                test_function(req.message, function(error, body){
                    if(error) done(error);
                    if(req.func != "delete")
                    {
                        assert.equal(make_string(body), make_string({"success": true, "data": req.message}));
                    }
                    performRequest();
                });
            }
            else
            {
                test_function(req.message).then(function(body){
                    if(req.func != "delete")
                    {
                        assert.equal(make_string(body), make_string({"success": true, "data": req.message}));
                    }
                    performRequest();
                }).catch(function(error)
                {
                    done(error);
                });
            }
        }
        else
        {
            done();
        }
    }
    performRequest();
});

//OTHER REQUEST TEST
//what happens if we don't provide account settings?
it("Account Settings Error", function()
{
    try         {   nsrestlet.createLink(); }
    catch(err)  {   assert.ok(true);   }
});

//what happens if we don't provide an account id?
it("Account ID Error", function()
{
    var copy = clone(valid_request.accountSetting)
    delete copy.accountId;
    try         {   nsrestlet.createLink(copy); }
    catch(err)  {   assert.ok(true);   }
});

//what happens if we are missing some values required for OAuth or NLAuth?
it("Missing OAuth or NLAuth required Values Error", function()
{
    var copy = clone(valid_request2.accountSetting)
    delete copy.email;
    try         {   nsrestlet.createLink(copy); }
    catch(err)  {   assert.ok(true);   }
});

//what happens if we don't provide URL Settings?
it("URL Settings Error", function()
{
    try         {   nsrestlet.createLink(valid_request.accountSetting); }
    catch(err)  {   assert.ok(true);   }
});

//what happens if we are missing some values required in the URL Settings
it("Missing required URL Seetings Values Error", function()
{
    try         {   nsrestlet.createLink(valid_request.accountSetting, {}); }
    catch(err)  {   assert.ok(true);   }
});

//what happens if we call a restlet that does not exist?
it("Non-Existant Restlet Error", function(done)
{
    var link = nsrestlet.createLink(valid_request.accountSetting,
    {
        script: "fakescript",
        deployment: "fakedeploy"
    });
    link.post(valid_request.message).then(function(body)
    {
        done("Did not get an error, instead got:" + JSON.stringify(body));
    }).catch(function(error)
    {
        assert.ok(true);
        done();
    });
});

//what happens if the restlet throws an error?
it("Restlet Throwing Error", function(done)
{
    var link = nsrestlet.createLink(valid_request.accountSetting,valid_request.urlSetting);
    link.post({"throw": true}).then(function(body)
    {
        done("Did not get an error, instead got:" + JSON.stringify(body));
    }).catch(function(error)
    {
        assert.ok(true);
        done();
    });
});

//what happens if we have backoff set, and our request gets dropped
it("Testing a Dropped Call with Backoff", function(done)
{
    var copy = clone(valid_request.urlSetting)
    copy.retries = 4;
    copy.backoff = 10;
    var link = nsrestlet.createLink(valid_request.accountSetting, copy);
    link.post({"drop": true}).then(function(body)
    {
        done("Did not get an error, instead got:" + JSON.stringify(body));
    }).catch(function(error)
    {
        assert.ok(true);
        done();
    });
});

//what happens if we dont't have backoff set, and our request gets dropped
it("Testing a Dropped Call without Backoff", function(done)
{
    var copy = clone(valid_request.urlSetting)
    copy.retries = 4;
    var link = nsrestlet.createLink(valid_request.accountSetting, copy);
    link.post({"drop": true}).then(function(body)
    {
        done("Did not get an error, instead got:" + JSON.stringify(body));
    }).catch(function(error)
    {
        assert.ok(true);
        done();
    });
});

//just making sure strings work properly (they should, but just checking)
it("Restlet properly send strings (because sometimes we don't need JSON)", function(done)
{
    var link = nsrestlet.createLink(valid_request.accountSetting, valid_request.urlSetting);
    link.post({"string": "12345"}).then(function(body)
    {
        assert.equal(body, "12345");
        done();
    }).catch(function(error)
    {
        done(error);
    });
});


//HELPER FUNCTIONS
//just turns the value into a string if it isn't one already
//(we use this to compare things)
function make_string(value)
{
    if(typeof value !== 'string' && !(value instanceof String))
    {
        return JSON.stringify(value);
    }
    else
    {
        return value;
    }
}

//makes a copy of an object (shallow, I believe)
function clone(obj)
{
    var copy = {};
    Object.assign(copy, obj);
    return copy;
}