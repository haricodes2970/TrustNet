function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false,
    });

    if (error) {
      const errors = {};
      for (const detail of error.details) {
        const key = detail.path.join(".");
        if (!errors[key]) errors[key] = detail.message;
      }
      return res.status(400).json({ success: false, errors });
    }

    return next();
  };
}

module.exports = validate;
