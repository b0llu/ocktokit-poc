# GitHub Integration Setup

This project demonstrates Octokit.js integration with the GitHub REST API following the [official quickstart guide](https://docs.github.com/en/rest/quickstart?apiVersion=2022-11-28&tool=javascript).
test
## Features (WIP)

- ✅ Fetch public user information
- ✅ List user repositories
- ✅ Authenticated user profile (with token)
- ✅ Error handling and loading states
- ✅ Modern React functional components
- ✅ TypeScript interfaces for API responses

## Usage

1. **Public API Access**: No token required for public data
   - Enter any GitHub username (default: "octocat")
   - Click "Fetch User Info" or "Fetch Repositories"

2. **Authenticated Access**: Requires GitHub Personal Access Token
   - Generate token at: [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/personal-access-tokens/new)
   - Enter token in the password field
   - Click "Fetch My Profile" for authenticated user data

## Token Permissions

For basic functionality, create a token with these scopes:
- `public_repo` - Access public repositories
- `read:user` - Read user profile information

## Environment Variables (Optional)

You can create a `.env.local` file to store your token:

```bash
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The component will automatically use this token as the default value when the app loads.

## API Endpoints Used

- `GET /users/{username}` - Get user information
- `GET /users/{username}/repos` - List user repositories  
- `GET /user` - Get authenticated user (requires token)

## Rate Limits

- **Unauthenticated**: 60 requests per hour per IP
- **Authenticated**: 5,000 requests per hour per user

## Security Note

Never expose your GitHub token in client-side code in production. Use server-side API routes or environment variables with proper security measures. 