/**
 * Authentication Middleware
 * Role 3: Broken Access Control Fix
 *
 * Checks if the user has a valid session (userId).
 * If not authenticated, redirects to /signup.
 */
function authMiddleware(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect("/signup");
  }
  next();
}

module.exports = authMiddleware;
