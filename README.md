# FindBack

FindBack is a responsive campus lost-and-found frontend built with React and Vite. It uses the existing AWS API for item reports, presigned S3 image uploads, and automated possible-match suggestions.

## Run locally

```bash
npm install
npm run dev
```

The app uses `https://ltayb90q72.execute-api.us-east-1.amazonaws.com` by default. To point at another compatible API without committing configuration, create a local `.env.local` file:

```
VITE_API_BASE_URL=https://your-api.example.com
```

## Production build

```bash
npm run build
npm run preview
```

The generated static application is in `dist/`.

## Manual AWS Amplify ZIP deployment

1. Run `npm install && npm run build`.
2. Zip the *contents* of `dist` (not the `dist` directory itself):

   ```bash
   cd dist
   zip -r ../findback-amplify.zip .
   cd ..
   ```

3. In AWS Amplify, choose the app and manual deployment flow, then upload `findback-amplify.zip`.

No AWS credentials or secrets are required in the frontend build. The image upload path uses the backend-issued presigned POST fields.

## Checks

```bash
npm run lint
npm run build
```
