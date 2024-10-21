const jwt = require("jsonwebtoken");
const User = require("../models/user");

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
      const user = await User.findOne({ email: verify.email });
      if (user) {
        req.user = verify;
        next();
      } else {
        return res.status(401).json({
          msg: "Unauthorized access!",
        });
      }
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
