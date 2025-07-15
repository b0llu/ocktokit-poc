# GitHub Integration Setup

This project demonstrates Octokit.js integration with the GitHub REST API following the [official quickstart guide](https://docs.github.com/en/rest/quickstart?apiVersion=2022-11-28&tool=javascript).

## Features

- ✅ Repository file tree navigation
- ✅ Branch selection and switching
- ✅ File content viewing
- ✅ In-browser file editing
- ✅ Commit changes to GitHub
- ✅ Environment-based configuration
- ✅ Error handling and loading states
- ✅ Modern React functional components
- ✅ TypeScript interfaces for API responses

## Usage

1. **Setup Environment**: Configure `.env.local` with your repository details and GitHub token
2. **Start Application**: Run `npm run dev` to start the development server
3. **Explore Repository**: Click "Explore Repository" to load the file tree and branches
4. **Switch Branches**: Use the branch dropdown to switch between different repository branches
5. **Browse Files**: Click on folders to navigate deeper, click on files to view content
6. **Edit Files**: Click "Edit" button on any file to modify its content
7. **Save Changes**: Add a commit message and click "Save Changes" to commit to GitHub

## Token Permissions

For basic functionality, create a token with these scopes:
- `public_repo` - Access public repositories
- `read:user` - Read user profile information

## Environment Variables

Create a `.env.local` file in your project root to configure the application:

```bash
# GitHub Authentication Token (required for editing)
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Repository Configuration (required)
NEXT_PUBLIC_GITHUB_OWNER=your-username
NEXT_PUBLIC_GITHUB_REPO=your-repository-name
```

### Environment Variable Details

- **NEXT_PUBLIC_GITHUB_TOKEN**: Personal access token for GitHub API authentication
- **NEXT_PUBLIC_GITHUB_OWNER**: GitHub username or organization name
- **NEXT_PUBLIC_GITHUB_REPO**: Repository name to explore and edit

The application will automatically use these values on startup.

## API Endpoints Used

- `GET /repos/{owner}/{repo}/branches` - List repository branches
- `GET /repos/{owner}/{repo}/contents/{path}` - Get file/directory contents
- `PUT /repos/{owner}/{repo}/contents/{path}` - Create or update file contents

## Rate Limits

- **Unauthenticated**: 60 requests per hour per IP
- **Authenticated**: 5,000 requests per hour per user

## Security Note

Never expose your GitHub token in client-side code in production. Use server-side API routes or environment variables with proper security measures. 