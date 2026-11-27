// Test helpers: replace a backend module with a stub before it is required.
const path = require('path');
const ROOT = path.join(__dirname, '..');

function stub(rel, exports) {
  const file = require.resolve(path.join(ROOT, rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
}
const load = (rel) => require(path.join(ROOT, rel));
const dep = (name) => require(path.join(ROOT, 'node_modules', name));

// Start an express app on a random port; returns { url, close }
function serve(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({
      url: `http://127.0.0.1:${server.address().port}`,
      close: () => new Promise(r => server.close(r)),
    }));
  });
}

module.exports = { stub, load, dep, serve, ROOT };
