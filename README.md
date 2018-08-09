# elevate
Gateway and proxy which asks another server or resource for authorization

## Usage
A request to <this server>/data/get?id=apple is split into a type (data) and a path (get?id=apple). The server associated with the route for data then gets <that server>/get?id=apple as a request.

## Setup
First, set up routes.json. This should have each type associated with a host, and optionally a "\_default" attribute. If no type is met, it will then route the full url to the host specified.

This tool is especially set up to check for authorization, but this is deployment specific so far, so it requires tinkering. In elevate.js, see the checkAuth function.

The checkAuth function, out of the box, always returns true, but it should be replaced, if desired, with a check that the resource requested is authorized. For  the <this server>/data/get?id=apple example, this method may know that we can ask another server, <auth server>/users/<uid>/fruit to see which fruit that user can see, and check if apple is among the list.

## Use with Docker
This tool is intended to be used as a single exposed container in a docker deployment. The other containers should be networked to this container, but not otherwise accessible to outside requests.

## Disclaimer
I have yet to do any good testing on how secure this method is, so consider it a prototype, not production ready quite yet.
