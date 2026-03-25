---
name: relatedwork-finder
description: Find the related work papers in the relatedwork folder based on paper.md content.
---

# Related Work Finder Skill

This skill automatically finds the related work papers in the relatedwork folder based on the paper content.

## When to Use This Skill

- User requests to find relatedwork (e.g., "find related work")

## VibePaper Structure Rules

Before searching, read `writingrules.md` to understand the paper structure. The main paper file is `paper.md`.

## Instructions

Read `paper.md` to understand every section.

You need to search the web to find high-quality papers related to the insights claimed in `paper.md` and additional papers related to solutions for the challenges mentioned in `paper.md`.

The user can request you to find papers about a specific section in `paper.md`. You need to read that specific section and find related work for it.

You need to find papers that address problems in the same problem domain as the one mentioned in paper.md, even if they do not share the same insight. This will help provide a comprehensive view of the existing literature in the problem area.

You need to find papers that have similar insights but in different problem domains. This will help to check whether the insight has been discovered in other domains, which can also indicate the novelty of the insight in the context of the problem domain mentioned in paper.md.

You need to find papers that may contain alternative solutions to the challenges mentioned in paper.md. This will help to understand how other researchers have approached similar problems and whether the proposed insight offers a unique or more effective solution.

First, create a BibTeX file `paper_list.bib` under the `relatedwork` folder to list all the papers you have found, with their titles, authors, and publication venues.

Then, for each paper, generate a .md file that contains a detailed summary about the paper's insight, technology, and its connection to the insight or the challenges in the paper.md. This .md file should be located under the papers folder, a sub-folder of the relatedwork folder. The filename should be the corresponding bibtex key.

If the bibtext file already exists, you need to update it with the new papers you have found.

The user can provide you with some seed papers to start with. You need to make sure that these seed papers are included in the related work papers you find.

Write a summary.md that categorizes and summarizes all the related work papers you have found, highlighting their connections to the insight and challenges mentioned in paper.md.

When finished, respond to the user with "Found X related work papers in the relatedwork folder." Remove the created temporary files if any.

