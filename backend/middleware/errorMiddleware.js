export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || error.statusCode || (error.name === 'MulterError' ? 400 : 500);
  const message = status === 500 ? 'Something went wrong while processing your request.' : error.message;

  if (status === 500) {
    console.error(error);
  }

  res.status(status).json({ error: message });
}
