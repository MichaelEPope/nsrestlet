var assert = require('assert');         //node's basic assertion library
var nsrestlet = require('./index.js');  //nsretlet module (which we are testing)
var secret = require('./secret.js');

secret.accountSettings.forEach(function(accountSetting)
{
    describe(accountSetting.name, function()
    {
        secret.urlSettings.forEach(function(urlSetting)
        {
            describe(urlSetting.name, function()
            {
                var test_restlet = nsrestlet.createLink(accountSetting, urlSetting);

                var functions = ["get", "post", "put", "delete"];

                functions.forEach(function(func)
                {
                    describe(func, function()
                    {
                        var test_function = test_restlet[func];

                        var messages = [{message: "hi"}];

                        messages.forEach(function(message)
                        {
                            describe(JSON.stringify(message), function()
                            {
                                it("Callback Style Works", function(done)
                                {
                                    test_function(message, function(error, body){
                                        if(error) done(error);
                                        if(func != "delete")
                                        {
                                            assert.equal(make_string(body), make_string({"success": true, "data": message}));
                                        }
                                        done();
                                    });
                                });
                                it("Promise Style Works", function(done)
                                {
                                    test_function(message).then(function(body){
                                        if(func != "delete")
                                        {
                                            assert.equal(make_string(body), make_string({"success": true, "data": message}));
                                        }
                                        done();
                                    }).catch(function(error)
                                    {
                                        done(error);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
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