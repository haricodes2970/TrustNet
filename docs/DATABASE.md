# Database

TrustNet uses MongoDB through Mongoose.

## Main Collections

- `users`
- `startups`
- `communities`
- `posts`
- `comments`
- `likes`
- `collaborationrequests`

## Key Relationships

- User can reference one Startup.
- Startup belongs to a founder User.
- Community has owner and members.
- Post references author, optional community, and optional startup.
- Comment references post, author, and optional parent comment.
- Like references user and a target post/comment.
- CollaborationRequest references sender, recipient, and optional startup.

## Auth Fields

User stores hashed passwords and hashed auth tokens:

- `password`
- `refreshTokenHash`
- `passwordResetTokenHash`
- `passwordResetExpiresAt`
- `emailVerificationTokenHash`
- `emailVerificationExpiresAt`
- `passwordChangedAt`

Raw refresh/reset/verification tokens are never stored.
