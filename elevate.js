// intended to be used (at least) as an exposed docker container
const express = require('express')
const rp = require('request-promise');
const app = express();
const fs = require("fs")
const getUrlParam = require("./getUrlParam")
var jwt = require('jsonwebtoken');
var proxy = require('http-proxy-middleware');
const https = require('https')

var SECRET = process.env.SECRET
var DISABLE_SEC = process.env.DISABLE_SEC || false
var REDIRECT = process.env.REDIRECT || false

var PORT = process.env.PORT || 4010

let RESOLVER_CACHE = {}
var HTTPS_MODE = false
var https_options = {}
// HTTPS IF AVALIABLE
try {
  let pk_path = "./ssl/privatekey.pem"
  let cert_path = "./ssl/certificate.pem"
  if (fs.existsSync(pk_path) && fs.existsSync(cert_path)) {
    HTTPS_MODE = true
    console.info("https mode")
    https_options.key = fs.readFileSync(pk_path, 'utf8')
    https_options.cert = fs.readFileSync(cert_path, 'utf8')
  }
} catch(err) {
  console.error(err)
}

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
    let attr = undefined
    // check if exists first
    let serviceList = config.services
    let hasMethod = serviceList.hasOwnProperty(service) && serviceList[service].hasOwnProperty(type) && serviceList[service][type].hasOwnProperty(method);
    let isResolver = serviceList.hasOwnProperty(service) && serviceList[service].hasOwnProperty(type) && serviceList[service][type].hasOwnProperty("_resolver");
    if (hasMethod || isResolver) {
        ispublic = serviceList[service]["_public"] || false
        outUrl += serviceList[service]["_base"] || ""
        if (isResolver) {
            attr = serviceList[service][type]["_resolver"].attr
            outUrl += await useResolver(method, serviceList[service][type]["_resolver"])
        } else {
            // does this have an attribute
            attr = serviceList[service][type][method].attr
            outUrl += serviceList[service][type][method]['path'] || serviceList[service][type][method] || ""
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
        ispublic = config["_root_public"] || false
    }
    return {
        url: outUrl,
        public: ispublic,
        attr: attr
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
                req.jwt_err = err
                next()
            } else {
                req.jwt_data = decoded
                req.verified = true
                next()
            }
        });
    }
})

// handle auth given jwt decoded
app.use(function(req, res, next){
    if (DISABLE_SEC || !config.hasOwnProperty("auth")){
      // user managment not set up or security is entirely disabled
      // also, don't break on public routers
      req.userid = "UNSPECIFIED"
      req.user_ok = true
      next()
      // if the JWT is ok
    } else if (req.verified) {
      var check_url = config.auth.elevate_url
      // no elevate url means all valid tokens are ok
      usercheck = rp({
        uri: config.auth.elevate_url,
        headers: {authorization: "Bearer " + getToken(req)}
      })
      usercheck.then(x=>{
        if (config.auth.elevate_ok.mode == "status"){
          // rp should only be ok where 2xx by documentation, so then means we're ok
          req.user_ok = true
        } else {
          // unsupported
          req.user_ok = false
          req.jwt_err= {"error": "user auth method unsupported"}
        }
        next()
      }).catch(e=>{
        // failure to get the url is ALSO failure to auth
        req.user_ok = false
        req.jwt_err= {"error": "User not authorized"}
        next()
      })
    } else {
      req.user_ok = false
      next()
    }
})


// handle resolver
app.use(function(req, res, next){
    resolve(req.originalUrl, config).then(x=>{
        req.new_url = x.url
        req.is_public = x.public
        req.attr = x.attr
        next()
    }).catch(e=>{
        req.resolve_failed = true
        req.resolve_err = e
        next()
    });
});



// attribute check
app.use(function(req, res, next){
  if (DISABLE_SEC){
    req.attr_ok = true
    next()
  }
  else if (config.hasOwnProperty("auth") && req.attr && config.auth.elevate_url){
    var attr_suffix = config.auth.attr_suffix || "?attr="
    usercheck = rp({
      uri: config.auth.elevate_url + attr_suffix + req.attr,
      headers: {authorization: "Bearer " + getToken(req)}
    })
    usercheck.then(x=>{
      req.attr_ok = true
      next()
    }).catch(e=>{
      // failure to get the url is ALSO failure to auth
      req.attr_ok = false
      req.jwt_err= "User not authorized for " + req.attr
      next()
    })
  } else {
    req.attr_ok = true
    next()
  }

})

// handle breaking errors thusfar
app.use(function(req, res, next){
    if (req.resolve_failed){
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        let statusCode = req.resolve_err.statusCode || 500
        let body = req.resolve_err.error.toString()
        res.status(statusCode).send({"error":body})
    } else {
        console.log("public check", req.is_public)
        if ((req.attr_ok && req.user_ok) || req.is_public){
            next()
        } else {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            if (REDIRECT){
                res.status(401).redirect(REDIRECT);
            }
            else {
                res.status(401).send({"error":req.jwt_err})
            }
        }
    }
})

// handle the proxy routes themselves
app.use("/", function(req, res, next) {
    proxy({
      onError(err, req, res) { console.warn(err)},
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

if (HTTPS_MODE){
  https.createServer(https_options, app).listen(PORT, () => console.log('listening HTTPS on ' + PORT));
} else {
  app.listen(PORT, () => console.log('listening on ' + PORT))
}
