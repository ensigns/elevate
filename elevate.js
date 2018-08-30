// This tool routes in three steps
// intended to be used (at least) as an exposed docker container
const express = require('express')
const rp = require('request-promise');
const app = express();
const fs = require("fs")
const getUrlParam = require("./getUrlParam")

// simple method which takes care of auth
function checkAuthOff(type, path, auth, request){
  return true
}

//const checkAuth = require("./bindaas_auth.js") || checkAuthOff
const checkAuth = checkAuthOff; // for testing

async function route(type, path, auth, request){
  let hostlist
  try{
    hostlist = JSON.parse(fs.readFileSync("routes.json"));
  } catch (e){
    hostlist = JSON.parse(fs.readFileSync("routes.json.example"));
  }
  if (type in hostlist){
    // special case for iip
    if (type == "img"){
      // translate path, then route
      var url = "http://ca-data:9099/services/caMicroscope/Slide/query/get?id=" + getUrlParam('slide', path)
      var options = {
        uri: url,
        method: "get",
        json: true
      }
      var slide = await rp(options);
      var location = slide.location
      if (location){
        var suffix = ""
        // handle seeking files
        else if(path.includes("_files"){
          location = location.split(".dzi")[0]
          suffix = "_files" + path.split("_files")[1]
        })
        // case where it's an img
        return hostlist['img']+ "/fcgi-bin/iipsrv.fcgi?DeepZoom=" + location
      }
    }
    return hostlist[type] + path
  } else if ('_default' in hostlist){
    // if not, use _default
    return hostlist['_default'] + request.originalUrl
  } else {
    // last try, maybe it's local
    return request.originalUrl
  }
}



app.use("/", async function(req, res){
  let type = req.originalUrl.split("/")[1]
  let path = req.originalUrl.split("/").slice(2).join("/");
  let auth = req.headers.authorization;
  // check auth
  var is_authorized
  try{
    is_authorized = await checkAuth(type, path, auth, req)
  } catch(e){
    console.warn(e)
    res.status(500).send(decodeURIComponent(e))
  }
  // skip this check if told to
  if (!is_authorized) {
    return res.status(401).json({ error: 'Not Authorized' });
  }
  // route
  let url = await route(type, path, auth, req)
  options = {
    uri: url,
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
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.status(500).send(e)
  })
})

app.listen(4010, () => console.log('listening on 4010'))
