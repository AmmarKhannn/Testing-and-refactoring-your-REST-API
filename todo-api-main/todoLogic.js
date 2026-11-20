const { randomUUID } = require('node:crypto');

const states = ['todo', 'doing', 'done'];
const fields = ['title', 'description', 'state', 'dueDate'];

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validate(body, creating) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Body must be a JSON object.';
  }
  if (Object.keys(body).some(key => !fields.includes(key))) {
    return 'Only title, description, state and dueDate can be sent.';
  }
  if (creating && !Object.hasOwn(body, 'title')) return 'Title is required.';
  if (!creating && Object.keys(body).length === 0) return 'Send at least one field to update.';
  if (Object.hasOwn(body, 'title') &&
      (typeof body.title !== 'string' || !body.title.trim())) {
    return 'Title must be a non-empty string.';
  }
  if (Object.hasOwn(body, 'description') && typeof body.description !== 'string') {
    return 'Description must be a string.';
  }
  if (Object.hasOwn(body, 'state') && !states.includes(body.state)) {
    return 'State must be todo, doing or done.';
  }
  if (Object.hasOwn(body, 'dueDate') && !validDate(body.dueDate)) {
    return 'dueDate must be a real date in YYYY-MM-DD format.';
  }
  return null;
}

function makeTodo(body) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: body.title.trim(),
    description: body.description ?? '',
    state: body.state ?? 'todo',
    ...(Object.hasOwn(body, 'dueDate') ? { dueDate: body.dueDate } : {}),
    createdAt: now,
    updatedAt: now
  };
}

function updateTodo(todo, changes) {
  Object.assign(todo, changes);
  if (Object.hasOwn(changes, 'title')) todo.title = changes.title.trim();
  todo.updatedAt = new Date().toISOString();
  return todo;
}

function filterTodos(todos, state) {
  return state === undefined ? todos : todos.filter(todo => todo.state === state);
}

// Wrap CSV text in quotes so commas, quotes and new lines are handled correctly.
function csvValue(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function toCsv(todos) {
  const fields = ['id', 'title', 'description', 'state', 'dueDate', 'createdAt', 'updatedAt'];
  const rows = todos.map(todo => fields.map(field => csvValue(todo[field])).join(','));
  return [fields.join(','), ...rows].join('\n');
}

module.exports = { states, validDate, validate, makeTodo, updateTodo, filterTodos, toCsv };
