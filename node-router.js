// Node router | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// This router is a general-purpose HTTP request router useful for rewriting based on URLs. Unlike node-dispatch (http://github.com/spencertipping/node-dispatch), node-router supports somewhat
// complex rewriting such rules such as "route requests to /foo/... to http://some-server/foo/bar/...", or "route requests to /bif/... to file:///home/whoever/files/bif/". In particular, this
// should be useful for rapid testing/deployment of applications, and maybe ad-hoc file serving.

  caterwaul.clone('std')(function (require) {

//   Configuration.
//   This system is relatively straightforward to configure. The configuration language looks just like the one for node-dispatch, but has some extra options in it. The idea is always the same:
//   you specify the beginning of each URL and then what to do with it, and the router preserves any part of the URL that isn't matched by the pattern and tacks it onto the end. (In other words,
//   you always have exactly one wildcard, and it is on the end of the URL.)

//   Here are the directives that are supported:

//   | /bar goes to file:///some/directory
//     /bif/baz goes to port 8082
//     /foo goes to http://server/foo

//   If you're serving from a directory, it serves index.html if there is one. Note that this is not, in general, a secure server for files; I'm sure there are ways to get it to read arbitrary
//   files from the filesystem. The only reason I've got file routing at all is because it's useful for prototyping applications without deploying them.

// Server components.
// Nothing much here, just a routing table and a loop to watch the route file. Then there's a simple file server that strips out repeated dots, the most obvious way that a user could try to hack
// the server. The HTTP server just forwards requests along, copying the headers, body, and everything else. (Only the 'host' header is changed; this avoids confusing virtual-host setups.)

//   Route file parsing.
//   This is just like node-dispatch but with a few more variations. Fortunately we don't need to detect the URL type here; we can just store the destination as a valid URL-formatted string and
//   unify that logic in the router itself.

    var routing_table = [];
    let[parse_routing_table = fn_[require('fs').readFile(routing_file, 'ascii', fn[err, data][
      routing_table = [],
      console.log('reading #{routing_file}'),
      data.split(/\n+/).map(fn[s][s.replace(/#.*$|^\s+/g, '')]).filter(fn[s][s.length]).map(fn[s][s.split(/\s*goes to\s*/)]).
                    forEach(fn[parts][routing_table.push({url: parts[0], route: /^port\s/.test(parts[1]) ? 'http://localhost:#{parts[1].replace(/^port\s+/, "")}/' : parts[1]})])])]] in
    (parse_routing_table(), require('fs').watchFile(routing_file, parse_routing_table)), where[routing_file = process.argv[2] || console.log('error: must specify a routing file')];

//   URL delegation.
//   Each URL scheme has its own handler, stored in this global table:

    const url_handlers = {

//     File serving.
//     Files are basically served straight, but no up-navigation is allowed. That is, any multiple-dot sequences in the path are replaced by just one dot, which is a (vulnerable, I'm sure)
//     attempt to remove obvious security holes. Also, all file requests are treated as reads, even if they're PUT, POST, or DELETE. I'm sure this will cause weird problems, but that's how I'm
//     doing it for now.

//     There's also a basic MIME table, nothing too fancy. It assigns MIME types to HTML, JavaScript, and CSS files. Everything else is sent down as text/html.

      file: (fn[req, res, relative_url, route_url][require('fs').readFile('#{route_url.replace(/^file:\/\//, "")}/#{relative_url.replace(/\.\+/g, "")}', 'ascii',
                                                   fn[err, data][err ? (res.writeHead(500), res.end(err.toString()))
                                                                     : (res.writeHead(200, {'content-type': content_type_for(relative_url)}), res.end(data))])],
             where[content_type_for = fn[filename][/\.js$/i.test(filename) ? 'application/javascript' : /\.css$/i.test(filename) ? 'test/css' : 'text/html']]),

//     HTTP serving.
//     This is a little harder, as data and headers need to be forwarded and chunking needs to be done for both the upload and the download. This involves parsing out the http:// URL (including a
//     potential port specification), creating a new 'host' header, and pipelining each end. (So more than a one-liner, basically.)

      http: fn[req, res, relative_url, route_url][let[headers = caterwaul.util.merge({}, req.headers, {host: host})] in
                                                  (let[req0 = require('http').createClient(port, host).request(req.method, url, headers)] in
                                                   (req0.on('response', fn[res0][res0.setEncoding('binary'),
                                                                                 res.writeHead(res0.statusCode, res0.headers),
                                                                                 res0.on('data', fn[data][res.write(data, 'binary')]),
                                                                                 res0.on('end',  fn_[res.end()])]),
                                                    req.on('data', fn[data][req0.write(data, 'binary')]),
                                                    req.on('end',  fn_[req0.end()]))),
                                                  where[host = parts[1], port = parts[2] || 80, url = parts[3] || '/'],
                                                  where[parts = /^http:\/\/([^:\/]+)(:?\d*)(\/.*)$/.exec('#{route_url}/#{relative_url}')]]};

//   Top-level routing.
//   Each toplevel request is matched against the table. The first matching rule is used.

    process.on('uncaughtException', fn[e][console.log(e)]);
    require('http').createServer(function (req, res) {for (var i = 0, l = routing_table.length, r; r = routing_table[i], i < l; ++i) if (req.url.substring(0, r.url.length) === r.url) break;
                                                      i < l ? let[handler = url_handlers[r.route.substring(0, 4)], relative_url = req.url.substring(r.url.length)] in
                                                              (handler ? handler(req, res, relative_url, r.route) : error('Invalid protocol: #{r.route.substring(0, 4)}'))
                                                            : error('Unrouted URL: #{req.url}'), where[error = fn[reason][res.writeHead(500), res.end(reason)]]}).listen(8080, '0.0.0.0');
  })(require);

// Generated by SDoc 