const test = require('node:test');
const assert = require('node:assert/strict');
const { validDate, validate, makeTodo, updateTodo, filterTodos } = require('../todoLogic');

test('checks real dates', () => {
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('2027-02-29'), false);
  assert.equal(validDate('01-01-2027'), false);
  assert.equal(validDate(null), false);
});

test('accepts a normal new todo', () => {
  assert.equal(validate({ title: 'Homework', state: 'todo' }, true), null);
});

test('rejects missing or empty titles', () => {
  assert.equal(validate({}, true), 'Title is required.');
  assert.equal(validate({ title: '   ' }, true), 'Title must be a non-empty string.');
  assert.equal(validate({ title: 3 }, true), 'Title must be a non-empty string.');
});

test('rejects wrong input types and fields', () => {
  assert.equal(validate([], true), 'Body must be a JSON object.');
  assert.equal(validate({ title: 'Test', state: 'later' }, true), 'State must be todo, doing or done.');
  assert.equal(validate({ title: 'Test', description: null }, true), 'Description must be a string.');
  assert.equal(validate({ title: 'Test', dueDate: '2027-02-30' }, true), 'dueDate must be a real date in YYYY-MM-DD format.');
  assert.equal(validate({ title: 'Test', id: '123' }, true), 'Only title, description, state and dueDate can be sent.');
  assert.equal(validate({}, false), 'Send at least one field to update.');
});

test('creates a todo with defaults and a trimmed title', () => {
  const todo = makeTodo({ title: '  Study  ' });
  assert.equal(todo.title, 'Study');
  assert.equal(todo.description, '');
  assert.equal(todo.state, 'todo');
  assert.match(todo.id, /^[\da-f-]{36}$/);
  assert.equal(todo.createdAt, todo.updatedAt);
  assert.equal('dueDate' in todo, false);
});

test('updates only the fields given', () => {
  const todo = makeTodo({ title: 'Study', description: 'Math' });
  const id = todo.id;
  const createdAt = todo.createdAt;
  updateTodo(todo, { title: '  Study science  ', state: 'doing' });
  assert.equal(todo.title, 'Study science');
  assert.equal(todo.state, 'doing');
  assert.equal(todo.description, 'Math');
  assert.equal(todo.id, id);
  assert.equal(todo.createdAt, createdAt);
  assert.ok(Date.parse(todo.updatedAt) >= Date.parse(createdAt));
});

test('filters todos by state', () => {
  const todos = [{ state: 'todo' }, { state: 'doing' }, { state: 'done' }];
  assert.equal(filterTodos(todos).length, 3);
  assert.deepEqual(filterTodos(todos, 'doing'), [{ state: 'doing' }]);
  assert.deepEqual(filterTodos(todos, 'missing'), []);
});
