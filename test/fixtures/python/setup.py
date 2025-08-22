#!/usr/bin/env python3
"""
Legacy setup.py for backward compatibility.

This setup.py exists for compatibility with older tools that don't support
pyproject.toml. The main configuration is in pyproject.toml.
"""

from setuptools import setup, find_packages
import os
import sys

# Ensure we're using a supported Python version
if sys.version_info < (3, 8):
    sys.exit('Error: Python 3.8 or later is required.')

# Read long description from README
def read_readme():
    """Read README file for long description."""
    readme_path = os.path.join(os.path.dirname(__file__), 'README.md')
    if os.path.exists(readme_path):
        with open(readme_path, 'r', encoding='utf-8') as f:
            return f.read()
    return "Test application for LSP CLI Python support"

# Read requirements
def read_requirements():
    """Read requirements from requirements.txt."""
    req_path = os.path.join(os.path.dirname(__file__), 'requirements.txt')
    requirements = []
    
    if os.path.exists(req_path):
        with open(req_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip comments and empty lines
                if line and not line.startswith('#'):
                    requirements.append(line)
    
    return requirements

# Development dependencies
dev_requirements = [
    'pytest>=7.4.0',
    'pytest-asyncio>=0.21.0',
    'pytest-cov>=4.1.0',
    'black>=23.3.0',
    'flake8>=6.0.0',
    'mypy>=1.4.0',
    'isort>=5.12.0'
]

# Documentation dependencies  
doc_requirements = [
    'sphinx>=7.0.0',
    'sphinx-rtd-theme>=1.2.0'
]

# Main setup configuration
setup(
    name='lsp-cli-test-app',
    version='1.0.0',
    description='Test application for LSP CLI Python support',
    long_description=read_readme(),
    long_description_content_type='text/markdown',
    author='Test Suite',
    author_email='test@example.com',
    maintainer='LSP CLI Team',
    maintainer_email='lsp-cli@example.com',
    url='https://github.com/example/lsp-cli-test-app',
    project_urls={
        'Documentation': 'https://lsp-cli-test-app.readthedocs.io/',
        'Source': 'https://github.com/example/lsp-cli-test-app',
        'Tracker': 'https://github.com/example/lsp-cli-test-app/issues',
    },
    license='MIT',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Topic :: Software Development :: Testing',
        'Typing :: Typed',
    ],
    keywords='lsp language-server python testing',
    python_requires='>=3.8',
    packages=find_packages(where='.', include=['src*']),
    package_dir={'': '.'},
    package_data={
        'src': ['*.json', '*.yaml', '*.yml', '*.toml'],
    },
    include_package_data=True,
    install_requires=read_requirements(),
    extras_require={
        'dev': dev_requirements,
        'docs': doc_requirements,
        'test': [
            'pytest>=7.4.0',
            'pytest-asyncio>=0.21.0',
            'pytest-cov>=4.1.0',
            'coverage[toml]>=7.2.0',
        ],
        'all': dev_requirements + doc_requirements,
    },
    entry_points={
        'console_scripts': [
            'lsp-test-app=src.main:main',
            'lsp-test-cli=src.main:main',
        ],
    },
    zip_safe=False,
    platforms=['any'],
)