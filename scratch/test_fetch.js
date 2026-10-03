const http = require('http');

const files = [
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/context/AuthContext.jsx',
  '/src/context/ToastContext.jsx',
  '/src/components/ui/Select.jsx',
  '/src/components/ui/SearchableSelect.jsx',
  '/src/layouts/PublicLayout.jsx',
  '/src/pages/public/HomePage.jsx',
];

async function check() {
  for (const f of files) {
    await new Promise((resolve) => {
      http.get('http://localhost:3000' + f, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400 || data.includes('Internal Server Error') || data.includes('error')) {
            console.log(f, res.statusCode, data.slice(0, 200));
          } else {
            console.log(f, res.statusCode, 'OK');
          }
          resolve();
        });
      }).on('error', (err) => {
        console.log(f, 'FAIL', err.message);
        resolve();
      });
    });
  }
}

check();
