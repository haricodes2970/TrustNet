# Module: Users

Files: `src/routes/user.routes.js`, `src/controllers/userController.js`, `src/services/userService.js`, `src/models/User.js`. See [DATABASE.md](../../DATABASE.md#user-userjs), [docs/modules/profile.md](profile.md) (profile is the self-service variant of this module).

## Routes (`/api/v1/users`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/:id` | — | get user by id |
| PUT | `/profile` | — | update profile (placeholder per survey — verify wiring, [profile.md](profile.md) is the primary profile-update path) |

## Controller (`userController.js`)

`createUser`, `getUser`, `getUserByEmail`, `getUserByUsername`, `updateUser`, `deleteUser`, `listUsers`.

## Service (`userService.js`)

`createUser`, `getUserById`, `getUserByEmail`, `getUserByUsername`, `updateUser`, `deleteUser`, `listUsers`.

## Notes

TODO: `PUT /users/profile` appears to overlap with `PUT /api/v1/profile` ([profile.md](profile.md)) — confirm whether this is dead/placeholder code before building against it.
