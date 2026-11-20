const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../app');
const { toCsv } = require('../todoLogic');

let server;
let url;
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

test('CSV conversion handles commas, quotes and empty fields', () => {
  const csv = toCsv([{
    id: '1', title: 'Eat, sleep', description: 'Say "hello"', state: 'done',
    createdAt: '2026-11-20', updatedAt: '2026-11-20'
  }]);
  assert.equal(csv, 'id,title,description,state,dueDate,createdAt,updatedAt\n' +
    '"1","Eat, sleep","Say ""hello""","done","","2026-11-20","2026-11-20"');
});

test('GET /todos defaults to JSON', async () => {
  const response = await fetch(url + '/todos');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), []);
});

test('GET /todos returns CSV and filters by state', async () => {
  for (const state of ['todo', 'done']) {
    const response = await fetch(url + '/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Test ${state}`, state })
    });
    assert.equal(response.status, 201);
  }
  const response = await fetch(url + '/todos?state=done', {
    headers: { Accept: 'text/csv' }
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/csv/);
  const csv = await response.text();
  assert.match(csv, /^id,title,description,state,dueDate,createdAt,updatedAt\n/);
  assert.match(csv, /"Test done"/);
  assert.doesNotMatch(csv, /"Test todo"/);
});

test('GET /todos rejects unsupported Accept format', async () => {
  const response = await fetch(url + '/todos', { headers: { Accept: 'image/png' } });
  assert.equal(response.status, 406);
  assert.equal(typeof (await response.json()).error, 'string');
});

test('OpenAPI file documents endpoints and both GET formats', async () => {
  const response = await fetch(url + '/openapi.json');
  assert.equal(response.status, 200);
  const spec = await response.json();
  assert.equal(spec.openapi, '3.0.3');
  assert.ok(spec.paths['/todos'].get.responses['200'].content['application/json']);
  assert.ok(spec.paths['/todos'].get.responses['200'].content['text/csv']);
  assert.ok(spec.paths['/todos'].post);
  for (const method of ['get', 'put', 'delete']) assert.ok(spec.paths['/todos/{id}'][method]);
});

test('/doc opens the Swagger UI page', async () => {
  const response = await fetch(url + '/doc');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /swagger-ui-bundle\.js/);
  assert.match(html, /openapi\.json/);
});
