// intended to be used (at least) as an exposed docker container
const express = require('express')
const rp = require('request-promise');
const app = express();
const fs = require("fs")
const getUrlParam = require("./getUrlParam")
var jwt = require('jsonwebtoken');
var proxy = require('http-proxy-middleware');

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

// handle non-json raw body for post
app.use(function(req, res, next) {
    var data = '';
    req.setEncoding(null);
    req.on('data', function(chunk) {
        data += chunk;
    });
    req.on('end', function() {
        req.rawBody = data;
        next();
    });
});

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

// handle jwt
app.use(function(req, res, next){
    req.verified = false;
    req.jwt_err = "Uninitialized JWT Error";
    if (DISABLE_SEC) {
        req.verified = true
        req.jwt_err = "Security Disabled";
        next()
    } else {
        jwt.verify(getToken(req), SECRET, function(err, decoded) {
            if (err) {
                console.log(err)
                req.jwt_err = err
                next()
            } else {
                console.log(decoded)
                req.jwt_data = decoded
                req.verified = true
                next()
            }
        });
    }
})

// handle resolver
app.use(function(req, res, next){
    resolve(req.originalUrl, config).then(x=>{
        req.new_url = x.url
        req.is_public = x.public
        next()
    }).catch(e=>{
        req.resolve_failed = true
        req.resolve_err = e
        next()
    });
});

// handle breaking errors thusfar
app.use(function(req, res, next){
    if (req.resolve_failed){
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        let statusCode = req.resolve_err.statusCode || 500
        let body =  req.resolve_err.error.toString()
        res.status(statusCode).send(body)
    } else {
        if (req.verified){
            next()
        } else {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.status(401).send(req.jwt_err)
        }
    }
})

// handle the proxy routes themselves
app.use("/", function(req, res, next) {
    proxy({
      onError(err, req, res) { res.status(500).send(err)},
      changeOrigin: true,
      target:req.new_url.split("/").slice(0,3).join("/"),
      pathRewrite: function (path, req) {return req.new_url.split("/").slice(3).join("/") },
      onProxyReq: function (proxyReq, req, res){
        if (req.method == "POST"){
          console.log(req.rawBody.length)
          proxyReq.write( req.rawBody );
          proxyReq.end();
        }
      }
    })(req, res, next)
})


app.listen(PORT, () => console.log('listening on ' + PORT))
