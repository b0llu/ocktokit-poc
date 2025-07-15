'use client';

import { useState, useEffect, useRef } from 'react';
import { Octokit } from 'octokit';
import { ForwardRefEditor } from './ForwardRefEditor';
import { type MDXEditorMethods } from '@mdxeditor/editor';

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
  sha: string;
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

interface Branch {
  name: string;
  commit: {
    sha: string;
  };
  protected: boolean;
}

const RepositoryExplorer = () => {
  const [owner] = useState(process.env.NEXT_PUBLIC_GITHUB_OWNER || 'B0llu');
  const [repo] = useState(process.env.NEXT_PUBLIC_GITHUB_REPO || 'ocktokit-poc');
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [branchLoading, setBranchLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderContents, setFolderContents] = useState<Map<string, RepoFile[]>>(new Map());
  const [isMdxEditorMode, setIsMdxEditorMode] = useState(false);
  
  const mdxEditorRef = useRef<MDXEditorMethods>(null);

  const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';

  // Initialize Octokit instance
  const createOctokitInstance = () => {
    return new Octokit({
      auth: token || undefined,
    });
  };

  // Fetch repository branches
  const fetchBranches = async () => {
    try {
      setBranchLoading(true);
      setError(null);
      
      const octokit = createOctokitInstance();
      const response = await octokit.rest.repos.listBranches({
        owner,
        repo,
      });

      setBranches(response.data);
      
      // Set default branch if current selection doesn't exist
      const branchNames = response.data.map(b => b.name);
      if (!branchNames.includes(selectedBranch)) {
        const defaultBranch = branchNames.find(name => name === 'main' || name === 'master') || branchNames[0];
        if (defaultBranch) {
          setSelectedBranch(defaultBranch);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch branches');
    } finally {
      setBranchLoading(false);
    }
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
        ref: selectedBranch,
      });

      if (Array.isArray(response.data)) {
        const repoFiles = response.data as RepoFile[];
        
        // Filter to only show content folder at root level
        if (path === '') {
          const contentFolder = repoFiles.find(file => file.name === 'content' && file.type === 'dir');
          if (contentFolder) {
            setFiles([contentFolder]);
            // Auto-expand the content folder
            setExpandedFolders(new Set(['content']));
            // Fetch content folder contents immediately
            await fetchFolderContents('content');
          } else {
            setFiles([]);
            setError('No "content" folder found in this repository');
          }
        } else {
          // Store folder contents in the map
          setFolderContents(prev => new Map(prev.set(path, repoFiles)));
        }
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

  // Fetch folder contents for expand/collapse
  const fetchFolderContents = async (folderPath: string) => {
    try {
      const octokit = createOctokitInstance();
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: folderPath,
        ref: selectedBranch,
      });

      if (Array.isArray(response.data)) {
        setFolderContents(prev => new Map(prev.set(folderPath, response.data as RepoFile[])));
      }
    } catch (err) {
      console.error(`Failed to fetch contents for ${folderPath}:`, err);
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
        ref: selectedBranch,
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
          sha: fileData.sha,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file content');
    } finally {
      setLoading(false);
    }
  };

  // Handle folder expand/collapse
  const toggleFolder = async (folderPath: string) => {
    const newExpandedFolders = new Set(expandedFolders);
    
    if (expandedFolders.has(folderPath)) {
      // Collapse folder
      newExpandedFolders.delete(folderPath);
    } else {
      // Expand folder
      newExpandedFolders.add(folderPath);
      // Fetch contents if not already loaded
      if (!folderContents.has(folderPath)) {
        await fetchFolderContents(folderPath);
      }
    }
    
    setExpandedFolders(newExpandedFolders);
  };

  // Handle file click
  const handleFileClick = (filePath: string) => {
    setIsEditing(false);
    setIsMdxEditorMode(false);
    fetchFileContent(filePath);
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
      case 'mdx':
        return '📝✨'; // Special icon for MDX files
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

  // Check if file is MDX
  const isMdxFile = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.mdx');
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Render tree structure recursively
  const renderTreeItem = (file: RepoFile, depth: number = 0) => {
    const isExpanded = expandedFolders.has(file.path);
    const children = folderContents.get(file.path) || [];
    
    return (
      <div key={file.path}>
        <div
          onClick={() => file.type === 'dir' ? toggleFolder(file.path) : handleFileClick(file.path)}
          className="flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          style={{ paddingLeft: `${(depth + 1) * 16}px` }}
        >
          {file.type === 'dir' && (
            <span className="text-gray-400 text-xs w-3">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {file.type === 'file' && <span className="w-3"></span>}
          
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
        </div>
        
        {/* Render children if expanded */}
        {file.type === 'dir' && isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Initial load
  useEffect(() => {
    if (owner && repo) {
      const initializeRepo = async () => {
        await fetchBranches();
      };
      initializeRepo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch content when branches are loaded
  useEffect(() => {
    if (branches.length > 0 && selectedBranch) {
      fetchRepoContents();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, selectedBranch]);

  // Clear state when branch changes
  useEffect(() => {
    if (selectedBranch) {
      setExpandedFolders(new Set());
      setFolderContents(new Map());
      setSelectedFile(null);
      setIsEditing(false);
      setIsMdxEditorMode(false);
    }
  }, [selectedBranch]);

  // Save file content to GitHub (enhanced for MDX)
  const saveFileContent = async () => {
    if (!selectedFile || !token) {
      setError('GitHub token is required to save files');
      return;
    }

    if (!commitMessage.trim()) {
      setError('Commit message is required');
      return;
    }

    try {
      setSaveLoading(true);
      setError(null);
      
      const octokit = createOctokitInstance();
      
      // Get content from appropriate editor
      let contentToSave = editedContent;
      if (isMdxEditorMode && mdxEditorRef.current) {
        contentToSave = mdxEditorRef.current.getMarkdown();
      }
      
      // Encode content to base64
      const encodedContent = btoa(contentToSave);
      
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: selectedFile.path,
        message: commitMessage,
        content: encodedContent,
        sha: selectedFile.sha,
        branch: selectedBranch,
      });

      // Refresh the file content
      await fetchFileContent(selectedFile.path);
      setIsEditing(false);
      setIsMdxEditorMode(false);
      setCommitMessage('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaveLoading(false);
    }
  };

  // Start editing (enhanced for MDX)
  const startEditing = (useMdxEditor = false) => {
    if (selectedFile) {
      setEditedContent(selectedFile.content);
      setIsEditing(true);
      setIsMdxEditorMode(useMdxEditor);
      setCommitMessage(`Update ${selectedFile.name}`);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setIsMdxEditorMode(false);
    setEditedContent('');
    setCommitMessage('');
  };

  // Initial load
  useEffect(() => {
    if (owner && repo) {
      const initializeRepo = async () => {
        await fetchBranches();
      };
      initializeRepo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch content when branches are loaded
  useEffect(() => {
    if (branches.length > 0 && selectedBranch) {
      fetchRepoContents();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, selectedBranch]);

  // Clear state when branch changes
  useEffect(() => {
    if (selectedBranch) {
      setExpandedFolders(new Set());
      setFolderContents(new Map());
      setSelectedFile(null);
      setIsEditing(false);
      setIsMdxEditorMode(false);
    }
  }, [selectedBranch]);

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="bg-white dark:bg-gray-800 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {owner}/{repo}
              </h1>
              
              {/* Branch Selector */}
              <div className="flex items-center space-x-2">
                <label htmlFor="branch-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Branch:
                </label>
                <select
                  id="branch-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={branchLoading}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white text-sm"
                >
                  {branches.map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name} {branch.protected ? '🔒' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {(loading || branchLoading) && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Loading...</span>
                </div>
              )}
            </div>

            {!token && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ No token - editing disabled
              </p>
            )}
          </div>
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
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - File Tree */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="p-4">
              {/* Tree Header */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content Folder
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Click folders to expand/collapse
                </p>
              </div>

              {/* File Tree */}
              <div className="space-y-1">
                {files.length > 0 ? (
                  files.map((file) => renderTreeItem(file))
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <div className="text-2xl mb-2">📁</div>
                    <p className="text-sm">No content folder found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
            {selectedFile ? (
              <div className="h-full flex flex-col">
                {/* File Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </h3>
                    {isMdxFile(selectedFile.name) && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                        MDX
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(selectedFile.size)}
                    </div>
                    {!isEditing && token && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditing(false)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Edit Text
                        </button>
                        {isMdxFile(selectedFile.name) && (
                          <button
                            onClick={() => startEditing(true)}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            Edit MDX
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                {isEditing ? (
                  <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
                    {/* Commit Message */}
                    <div>
                      <label htmlFor="commit-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Commit Message
                      </label>
                      <input
                        id="commit-message"
                        type="text"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Describe your changes..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 flex overflow-hidden">
                      {isMdxEditorMode && isMdxFile(selectedFile.name) ? (
                        // Side-by-side MDX view
                        <div className="flex w-full h-full space-x-4">
                          {/* Preview Panel */}
                          <div className="flex-1 flex flex-col">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Preview
                            </h4>
                            <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                              <ForwardRefEditor
                                ref={mdxEditorRef}
                                markdown={selectedFile.content}
                                readOnly={false}
                                className="h-full"
                              />
                            </div>
                          </div>

                          {/* Source Panel */}
                          <div className="flex-1 flex flex-col">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Source
                            </h4>
                            <textarea
                              value={editedContent}
                              onChange={(e) => {
                                setEditedContent(e.target.value);
                                // Sync with MDX editor
                                if (mdxEditorRef.current) {
                                  mdxEditorRef.current.setMarkdown(e.target.value);
                                }
                              }}
                              className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-none"
                              placeholder="MDX content..."
                            />
                          </div>
                        </div>
                      ) : (
                        // Regular text editor
                        <div className="flex-1 flex flex-col">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            File Content
                          </label>
                          <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-none"
                            placeholder="File content..."
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={cancelEditing}
                        disabled={saveLoading}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveFileContent}
                        disabled={saveLoading || !commitMessage.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saveLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex-1 overflow-hidden p-4">
                    {isMdxFile(selectedFile.name) ? (
                      // MDX Preview Mode
                      <div className="h-full border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                        <ForwardRefEditor
                          markdown={selectedFile.content}
                          readOnly={true}
                          className="h-full"
                        />
                      </div>
                    ) : (
                      // Regular file view
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 h-full overflow-auto">
                        <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {selectedFile.content || 'Binary file or content too large to display'}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-4">📁</div>
                  <p>Select a file to view its content</p>
                  <p className="text-sm mt-2">MDX files will show rich preview and editing</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryExplorer; 