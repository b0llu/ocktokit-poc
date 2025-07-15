'use client';

import { useState, useEffect } from 'react';
import { Octokit } from 'octokit';

interface RepoFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
  download_url?: string | null;
  url: string;
}

interface FileContent {
  name: string;
  path: string;
  content: string;
  encoding: string;
  size: number;
  type: string;
}

interface GitHubFileResponse {
  name: string;
  path: string;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
  size: number;
  sha: string;
}

const RepositoryExplorer = () => {
  const [owner, setOwner] = useState('B0llu');
  const [repo, setRepo] = useState('ocktokit-poc');
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';

  // Initialize Octokit instance
  const createOctokitInstance = () => {
    return new Octokit({
      auth: token || undefined,
    });
  };

  // Fetch repository contents
  const fetchRepoContents = async (path: string = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const octokit = createOctokitInstance();
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(response.data)) {
        setFiles(response.data as RepoFile[]);
        setCurrentPath(path);
        setBreadcrumbs(path ? path.split('/') : []);
      } else {
        // Single file
        const fileData = response.data as GitHubFileResponse;
        if (fileData.type === 'file') {
          await fetchFileContent(fileData.path);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repository contents');
    } finally {
      setLoading(false);
    }
  };

  // Fetch file content
  const fetchFileContent = async (filePath: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const octokit = createOctokitInstance();
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
      });

      const fileData = response.data as GitHubFileResponse;
      if (fileData.type === 'file') {
        let content = '';
        if (fileData.content) {
          // Decode base64 content
          content = fileData.encoding === 'base64' 
            ? atob(fileData.content.replace(/\n/g, ''))
            : fileData.content;
        }

        setSelectedFile({
          name: fileData.name,
          path: fileData.path,
          content,
          encoding: fileData.encoding || 'utf-8',
          size: fileData.size,
          type: fileData.type,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file content');
    } finally {
      setLoading(false);
    }
  };

  // Handle folder click
  const handleFolderClick = (folderPath: string) => {
    fetchRepoContents(folderPath);
  };

  // Handle file click
  const handleFileClick = (filePath: string) => {
    fetchFileContent(filePath);
  };

  // Handle breadcrumb click
  const handleBreadcrumbClick = (index: number) => {
    const newPath = breadcrumbs.slice(0, index + 1).join('/');
    fetchRepoContents(newPath);
  };

  // Go back to parent directory
  const goBack = () => {
    const parentPath = breadcrumbs.slice(0, -1).join('/');
    fetchRepoContents(parentPath);
  };

  // Get file icon based on extension
  const getFileIcon = (fileName: string, type: 'file' | 'dir') => {
    if (type === 'dir') {
      return '📁';
    }
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return '🟨';
      case 'ts':
      case 'tsx':
        return '🔷';
      case 'py':
        return '🐍';
      case 'md':
        return '📝';
      case 'json':
        return '📄';
      case 'css':
        return '🎨';
      case 'html':
        return '🌐';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return '🖼️';
      default:
        return '📄';
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Initial load
  useEffect(() => {
    if (owner && repo) {
      fetchRepoContents();
    }
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Repository Explorer
          </h1>
          
          {/* Repository Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repository Owner
              </label>
              <input
                id="owner"
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="octocat"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="repo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repository Name
              </label>
              <input
                id="repo"
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="Hello-World"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={() => fetchRepoContents()}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Explore Repository'}
          </button>

          {!token && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ No GitHub token configured. Rate limits may apply for public repositories.
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border-l-4 border-red-500 p-4 m-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Repository Content */}
        {files.length > 0 && (
          <div className="flex h-full">
            {/* Sidebar - File Tree */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-4">
                {/* Breadcrumbs */}
                <div className="flex items-center space-x-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <button
                    onClick={() => fetchRepoContents()}
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {owner}/{repo}
                  </button>
                  {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span>/</span>
                      <button
                        onClick={() => handleBreadcrumbClick(index)}
                        className="hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {crumb}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Back Button */}
                {breadcrumbs.length > 0 && (
                  <button
                    onClick={goBack}
                    className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4"
                  >
                    <span>←</span>
                    <span>Back</span>
                  </button>
                )}

                {/* File List */}
                <div className="space-y-1">
                  {files.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => file.type === 'dir' ? handleFolderClick(file.path) : handleFileClick(file.path)}
                      className="flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-lg">{getFileIcon(file.name, file.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        {file.type === 'file' && file.size && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        )}
                      </div>
                      {file.type === 'dir' && (
                        <span className="text-gray-400">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
              {selectedFile ? (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {selectedFile.content || 'Binary file or content too large to display'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📁</div>
                    <p>Select a file to view its content</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositoryExplorer; 