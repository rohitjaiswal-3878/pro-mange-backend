const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers["x-token"];

    if (!token) {
      return res.status(401).json({
        msg: "Unauthorized access!",
      });
    }

    const verify = await jwt.verify(token, process.env.SECRET);
    if (verify) {
      req.user = verify;
      next();
    } else {
      return res.status(401).json({
        msg: "Unauthorized access!",
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { authMiddleware };
