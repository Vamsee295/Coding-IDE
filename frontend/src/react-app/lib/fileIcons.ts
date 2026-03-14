/**
 * STEP 1-10: Professional File Icon System
 * This implementation uses the local VS Code Material Icon Theme SVGs 
 * extracted from 'file-extension-icon-js' into /public/icons.
 */

// Common mappings extracted from material-icon-theme source
const fileExtensions: Record<string, string> = {
  js: "javascript",
  jsx: "react",
  ts: "typescript",
  tsx: "react_ts",
  json: "json",
  html: "html",
  htm: "html",
  css: "css",
  scss: "sass",
  sass: "sass",
  less: "less",
  md: "markdown",
  py: "python",
  java: "java",
  c: "c",
  cpp: "cpp",
  go: "go",
  rs: "rust",
  php: "php",
  sql: "database",
  sh: "console",
  bat: "console",
  env: "tune",
  svg: "svg",
  txt: "document",
  pdf: "pdf",
  zip: "zip",
  tar: "zip",
  gz: "zip",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  ico: "image",
  dockerignore: "docker",
  dockerfile: "docker",
};

const fileNames: Record<string, string> = {
  "package.json": "npm",
  "package-lock.json": "npm",
  "tsconfig.json": "tsconfig",
  "readme.md": "readme",
  "README.md": "readme",
  ".gitignore": "git",
  ".gitconfig": "git",
  ".env": "tune",
  "dockerfile": "docker",
  "Dockerfile": "docker",
  "docker-compose.yml": "docker",
  "docker-compose.yaml": "docker",
  "webpack.config.js": "webpack",
  "vite.config.ts": "vite",
  "vite.config.js": "vite",
};

const folderNames: Record<string, string> = {
  src: "src",
  source: "src",
  sources: "src",
  code: "src",
  dist: "dist",
  build: "dist",
  bin: "dist",
  node_modules: "node",
  public: "public",
  www: "public",
  wwwroot: "public",
  components: "components",
  views: "views",
  pages: "views",
  styles: "css",
  css: "css",
  assets: "resource",
  resources: "resource",
  static: "resource",
  images: "images",
  img: "images",
  icons: "images",
  config: "config",
  configs: "config",
  settings: "config",
  ".vscode": "vscode",
  ".git": "git",
  ".github": "github",
  ".gitlab": "gitlab",
  test: "test",
  tests: "test",
  __tests__: "test",
  lib: "lib",
  libs: "lib",
  hooks: "hook",
  hook: "hook",
};

export function getFileIconUrl(filename: string): string {
  // Check exact filename first (e.g., package.json)
  if (fileNames[filename]) {
    return `/icons/${fileNames[filename]}.svg`;
  }

  // Check extensions
  const parts = filename.split('.');
  if (parts.length > 1) {
    // Check multiple extensions like .d.ts or .js.map
    for (let i = 1; i < parts.length; i++) {
        const ext = parts.slice(i).join('.');
        if (fileExtensions[ext]) return `/icons/${fileExtensions[ext]}.svg`;
    }
    
    // Check simple extension
    const ext = parts.pop()?.toLowerCase() || "";
    if (fileExtensions[ext]) {
      return `/icons/${fileExtensions[ext]}.svg`;
    }
  }

  // Fallback to library-style default or generic document
  return `/icons/file.svg`;
}

export function getFolderIconUrl(folderName: string, isOpen: boolean): string {
  const name = folderName.toLowerCase();
  const iconBase = folderNames[name] || "folder";
  
  // Handling naming quirk from extraction (folder-folder.svg vs folder-folder-src.svg)
  const filename = (iconBase === "folder")
    ? (isOpen ? "folder-folder-open.svg" : "folder-folder.svg")
    : (isOpen ? `folder-folder-${iconBase}-open.svg` : `folder-folder-${iconBase}.svg`);
  
  return `/icons/${filename}`;
}
