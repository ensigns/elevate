# Elevate Security and Router Container

This is intended for use with a docker deployment, or a deployment behind a reverse proxy. All requests should be directed through this service or container.

## Configuration

### routes.json

Use routes.json to expose specific routes. If no match is found, it tries to use the provided root, if specified.
Under services, should be each top level service. Each service has a \_base for common elements of the urls (e.g. container name), \_public set to true to avoid key checks, and named resource objects, which in turn have methods. Methods either have the rest of the url, or a resolver (see "Resolvers")

Of course, the nomenclature chosen may not match configuration, but the important thing to note is that requests, outside of those directed at the root service, should be in the form https://<url base>/service/resource/method.

### User Managment

This tool does not directly keep track of users, but it provides a framework to integrate with a service which does.
In routes.json, add an "auth" section with the following configuration options.


elevate_url - the url to do a check against - the jwt is passed as an auth bearer token
elevate_ok - the method to use to determine a auth check is ok
attr_suffix - if a route attr check is to be done, what do we append to the url?

#### attributes
A specific route can be assigned an attribute regarding its access ("attr"). If an attr is present on a route, it's routed if and only if the user check for that attr returns okay.

### enviornment variables

As of now, two settings may be changed with enviornment variables:

SECRET - the secret for JWT checks
DISABLE_SEC - set to true to skip all auth checks regardless of if public is set. Designed for cert/testing.

### Resolvers
Resolvers are set by setting the "method" level to "\_resolver"-- the actual input to the method is then stored as {IN}

destination - what to use as the method url, after {OUT} substitution,
url - the url to check
field - the field in the response to assign to {OUT}
before - a string or list of strings to get the variable before; if multiple match, the first match is used
after - a string or list of strings to get the variable after; if multiple match, the first match is used

### Keycheck
!!!! Keycheck is not yet implemented, but part of a potential concept for later

Checks if a named field is present in both the users keychain and the document; for document/resource level access control. Can be used with resolvers.
