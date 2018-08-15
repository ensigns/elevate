// WIP - slide and colleciotn level auth for bindaaas
async function bindaaasCheckAuth(type, path, auth, request){
  if (!(type=="data" || type=="img")){
    return true
  }
  // TODO something to translate auth into user better than literal
  if (!auth){
    return false
  }
  let user = getUrlParam("user", path) || auth.split(" ")[1];
  // TODO need a better method to auth user

  // get user
  let url = "ca-data:9099/services/caMicroscope/Authorization/query/getAuth?name=" + user
  options = {
    uri: url,
    encoding: null,
    method: req.method,
    resolveWithFullResponse: true,
    json: true
  }

  var auth = await rp(options);

  // if there's such a user, we're ok
  if (auth.length){
    return true
  } else {
    return false
  }
}

module.exports = bindaaasCheckAuth
