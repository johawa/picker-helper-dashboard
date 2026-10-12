# Picker dashboard

Desktop view of the picking sessions stored in the same CouchDB databases as the field app. The session list opens directly while Auth0 is empty. The sign-in page remains at `/login` and the API starts checking the email allowlist once `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are set.

## Run locally

1. Copy `.env.example` to `.env` and fill in Auth0, the allowlist, and the CouchDB user and password.
2. Start CouchDB from the field app (`docker compose up` in picker-helper).
3. In this folder, start the API and the Angular app in two terminals:

```bash
npm run server
npm start
```

The app is at http://localhost:4300. The API is at http://127.0.0.1:4301.

## Auth0

Create a Single Page Application and an API whose identifier matches `AUTH0_AUDIENCE`. Set the callback, logout, and web origin to `http://localhost:4300`.

Add a Post Login Action so the access token includes the email:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  if (event.authorization && event.user.email) {
    api.accessToken.setCustomClaim('https://picker-dashboard/email', event.user.email);
  }
};
```

Stay on the Auth0 Free plan and the default `*.auth0.com` domain. A custom domain asks for a credit card.
