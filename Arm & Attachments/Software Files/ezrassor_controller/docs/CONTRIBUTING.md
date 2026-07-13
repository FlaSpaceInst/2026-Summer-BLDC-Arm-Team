
# Contributing


## CONTRIBUTING NOTICE

This project is free and open-source under the `MIT license`.  *Anyone can fork this repository and submit a pull request, however all pull requests are subject to review and approval by this project's `authors`*.  All merged code becomes part of this project, and thus is subject to the same license as the rest of the code in this project.  Any code in this repository may be deleted, modified, or rewritten at any time. **Ultimately the authors of this project, the Florida Space Institute, and NASA have final control over this project's code.**  By submitting a pull request, you voluntarily surrender all the rights you possess over your code to the Florida Space Institute, NASA, and the authors of this project (with the good-faith expectation that your contributions will be adequately credited to you).  New authors may be named periodically, depending on contribution size and project demands.

Table of Contents:
- [Overview of GitHub](#overview-of-github)
- [Overview of Git](#overview-of-git)
    - [Pulling Updates](#pulling-updates)
    - [Pushing Updates](#pushing-updates)
    - [Branches](#branches)


---


## Overview of GitHub


### Editing the Source Code

You will need special editing permissions from FSI to edit the project on FSI's GitHub repo.

Otherwise, simply create a GitHub fork of the project.


---


## Overview of Git


### Pulling Updates

The command `git pull` is used to pull updates from GitHub.

However:

Each folder under the directory `src/` is a [Git submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules).  This means each of these modules lives in its own unique GitHub repo.  For example, `src/ezrassor_controller_server` actually lives here: [https://github.com/FlaSpaceInst/ezrassor_controller_server](https://github.com/FlaSpaceInst/ezrassor_controller_server).  This means that `ezrassor_controller_server` can be independently maintained and updated without affecting `src/ezrassor_sim_gazebo` or `src/ezrassor_sim_description` or even this very repo, [EZ-RASSOR-2.0](https://github.com/FlaSpaceInst/EZ-RASSOR-2.0).

This means you must take care to keep each submodules up-to-date.

You can either manually update each submodule:
```sh
(cd src/ezrassor_controller_server && git pull)
(cd src/ezrassor_sim_gazebo && git pull)
(cd src/ezrassor_sim_description && git pull)
# Etc...
```

Or you can update all submodules at once:
```sh
git submodule update --recursive
```

Some useful commands:
```sh
git fetch   # Fetch updates from GitHub.
git pull    # Fetch updates from GitHub and then switch to them immediately.
```


### Pushing Updates

In addition to pulling updates *from* GitHub, you need to push updates *to* GitHub.

In the world of Git, we push *commits* to and from GitHub.  The process of creating commits looks as follows:

1. Staging:
    1. Modify files (using a text editor, copy-and-paste, etc).
    1. Stage files for commit using `git add <filename>`.
    1. Repeat as many times as necessary (you may re-stage the same files as many times as you wish).
1. Committing:
    1. A "commit" simply records the updates made since the previous commit.

Note: We can create multiple commits before pushing them to GitHub.

Some useful commands:
```sh
git add <filename>  # Stage a modified file <filename> for the next commit.
git add .           # Stage all modified files in the project.
git status          # View what is currently staged.
git commit -m <msg> # Used what's staged to create a commit with message <msg>.
```

And then finally we push our changes:
```sh
git push origin <branch>    # Push new commit(s) on branch <branch> to GitHub.
```


### Branches

Avoid working directly on the `master` branch.  Always [create a new branch](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging) to work on!

Some useful commands for handling branches:

```sh
git pull                    # Update local branch with any changes found on GitHub.
git checkout <branch-name>  # Switch to the branch named <branch-name>.
git switch <branch-name>    # Switch to the branch named <branch-name>.
git branch <branch-name>    # Create new branch named <branch-name>.
git branch -D <branch-name> # Delete the branch named <branch-name>.
```

Note: In order to switch branches, you must first either commit or reset any changes on the current branch.
