require("dotenv").config();
const http = require("http");
const redirect = require("./api/redirect");

const server = http.createServer((req, res) => {
  redirect(req, res);
});

server.listen(3000, () => {
  console.log("Local server listening on port 3000");
  
  // Make a request to the server
  http.get("http://localhost:3000", (res) => {
    console.log("Status Code:", res.statusCode);
    console.log("Headers:", res.headers);
    res.setEncoding('utf8');
    res.on('data', (chunk) => console.log("BODY:", chunk));
    res.on('end', () => process.exit(0));
  });
});
