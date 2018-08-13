function checkAuth(type, path, auth, request){
  console.log("hi")
  return true
}

async function bindaaasCheckAuth(type, path, auth, request){
  // TODO something to translate auth into user better than literal
  let user = auth;
  let slide = path; // TODO get slide id
  // get current user's collections and slides
  let url = "ca-data:9099/services/caMicroscope/Authorization/query/getAuth"
  // if the requested slide is in authed, ok
  options = {
    uri: url,
    encoding: null,
    method: req.method,
    resolveWithFullResponse: true
  }
  var auth = await rp(options);
  // if not, check each of the collections recursively
  functions isInCollectionList(slide, collectionList){
    return false
  }
}

module.exports = checkAuth
