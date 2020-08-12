module.exports = () => (req, res, next) => {
  const success = (response, message, totalCount) => res.status(200).json({
    response,
    error: false,
    message,
    totalCount,
  });

  const noContent = (response) => res.status(204).json([ { ...response } ]);

  const badRequest = (message) => res.status(400).json({ error: true, message });

  const unAuthorized = (message) => res.status(401).json({ error: true, message });

  const forbidden = (message) => res.status(403).json({ error: true, message });

  const serverError = (message) => res.status(500).json({ error: true, message });

  const notFound = (message) => res.status(404).json({ error: true, message });

  const response = {
    badRequest,
    forbidden,
    noContent,
    serverError,
    success,
    unAuthorized,
    notFound,
  };

  Object.assign(res, response);

  return next();
};
