"use client";

import { Amplify } from "aws-amplify";

// Configure Amplify Auth using environment variables.
//
// Set these in Amplify Console → App settings → Environment variables (or local .env):
// NEXT_PUBLIC_AWS_REGION=us-east-1
// NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
// NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxx
//
// NOTE: This file is imported once on the client (via AmplifyClientInit).

const region = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "";
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      userPoolRegion: region,
    },
  },
});
