# Cognito migration (frontend)

## Install dependencies (run at your Next.js project root)
npm i aws-amplify jwt-decode

## Environment variables (Amplify Console → Environment variables)
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXX
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=YYYYYYYY
NEXT_PUBLIC_API=https://<your-api-gateway-base-url>

## What changed
- src/lib/amplify.ts (new): Amplify Auth config (env-based)
- src/components/AmplifyClientInit.tsx (new): initializes Amplify on client
- src/context/AuthContext.tsx: now uses Cognito (signIn/signUp/confirmSignUp/signOut)
- src/lib/api.ts: attaches Cognito ID token automatically
- src/app/login/page.tsx: login uses Cognito signIn
- src/app/register/page.tsx: register uses Cognito signUp + optional verification code

Generated: 2026-02-04
