# Postman Guide

Import `TrustNet.postman_collection.json`.

Recommended order:

1. Register
2. Login
3. Me
4. Create startup/community/post data
5. Test comments and likes
6. Test collaboration request
7. Refresh token
8. Logout

Set collection variable:

```text
baseUrl=http://localhost:5000/api/v1
```

After login, copy `data.accessToken` into the `accessToken` collection variable if your Postman version does not do it automatically. Protected create/update/delete requests use `Authorization: Bearer {{accessToken}}`.
