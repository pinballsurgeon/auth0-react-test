import os
from pathlib import Path

try:
    import pathspec
except ImportError:
    print("The 'pathspec' library is required to run this script.")
    print("You can install it using pip:")
    print("    pip install pathspec")
    exit(1)

def load_gitignore(startpath):
    gitignore_path = Path(startpath) / '.gitignore'
    if not gitignore_path.exists():
        return None

    with gitignore_path.open('r', encoding='utf-8') as f:
        gitignore_content = f.read()

    spec = pathspec.PathSpec.from_lines('gitwildmatch', gitignore_content.splitlines())
    return spec

def generate_directory_tree_with_gitignore(startpath, output_file="directory_structure.txt"):
    spec = load_gitignore(startpath)

    with open(output_file, 'w', encoding='utf-8') as f:
        for root, dirs, files in os.walk(startpath):
            # Compute relative path from startpath
            rel_root = os.path.relpath(root, startpath)
            if rel_root == '.':
                rel_root = ''

            # Always exclude the .git directory
            if '.git' in dirs:
                dirs.remove('.git')

            # If a .gitignore is present, filter dirs and files
            if spec:
                # Prepare full paths for matching
                dirs_copy = dirs.copy()
                for d in dirs_copy:
                    dir_path = os.path.join(rel_root, d)
                    # Add a trailing slash to indicate it's a directory
                    if spec.match_file(dir_path + '/'):
                        dirs.remove(d)  # Exclude this directory

                files_copy = files.copy()
                for file in files_copy:
                    file_path = os.path.join(rel_root, file)
                    if spec.match_file(file_path):
                        files.remove(file)  # Exclude this file

            # Calculate the indentation level
            level = rel_root.count(os.sep)
            indent = ' ' * 4 * level
            # Write the directory name
            dir_name = os.path.basename(root) if rel_root else os.path.basename(startpath)
            f.write(f"{indent}{dir_name}/\n")
            # Write the file names
            sub_indent = ' ' * 4 * (level + 1)
            for file in files:
                f.write(f"{sub_indent}{file}\n")
    print(f"Directory structure has been saved to {output_file}")

if __name__ == "__main__":
    # Get the current working directory
    current_directory = Path.cwd()
    # Generate the directory tree considering .gitignore and excluding .git
    generate_directory_tree_with_gitignore(current_directory)
