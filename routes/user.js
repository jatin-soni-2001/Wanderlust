const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");

const userController = require("../controllers/users.js");

router
  .route("/signup")
  .get(userController.renderSignupFrom)
  .post(wrapAsync(userController.signUp));

router
  .route("/login")
  .get(userController.renderLoginFrom)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.Login
  );

//router.get("/signup", userController.renderSignupFrom);

//router.post("/signup", wrapAsync(userController.signUp));

// router.get("/login", userController.renderLoginFrom);

// router.post(
//   "/login",
//   saveRedirectUrl,
//   passport.authenticate("local", {
//     failureRedirect: "/login",
//     failureFlash: true,
//   }),
//   userController.Login
// );

router.get("/logout", userController.Logout);

module.exports = router;
