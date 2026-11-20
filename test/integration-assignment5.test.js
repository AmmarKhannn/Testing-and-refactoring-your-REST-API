const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');

// Each test uses its own app, so old todos do not affect other tests.
async function withApi(check) {
  const server = createApp().listen(0);
  try {
    const port = server.address().port;
    const url = `http://127.0.0.1:${port}`;
    await check(url);
  } finally {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
}

function send(url, method, body) {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

test('POST and GET create and read a todo', async () => {
  await withApi(async url => {
    const created = await send(`${url}/todos`, 'POST', { title: '  Finish homework  ' });
    assert.equal(created.status, 201);
    const todo = await created.json();
    assert.equal(todo.title, 'Finish homework');
    assert.equal(todo.state, 'todo');
    assert.equal(created.headers.get('location'), `/todos/${todo.id}`);

    const single = await fetch(`${url}/todos/${todo.id}`);
    assert.equal(single.status, 200);
    assert.deepEqual(await single.json(), todo);

    const list = await fetch(`${url}/todos`);
    assert.equal(list.status, 200);
    assert.equal((await list.json()).length, 1);
  });
});

test('PUT changes a todo and the state filter works', async () => {
  await withApi(async url => {
    const created = await send(`${url}/todos`, 'POST', { title: 'Read' });
    const original = await created.json();
    const changed = await send(`${url}/todos/${original.id}`, 'PUT', { state: 'done' });
    assert.equal(changed.status, 200);
    const updated = await changed.json();
    assert.equal(updated.state, 'done');
    assert.equal(updated.title, 'Read');
    assert.equal(updated.createdAt, original.createdAt);

    const done = await fetch(`${url}/todos?state=done`);
    assert.equal(done.status, 200);
    assert.equal((await done.json()).length, 1);
    const doing = await fetch(`${url}/todos?state=doing`);
    assert.deepEqual(await doing.json(), []);
  });
});

test('DELETE removes a todo', async () => {
  await withApi(async url => {
    const created = await send(`${url}/todos`, 'POST', { title: 'Shopping' });
    const todo = await created.json();
    const deleted = await fetch(`${url}/todos/${todo.id}`, { method: 'DELETE' });
    assert.equal(deleted.status, 204);
    assert.equal(await deleted.text(), '');
    const missing = await fetch(`${url}/todos/${todo.id}`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'Todo not found.' });
  });
});

test('bad POST and PUT input returns 400', async () => {
  await withApi(async url => {
    const invalid = await send(`${url}/todos`, 'POST', { title: '' });
    assert.equal(invalid.status, 400);
    assert.ok((await invalid.json()).error);

    const created = await send(`${url}/todos`, 'POST', { title: 'Keep me' });
    const todo = await created.json();
    const badUpdate = await send(`${url}/todos/${todo.id}`, 'PUT', { state: 'wrong' });
    assert.equal(badUpdate.status, 400);
    const saved = await fetch(`${url}/todos/${todo.id}`);
    assert.equal((await saved.json()).state, 'todo');
  });
});

test('missing todos return 404 and wrong filters return 400', async () => {
  await withApi(async url => {
    const id = 'not-found';
    assert.equal((await fetch(`${url}/todos/${id}`)).status, 404);
    assert.equal((await send(`${url}/todos/${id}`, 'PUT', { state: 'done' })).status, 404);
    assert.equal((await fetch(`${url}/todos/${id}`, { method: 'DELETE' })).status, 404);
    assert.equal((await fetch(`${url}/todos?state=wrong`)).status, 400);
    assert.equal((await fetch(`${url}/no-such-page`)).status, 404);
  });
});
