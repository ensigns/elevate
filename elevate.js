// intended to be used (at least) as an exposed docker container
const express = require('express')
const rp = require('request-promise');
const app = express();
const fs = require("fs")
const getUrlParam = require("./getUrlParam")
var jwt = require('jsonwebtoken');

app.use(express.json());

var SECRET = process.env.SECRET
var DISABLE_SEC = process.env.DISABLE_SEC || false

var PORT = process.env.PORT || 4010

let RESOLVER_CACHE = {}


let loading_config
try {
    loading_config = JSON.parse(fs.readFileSync("routes.json"));
} catch (e) {
    loading_config = JSON.parse(fs.readFileSync("routes.json.example"));
}
const config = loading_config;

// Sessions
// CACHE Resolvers
// CACHE Keys, put in session

// route for user - get username given auth header
// route for login - get header given good login

// this method takes in the original url and config to resolve which url to ask for
async function resolve(url, config) {
    let service = url.split("/")[1]
    let type = url.split("/")[2]
    let method = ""
    if (url.split("/")[3]){
      method = url.split("/")[3].split("?")[0]
    }
    let outUrl = ""
    let ispublic = false
    // check if exists first
    let serviceList = config.services
    let hasMethod = serviceList.hasOwnProperty(service) && serviceList[service].hasOwnProperty(type) && serviceList[service][type].hasOwnProperty(method);
    let isResolver = serviceList.hasOwnProperty(service) && serviceList[service].hasOwnProperty(type) && serviceList[service][type].hasOwnProperty("_resolver");
    if (hasMethod || isResolver) {
        ispublic = serviceList[service]["_public"] || false
        outUrl += serviceList[service]["_base"] || ""
        if (isResolver) {
            outUrl += await useResolver(method, serviceList[service][type]["_resolver"])
        } else {
            outUrl += serviceList[service][type][method] || ""
        }
        // handle lingering method url params
        if (url.split("/")[3].split("?").length >= 2){
          outUrl += "?" + url.split("/")[3].split("?")[1]
        }
        // handle any leftover route passed
        if (url.split("/").length > 4){
          outUrl += "/" + url.split("/").slice(4).join("/")
        }
    } else {
        // if not exists, go to base
        outUrl = config["root"] + "/" + url.split("/").slice(1).join("/")
    }
    return {
        url: outUrl,
        public: ispublic
    }
}

// in cases where a resolver, rather than a string, is used for a method, use this to lookup w/o cache
async function useResolver(method, rule) {
        var INvar = method;
        var beforeVar = "";
        var afterVar = "";
        // get input variable
        if (rule.before) {
            if ((typeof rule.before === 'string' || rule.before instanceof String)) {
                // for unity, treat as list
                rule.before = [rule.before]
            }
            let activeKeys = rule.before.filter(x => INvar.indexOf(x) >= 0)
            INvar = INvar.split(activeKeys[0])[0]
            // keep the rest of the things surrounding the invar
            beforeVar = method.slice(method.indexOf(activeKeys[0]))
            console.log(beforeVar)
        }
        if (rule.after) {
            if ((typeof rule.after === 'string' || rule.after instanceof String)) {
                // for unity, treat as list
                rule.after = [rule.after]
            }
            let activeKeys = rule.after.filter(x => INvar.indexOf(x) >= 0)
            INvar = INvar.split(activeKeys[0])[1]
            // keep the rest of the things surrounding the invar
            afterVar = method.slice(0,method.lastIndexOf(activeKeys[0]+activeKeys[0].length))
        }
        var OUTvar = ""
        var rule_check = JSON.stringify([INvar, rule])
        if (RESOLVER_CACHE.hasOwnProperty(rule_check)) {
            OUTvar = RESOLVER_CACHE[rule_check]
            console.log("Got from cache: from: " + rule_check + " to : " + OUTvar)
        } else {
            OUTvar = await rp({
              uri: rule.url.split("{IN}").join(INvar),
              json: true
          })
          RESOLVER_CACHE[rule_check] = OUTvar
        }
        // case where list with one item
        if (OUTvar.length == 1){
          OUTvar=OUTvar[0]
        }
        if (rule.field) {
            OUTvar = OUTvar[rule.field]
        }
        // substitute all OUT and IN
        var result = rule.destination.split("{OUT}").join( afterVar + OUTvar + beforeVar ).split("{IN}").join(INvar);

        return result

}

const getToken = function(req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') { // Authorization: Bearer g1jipjgi1ifjioj
        // Handle token presented as a Bearer token in the Authorization header
        return req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        // Handle token presented as URI param
        return req.query.token;
    } else if (req.cookies && req.cookies.token) {
        // Handle token presented as a cookie parameter
        return req.cookies.token;
    }
}

app.use("/", function(req, res) {
    // normal behavior
    let resolveProm = resolve(req.originalUrl, config)
    resolveProm.then(x => {
        console.log(x)
        let verified = false;
        let jwt_err = "Uninitialized JWT Error";
        if (DISABLE_SEC) {
            verified = true
            let jwt_err = "Security Disabled";
        } else {
            jwt.verify(getToken(req), SECRET, function(err, decoded) {
                if (err) {
                    console.log(err)
                    jwt_err = err
                } else {
                    console.log(decoded)
                    verified = true
                }
            });
        }
        if (x.public || verified) {
            options = {
                uri: x.url,
                encoding: null,
                method: req.method,
                resolveWithFullResponse: true
            }
            if (req.method != "GET") {
                options.body = req.body;
                options.json = true;
            }
            var resource = rp(options);
            resource.then(response => {
                res.set(response.headers)
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.send(response.body)
            });
            resource.catch(e => {
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                let statusCode = e.statusCode || 500
                let body =  e.data
                body = e.response.body.toString()
                res.status(statusCode).send(body)
            })
        } else {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.status(401).send(jwt_err)
        }
    })
    resolveProm.catch(e => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.status(500).send(e)
    })
})

app.listen(PORT, () => console.log('listening on ' + PORT))
