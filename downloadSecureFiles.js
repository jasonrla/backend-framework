const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://gitlab.com/gitlab-org/incubation-engineering/mobile-devops/download-secure-files/-/raw/main/installer';
const dest = path.join(__dirname, 'src', 'installer');

const file = fs.createWriteStream(dest);
https.get(url, function(response) {
  response.pipe(file);
});