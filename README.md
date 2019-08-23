# elevate Security and Router Container

This is intended for use with a docker deployment, or a deployment behind a reverse proxy. All requests should be directed through this service or container.

## Configuration

### SSL

To enable ssl, mount the private key and certificate files to ssl/privatekey.pem and ssl/certificate.pem respectively. HTTPS mode will only be enabled if both of these files are present.

### routes.json

Use routes.json to expose specific routes. If no match is found, it tries to use the provided root, if specified.
Under services, should be each top level service. Each service has a \_base for common elements of the urls (e.g. container name), \_public set to true to avoid key checks, and named resource objects, which in turn have methods. Methods either have the rest of the url, or a resolver (see "Resolvers")

Of course, the nomenclature chosen may not match configuration, but the important thing to note is that requests, outside of those directed at the root service, should be in the form https://<url base>/service/resource/method.

### User Managment

This tool does not directly keep track of users, but it provides a framework to integrate with a service which does.
In routes.json, add an "auth" section with the following configuration options.


permissions_field - the field in the given jwt to check for permission attributes; expects a list.

(more configuration may be added soon)

#### attributes
A specific route can be assigned an attribute regarding its access ("attr"). If an attr is present on a route, it's routed if and only if the user check for that attr returns okay.


#### Keys
For documents expected to return one or a list of JSON documents, you can prevent a user from seeing documents with a given field (a "key") not matching any of the "keys" in the user's token.
The name of the "key" in the token and document should be defined as "key_field" under security in the routes config
This should be defined per route in the config via the "key_method" field.

Supported options include:
 - "filter" -- filter documents which have a key the user does not out of results
 - "single" -- return "{}" if the single document has a key which the user does not have

Currently, resolvers do not work with keys. This should be fixed soon. If you're reading this, please put in an issue if you desire this functionality, to signal that this should get focus/priority.

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
