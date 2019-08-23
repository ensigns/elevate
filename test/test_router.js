const assert = require('assert');
const fetch = require("node-fetch")

// "secret": camic
// properties field:
var jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhTWljcm9zY29wZSIsImF0dHJzIjpbInN1cGVyIiwiZHVwZXIiXSwia2V5IjpbImtleWVkIl0sImlhdCI6MTUxNjIzOTAyMiwianRpIjoiOGZhZTBiOTUtMzg3MS00MmZhLTkwZTItOTkwOGRlOTY5MWEwIiwiZXhwIjoxNTY2NTgxOTc5fQ.cmvZBPe72k_3yi1ULNPQ9LTd6NkOVeYvLKtqBKdm3Jo"
var wrong_scope_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwibmFtZSI6ImNhTWljcm9zY29wZSIsImlhdCI6MTUxNjIzOTAyMn0.yaa_qazSR7uAfg3sqxsJvcnOq2fqWb_R50Vz6xoMdKo"
wrong_scope_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhTWljcm9zY29wZSIsImlhdCI6MTUxNjIzOTAyMn0.hF-y-LbX_ySDsQg80EP4BuU_P8xtRKBaKMQXLSC-2S8"
var wrong_key_jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhTWljcm9zY29wZSIsImF0dHJzIjpbInN1cGVyIiwiZHVwZXIiXSwia2V5IjpbInVua2V5ZWQiXSwiaWF0IjoxNTE2MjM5MDIyLCJqdGkiOiI4ZmFlMGI5NS0zODcxLTQyZmEtOTBlMi05OTA4ZGU5NjkxYTAiLCJleHAiOjE1NjY1ODIwNDN9.2HbuB-9d3ymk_hTu1RZYdSpcAeBZaHBjwztmzACBQvI"
var faked_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhTWljcm9zY29wZSIsImlhdCI6MTUxNjIzOTAyMn0.C4kyd1e30G-noF1WkZibJQxuiJ43CCUpPWj7XnfcB7Q"

var base = "http://localhost:4010"

var public_url = base + "/public/test/test"
var private_url = base + "/private/test/test"
var super_url = base + "/private/test/super"

// test without jwt, public - should be ok
describe('Router User Access Checks', function () {
  // can we see it in find
  it('Works for public route', function (done) {
    fetch(public_url).then(x=>x.json()).then(x=>{
      console.log(x)
      assert.equal(x.status, "OK", "Works ok")
      done()
    }).catch(e=>{
      console.log(e)
      done(e)
    })
  })
  it('Fails for private route without auth', function (done) {
    // test without jwt, nonpublic - error
    fetch(private_url).then(x=>x.json()).then(x=>{
      console.log(x)
      assert.notEqual(x.status,"OK", "Correctly did not route")
      done()
    }).catch(e=>{
      console.log(e)
      done(e)
    })
  })
  it('works for private route with correct auth', function (done) {
    // test with jwt, public - should be ok
    fetch(private_url, {headers: {"Authorization": "Bearer " + jwt}}).then(x=>x.json()).then(x=>{
      console.log(x)
      assert.equal(x.status, "OK", "Works ok")
      done()
    }).catch(e=>{
      console.log(e)
      done(e)
    })
  })
  it('fails for private route with wrong verification secret', function (done) {
    // wrong jwt should not work
    fetch(private_url, {headers: {"Authorization": "Bearer " + faked_jwt}}).then(x=>x.json()).then(x=>{
      console.log(x)
      assert.notEqual(x.status,"OK", "Correctly did not route")
      done()
    }).catch(e=>{
      console.log(e)
      done(e)
    })
  })
  it('succeeds for super route with super user', function (done) {
    // wrong jwt should not work
    fetch(super_url, {headers: {"Authorization": "Bearer " + jwt}}).then(x=>x.json()).then(x=>{
      console.log(x)
      assert.equal(x.status,"OK", "Lets user through")
      done()
    }).catch(e=>{
      console.log(e)
      done(e)
    })
  })
  it('fails for super route with non super user', function (done) {
    // wrong jwt should not work
    fetch(super_url, {headers: {"Authorization": "Bearer " + wrong_scope_jwt}}).then(x=>x.json()).then(x=>{
      console.log(x)
      assert.notEqual(x.status,"OK", "Correctly did not route")
      done()
    }).catch(e=>{
      console.log(e)
      done(e)
    })
  })
  it('gets two items for keyed', function (done) {
    // wrong jwt should not work
    fetch(super_url, {headers: {"Authorization": "Bearer " + jwt}}).then(x=>x.json()).then(x=>{
      console.log(x)
      assert.equal(x.length, 2, "got two items for keyed jwt")
      done()
    }).catch(e=>{
      console.log(e)
      done(e)
    })
  })
  it('only gets one item for unkeyed', function (done) {
    // wrong jwt should not work
    fetch(super_url, {headers: {"Authorization": "Bearer " + wrong_scope_jwt}}).then(x=>x.json()).then(x=>{
      console.log(x)
      assert.equal(x.length, 1, "got 1 item for unkeyed jwt")
      done()
    }).catch(e=>{
      console.log(e)
      done(e)
    })
  })
})
