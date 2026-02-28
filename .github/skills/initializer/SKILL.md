---
name: initilizer
description: initialize the repository.
---

# Repository Initialization Skill

This skill initializes a new repository with the necessary structure, configuration files, and initial content to get started quickly.

## When to Use This Skill

- User requests to initialize a new repository (e.g., "Initialize repo", "初始化仓库")
- User wants to set up a standard project structure

## Review Approach

This skill currently provides three options for repository initialization: technical paper, nsfc proposal, and empirical paper. The user can choose one of them to initialize the repository with the corresponding structure and template files.
- initialize a technical paper
- initialize a nsfc proposal
- initialize an empirical paper
## Instructions

Copy the content of the corresponding template files into the root directory of the repository. The template files are located in the `templates` directory and are organized by type (e.g., `nsfc`, `technicalpaper`, `empiricalpaper`). Each template file contains the necessary structure and content for that type of project.
