var assert = require('assert');             //node's basic assertion library
var nsrestlet = require('./nsrestlet.js');  //nsretlet module (which we are testing)
require('env2')('.env');
var secret = JSON.parse(process.env.SECRET);

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

var valid_request = requests[0];
var valid_request2 = requests[requests.length - 1];

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

it("Account Settings Error", function()
{
    try         {   nsrestlet.createLink(); }
    catch(err)  {   assert.ok(true);   }
});

it("Account ID Error", function()
{
    var copy = clone(valid_request.accountSetting)
    delete copy.accountId;
    try         {   nsrestlet.createLink(copy); }
    catch(err)  {   assert.ok(true);   }
});

it("Missing OAuth or NLAuth required Values Error", function()
{
    var copy = clone(valid_request2.accountSetting)
    delete copy.email;
    try         {   nsrestlet.createLink(copy); }
    catch(err)  {   assert.ok(true);   }
});

it("URL Settings Error", function()
{
    try         {   nsrestlet.createLink(valid_request.accountSetting); }
    catch(err)  {   assert.ok(true);   }
});

it("Missing required URL Seetings Values Error", function()
{
    try         {   nsrestlet.createLink(valid_request.accountSetting, {}); }
    catch(err)  {   assert.ok(true);   }
});

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

function clone(obj)
{
    var copy = {};
    Object.assign(copy, obj);
    return copy;
}