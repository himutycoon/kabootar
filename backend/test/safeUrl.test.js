const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./helpers');
const { isTrustedImageUrl } = load('src/utils/safeUrl.js');

test('only our storage and Google photos are accepted as image links', () => {
  assert.ok(isTrustedImageUrl('https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media&token=t'));
  assert.ok(isTrustedImageUrl('https://lh3.googleusercontent.com/a/photo'));
  for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'http://firebasestorage.googleapis.com/x',
    'https://evil.com/a.jpg', 'https://firebasestorage.googleapis.com.evil.com/a.jpg', '', null, undefined, {}, 'not a url'])
    assert.equal(isTrustedImageUrl(bad), false, String(bad));
});
