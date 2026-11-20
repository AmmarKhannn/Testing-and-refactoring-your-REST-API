const express = require('express');
const { states, validate, makeTodo, updateTodo, filterTodos } = require('./todoLogic');

function createApp() {
  const app = express();
  const todos = [];
  app.disable('x-powered-by');
  app.set('query parser', 'simple');

  // Create and update requests must contain JSON.
  app.use((req, res, next) => {
    if (['POST', 'PUT'].includes(req.method) &&
        (req.path === '/todos' || req.path.startsWith('/todos/')) &&
        !req.is('application/json')) {
      return res.status(415).json({ error: 'Use Content-Type: application/json.' });
    }
    next();
  });
  app.use(express.json({ strict: false, limit: '16kb' }));

  app.post('/todos', (req, res) => {
    const error = validate(req.body, true);
    if (error) return res.status(400).json({ error });
    const todo = makeTodo(req.body);
    todos.push(todo);
    res.location(`/todos/${todo.id}`).status(201).json(todo);
  });

  app.get('/todos', (req, res) => {
    if (Object.keys(req.query).some(key => key !== 'state')) {
      return res.status(400).json({ error: 'Only the state query filter is supported.' });
    }
    const state = req.query.state;
    if (state !== undefined && (typeof state !== 'string' || !states.includes(state))) {
      return res.status(400).json({ error: 'State filter must be todo, doing or done, once only.' });
    }
    res.json(filterTodos(todos, state));
  });

  app.get('/todos/:id', (req, res) => {
    const todo = todos.find(item => item.id === req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found.' });
    res.json(todo);
  });

  // PUT supports partial changes.
  app.put('/todos/:id', (req, res) => {
    const todo = todos.find(item => item.id === req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found.' });
    const error = validate(req.body, false);
    if (error) return res.status(400).json({ error });
    res.json(updateTodo(todo, req.body));
  });

  app.delete('/todos/:id', (req, res) => {
    const index = todos.findIndex(item => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Todo not found.' });
    todos.splice(index, 1);
    res.status(204).end();
  });

  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Body contains invalid JSON.' });
    }
    if (err.status === 413) return res.status(413).json({ error: 'JSON body is too large. Maximum is 16 KB.' });
    if (err.status === 415) return res.status(415).json({ error: 'Unsupported JSON charset or encoding.' });
    if (err.status === 400) return res.status(400).json({ error: 'Invalid request.' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });
  return app;
}

module.exports = { createApp };
