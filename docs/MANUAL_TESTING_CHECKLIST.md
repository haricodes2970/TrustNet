# Manual Testing Checklist

## Backend

- Register a new user.
- Attempt duplicate email registration.
- Login with valid credentials.
- Login with invalid credentials.
- Refresh access token using cookie.
- Open `/auth/me` with and without bearer token.
- Forgot password returns success for known and unknown email.
- Reset password with valid and invalid token.
- Change password while authenticated.
- Create, update, and delete own post.
- Attempt to update another user's post.
- Create, join, and leave community.
- Send collaboration request.
- Attempt accepting a request as a non-recipient.
- Create and delete like.
- Create, update, and delete comment.
- Test invalid ObjectId on every `/:id` endpoint.

## Frontend

- Signup page submits to backend.
- Login redirects to dashboard.
- Dashboard loads posts.
- Dashboard creates posts, likes posts, and comments.
- Profile page updates current user.
- Communities page lists and creates communities.
- Connections page loads founders and sends requests.
- Settings page changes password.
- Logout returns to login.
- Refresh on dashboard keeps session when refresh cookie is valid.
