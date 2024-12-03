// const express = require('express');
// const path = require('path');
// const app = express();

// // Serve the HTML file from the current directory
// app.use(express.static(path.join(__dirname)));



// // Start the server on port 5000
// const port = 5001;
// app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
// });

const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(express.static(path.join(__dirname)));

const options = {
 key: fs.readFileSync('key.pem'),
 cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(5001, () => {
 console.log('HTTPS Server running on port 5001');
});