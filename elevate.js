// This tool routes in three steps
// intended to be used (at least) as an exposed docker container
const express = require('express')
const rp = require('request-promise');
const app = express();
const fs = require("fs")

// simple method which takes care of auth
function checkAuthOff(type, path, auth, request){
  return true
}

const checkAuth = require("./check_auth.js") || checkAuthOff

function route(type, path, auth, request){
  let hostlist
  try{
    hostlist = JSON.parse(fs.readFileSync("routes.json"));
  } catch (e){
    hostlist = JSON.parse(fs.readFileSync("routes.json.example"));
  }
  if (type in hostlist){
    return hostlist[type] + path
  } else if ('_default' in hostlist){
    // if not, use _default
    return hostlist['_default'] + request.originalUrl
  } else {
    // last try, maybe it's local
    return request.originalUrl
  }
}



app.use("/", function(req, res){
  let type = req.originalUrl.split("/")[1]
  let path = req.originalUrl.split("/");
  let auth = req.headers.authorization;
  // check auth
  let is_authorized = checkAuth(type, path, auth, req)
  // skip this check if told to
  var skip_check = process.env.CHECK_HEADER=="no"
  if (!skip_check && !is_authorized) {
    return res.status(401).json({ error: 'No authorization header set' });
  }
  // route
  let url = route(type, path, auth, req)
  options = {
    uri: path,
    encoding: null,
    method: req.method,
    resolveWithFullResponse: true
  }
  var resource = rp(options);
  resource.then(response=>{
    res.set(response.headers)
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.send(response.body)}
  );
  resource.catch(e=>{
    res.set(e.response.headers)
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.status(500).send(decodeURIComponent(e.response.body))
  })
})

app.listen(4010, () => console.log('listening on 4010'))
