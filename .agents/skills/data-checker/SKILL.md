---
name: data-checker
description: Checks for bogus/placeholder data in evaluation sections and verifies that each table and figure has a linked reproduction script that generates matching results.
---

# Data Checker Skill

This skill validates evaluation data authenticity by detecting bogus/placeholder data and ensuring every table and figure has a linked reproduction script that generates matching results.

## When to Use This Skill

- User requests to check data authenticity (e.g., "check for bogus data", "verify data reproducibility")
- User wants to ensure all results are reproducible
- User needs to verify scripts match reported results
- User wants to prepare for paper submission

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (start) | Primary analysis target — scan for bogus markers, tables, figures |
| `scripts/` | Conditional | Step 4-6 | Verify reproduction scripts exist and run correctly |
| Data files | Conditional | Step 6 | Verify script dependencies exist |
| `.agents/state.json` | Tool gap | Final step | Checker-result persistence is not currently exposed by the OpenCode plugin; do not edit state directly in plugin-based workflows |

Do NOT read `writingrules.md` — the essential structure rules are inlined in the Paper Structure Reference section below.

## Role and Responsibilities

You are an AI assistant performing data authenticity and reproducibility analysis. Your comments are AI-generated and must be clearly marked as such. Your analysis should be:
- **Thorough**: Check all tables, figures, and numbers
- **Strict**: Any placeholder data is a critical issue
- **Reproducible**: Verify every result has a reproduction script
- **Executable**: Actually run scripts and compare outputs
- **Transparent**: All comments must be explicitly marked as AI-generated

## Key Markers and Their Meanings

| Marker | Meaning | When to Use |
|--------|---------|-------------|
| `<!-- AI Comments:` | Start of AI-generated comment | ALWAYS use to begin every comment |
| `**AI-GENERATED DATA CHECK ANALYSIS - FOR AUTHOR REVIEW**` | Warning that content is AI-generated | ALWAYS include at the start of comment body |
| `[DATA ISSUE TYPE]` | Category of data problem | ALWAYS include to classify the issue |
| `[LOCATION]` | Where the issue is found | ALWAYS include with section name and exact quote |
| `[SEVERITY]` | How serious the issue is | ALWAYS include (Critical/Major/Minor) |
| `**END AI-GENERATED DATA CHECK ANALYSIS**` | End of AI analysis content | ALWAYS include before closing `-->` |

## Data Issue Types

### 1. Bogus/Placeholder Data Detected

**Definition**: Placeholder data markers found that indicate synthetic/unreal data.

| Type | Description | Example |
|------|-------------|---------|
| **⚠️ BOGUS Marker** | Explicit bogus data warning found | "⚠️ [BOGUS: 92.1%]" |
| **⚠️ TABLE Warning** | Table contains placeholder warning | "⚠️ TABLE CONTAINS BOGUS DATA" |
| **⚠️ FIGURE Warning** | Figure is placeholder | "⚠️ FIGURE PLACEHOLDER" |
| **⚠️ BOGUS Statistics** | Statistical results are placeholders | "⚠️ [BOGUS STATISTICS]" |
| **REPLACE WITH Warning** | Instruction to replace data | "REPLACE WITH REAL RESULT" |
| **Placeholder Numbers** | Numbers look like placeholders | "X%", "Y times", "Z ms" |

### 2. Missing Reproduction Script Link

**Definition**: Table or figure exists but no link to reproduction script.

| Type | Description | Example |
|------|-------------|---------|
| **Table Without Script Link** | Table has no script link | Table present, no reproduction script mentioned |
| **Figure Without Script Link** | Figure has no script link | Figure present, no generation script mentioned |
| **Script Link Broken** | Script link doesn't work | Link to script file is broken/missing |
| **Script Path Invalid** | Script path is incorrect | Referenced script doesn't exist at path |

### 3. Missing Reproduction Script

**Definition**: Script is linked but doesn't exist in the repository.

| Type | Description | Example |
|------|-------------|---------|
| **Script File Missing** | Script file not found | "See scripts/table1.py" but file doesn't exist |
| **Script Directory Missing** | Script directory not found | Referenced directory doesn't exist |
| **Script Not in Repo** | Script not in repository | No scripts/ directory or equivalent |

### 4. Script Execution Failure

**Definition**: Script exists but fails to run successfully.

| Type | Description | Example |
|------|-------------|---------|
| **Import Error** | Missing dependencies | ModuleNotFoundError |
| **Runtime Error** | Script crashes | Exception during execution |
| **File Not Found** | Missing data files | Script can't find required data |
| **Environment Error** | Environment not configured | Missing environment variables |

### 5. Script Output Mismatch

**Definition**: Script runs but output doesn't match reported results.

| Type | Description | Example |
|------|-------------|---------|
| **Number Mismatch** | Numbers differ | Reported: 92.1%, Script output: 91.8% |
| **Table Structure Mismatch** | Table format differs | Different rows/columns |
| **Missing Output** | Script doesn't produce expected output | No table output from script |
| **Format Mismatch** | Output format different | Script outputs CSV, table is markdown |
| **Significant Difference** | Results differ beyond acceptable tolerance | >1% difference in metrics |

### 6. Incomplete Reproduction Information

**Definition**: Script exists but reproduction information is incomplete.

| Type | Description | Example |
|------|-------------|---------|
| **Missing Random Seed** | Stochastic script, no seed specified | Random seed not mentioned |
| **Missing Data Source** | Data source not specified | Which dataset was used unclear |
| **Missing Parameters** | Script parameters not specified | How to run script unclear |
| **Missing Environment** | Environment requirements not specified | Python version, packages unclear |
| **Missing Dependencies** | Dependencies not listed | Requirements.txt missing |

### 7. Data Inconsistency

**Definition**: Data inconsistent across different parts of the paper.

| Type | Description | Example |
|------|-------------|---------|
| **Same Metric Different Values** | Metric X has value A here, value B there | DR = 92.1% in table, 91.8% in text |
| **Total Doesn't Match** | Sum of parts doesn't equal total | Components sum to 95%, total shown as 92% |
| **Percentage Sum Issue** | Percentages don't sum correctly | Categories sum to 110% |
| **Cross-Table Inconsistency** | Tables contradict each other | Table 1 shows X, Table 2 shows different X |

### 8. Missing Data Files

**Definition**: Data files referenced but not provided.

| Type | Description | Example |
|------|-------------|---------|
| **Dataset File Missing** | Dataset not provided | "dataset.csv" not in repository |
| **Results File Missing** | Results file not provided | "results.json" not found |
| **Configuration Missing** | Config file not provided | "config.yaml" missing |
| **Model File Missing** | Trained model not provided | "model.pkl" not available |

## Comment Structure

**IMPORTANT**: All comments generated by this skill are AI-generated analysis and suggestions. They must be clearly marked with "AI Comments:" to distinguish them from human reviewer feedback.

All Data Check Comments must follow this standardized format:

```
<!-- AI Comments: 
**AI-GENERATED DATA CHECK ANALYSIS - FOR AUTHOR REVIEW**

[DATA ISSUE TYPE]
<Type from the 8 categories above>

[LOCATION]
Section: <section name>
Text: "<exact quote of the problematic text>"

[PROBLEM DESCRIPTION]
<explanation of why this is a data authenticity/reproducibility problem>

[DETECTED ISSUE]
<specific description of the data concern>

[IMPACT]
<how this affects paper integrity>
- Paper submission: <can this be submitted?>
- Reproducibility: <can others reproduce?>
- Trust: <how does this affect credibility?>

[REQUIRED ACTION]
<concrete steps to fix the issue>
1. <specific action>
2. <specific action>

[VERIFICATION STEPS]
<how to verify the fix>
1. <verification step>
2. <verification step>

[SEVERITY]
Critical / Major / Minor
- Critical: Must fix before any submission (bogus data, missing scripts)
- Major: Important for reproducibility (script mismatch, missing info)
- Minor: Good to have but not blocking (minor inconsistencies)

**END AI-GENERATED DATA CHECK ANALYSIS**
-->
```

## Workflow

### Step 1: Scan for Bogus Data Markers

Search `paper.md` for:
1. ⚠️ BOGUS markers
2. "REPLACE WITH" instructions
3. Placeholder patterns (X%, Y times, Z ms)
4. ⚠️ TABLE/FIGURE warnings
5. BOGUS STATISTICS markers

### Step 2: Identify All Tables and Figures

From `paper.md`:
1. Find all markdown tables
2. Find all figure references
3. Find all numerical results in text
4. Note location of each data element

### Step 3: Check Reproduction Script Links

For each table/figure:
1. Is there a link to a reproduction script?
2. Is the link in proper format?
3. Is the script path clear?

**Expected format for script links**:
```markdown
**Table 1: Performance Comparison**
[Reproduction script: `scripts/table1_performance.py`]
```

or

```markdown
**Figure 1: Detection Rate Comparison**
[Generated by: `scripts/fig1_detection_rate.py`]
```

### Step 4: Verify Scripts Exist

For each linked script:
1. Check if file exists at specified path
2. Check if scripts/ directory exists
3. Check if repository has reproducibility artifacts

### Step 5: Check Script Information

For each script:
1. Is there a README or documentation?
2. Are dependencies specified?
3. Are parameters documented?
4. Is data source specified?
5. Are random seeds specified (for stochastic scripts)?

### Step 6: Execute Scripts

For each script:
1. Create isolated environment if needed
2. Install dependencies
3. Run the script
4. Capture output
5. Compare with reported results

**Comparison criteria**:
- Numbers must match within tolerance (0.01% for percentages)
- Table structure must match
- All reported values must be present

### Step 7: Compare Outputs

For each table/figure:
1. Parse script output
2. Parse reported table/figure data
3. Compare values
4. Flag mismatches

### Step 8: Check Data Consistency

Cross-reference:
1. Same metric in different locations
2. Sums and totals
3. Cross-table consistency
4. Text-to-table consistency

### Step 9: Generate Comments

For each issue found:
1. Classify the type (from 8 categories)
2. Quote the exact location
3. Explain the data concern
4. Describe impact
5. Provide required actions
6. List verification steps
7. Assign severity level

### Step 10: Provide Summary Report

Generate comprehensive data authenticity assessment.

## Paper Structure Reference

The paper follows VibePaper structure. Key rules for this checker:
- **Level 1-5** (`#` to `#####`): Structural headings only — no body text allowed under these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

### Key Sections to Check

1. **实验方案 Section**: What datasets are described? What metrics are defined? What baselines are compared?
2. **实验结果 Section**: What tables and figures contain data? Are there bogus markers? Are script links present?
3. **Tables and Figures**: Do all tables have reproduction script links? Do figures have generation scripts?
4. **Scripts and Data**: Do reproduction scripts exist? Do they run correctly? Do outputs match reported results?

## Reproduction Script Standards

### Required Script Elements

Every reproduction script should include:

**1. Header Documentation**
```python
#!/usr/bin/env python3
"""
Table 1: Performance Comparison
Generates the performance comparison table for Section X.Y

Usage:
    python scripts/table1_performance.py

Requirements:
    - Python 3.8+
    - pandas, numpy, matplotlib
    - Data: data/apt_dataset.csv

Output:
    - Prints markdown table to stdout
    - Saves results to results/table1.csv

Random seed: 42 (for reproducibility)
"""
```

**2. Dependencies**
- requirements.txt or environment.yml
- Clear version specifications

**3. Data Sources**
- Clear documentation of data files needed
- Data files should be in repository or download instructions provided

**4. Parameters**
- All parameters as constants at top of script
- Or loaded from config file

**5. Random Seeds**
- Explicit random seed setting for reproducibility
- Document seed value

**6. Output Format**
- Output should match paper format exactly
- Markdown tables for tables
- Image files for figures

### Script Directory Structure

```
project/
├── paper.md
├── scripts/
│   ├── README.md                    # Scripts documentation
│   ├── requirements.txt             # Python dependencies
│   ├── table1_performance.py        # Table 1 reproduction
│   ├── table2_ablation.py           # Table 2 reproduction
│   ├── fig1_detection_rate.py       # Figure 1 reproduction
│   ├── fig2_roc_curve.py            # Figure 2 reproduction
│   └── config.yaml                  # Shared configuration
├── data/
│   ├── dataset.csv                  # Dataset used
│   └── README.md                    # Data documentation
├── results/
│   ├── table1.csv                   # Raw results for Table 1
│   ├── table2.csv                   # Raw results for Table 2
│   └── figures/                     # Generated figures
│       ├── fig1.png
│       └── fig2.png
└── README.md                        # Overall reproducibility guide
```

### Example Reproduction Script

```python
#!/usr/bin/env python3
"""
Table 1: Overall Performance Comparison

Reproduces the main performance comparison table from the evaluation section.
This script loads experimental results and generates the markdown table.

Usage:
    python scripts/table1_performance.py

Output:
    - Prints markdown table to stdout
    - Saves CSV to results/table1.csv

Random seed: 42
"""

import pandas as pd
import numpy as np

# Configuration
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

# Data source
DATA_PATH = "data/experiment_results.csv"

# Methods to compare
METHODS = ["Snort", "OSSEC", "Random Forest", "LSTM", "HOLMES", "RAPID", "Our Method"]

def load_results():
    """Load experimental results from CSV."""
    return pd.read_csv(DATA_PATH)

def calculate_metrics(df):
    """Calculate metrics for each method."""
    results = []
    for method in METHODS:
        method_data = df[df['method'] == method]
        results.append({
            'Method': method,
            'Detection Rate (%)': round(method_data['dr'].mean() * 100, 1),
            'FPR (%)': round(method_data['fpr'].mean() * 100, 1),
            'MTTD (hours)': round(method_data['mttd'].mean(), 1),
            'Chain Accuracy (%)': round(method_data['chain_acc'].mean() * 100, 1)
        })
    return pd.DataFrame(results)

def format_markdown_table(df):
    """Format DataFrame as markdown table."""
    return df.to_markdown(index=False, floatfmt='.1f')

def main():
    # Load data
    df = load_results()
    
    # Calculate metrics
    results = calculate_metrics(df)
    
    # Save raw results
    results.to_csv('results/table1.csv', index=False)
    
    # Print markdown table
    print("**Table 1: Overall Performance Comparison**\n")
    print(format_markdown_table(results))
    print("\n[Generated by: `scripts/table1_performance.py`]")

if __name__ == "__main__":
    main()
```

## Output Format

### Summary Report

After analyzing the paper, provide a summary:

```markdown
## Data Authenticity and Reproducibility Assessment

**Paper**: [Paper title]

### Bogus Data Detection

**Bogus Data Found**: Yes / No

**Locations with Bogus Data**:
- [List all locations with markers]

**Total Bogus Markers**: X
- ⚠️ BOGUS markers: Y
- ⚠️ TABLE warnings: Z
- ⚠️ FIGURE warnings: W
- REPLACE instructions: V

### Tables Analysis

**Total Tables**: X
- Tables with script links: Y
- Tables without script links: Z
- Scripts verified: A
- Scripts mismatch: B

**Table Details**:
| Table | Location | Script Link | Script Exists | Script Output Match |
|-------|----------|-------------|---------------|---------------------|
| Table 1 | Section X.Y | Yes/No | Yes/No | Yes/No/Mismatch |
| ... | ... | ... | ... | ... |

### Figures Analysis

**Total Figures**: X
- Figures with script links: Y
- Figures without script links: Z
- Scripts verified: A
- Scripts mismatch: B

**Figure Details**:
| Figure | Location | Script Link | Script Exists | Script Output Match |
|--------|----------|-------------|---------------|---------------------|
| Figure 1 | Section X.Y | Yes/No | Yes/No | Yes/No/Mismatch |
| ... | ... | ... | ... | ... |

### Data Consistency

**Consistency Issues Found**: X
- Same metric different values: Y
- Total doesn't match: Z
- Cross-table inconsistency: W

### Reproducibility Score

**Overall Reproducibility**: High / Medium / Low

- Script coverage: X/Y tables and figures (Z%)
- Script execution success: X/Y (Z%)
- Output match rate: X/Y (Z%)

### Critical Issues (Must Fix Before Submission)

1. [Issue description]
2. [Issue description]

### Major Issues (Important for Reproducibility)

1. [Issue description]
2. [Issue description]

### Recommendations

**For Bogus Data**:
- Remove all placeholder markers
- Replace with real experimental results
- Re-run this checker to verify

**For Missing Scripts**:
- Create reproduction scripts for each table/figure
- Add script links in paper.md
- Test scripts on clean environment

**For Script Mismatches**:
- Verify script is using correct data
- Check for hardcoded values
- Ensure random seeds are set

### Repository Structure

**Recommended additions**:
- [ ] scripts/ directory with reproduction scripts
- [ ] requirements.txt for dependencies
- [ ] data/ directory with datasets
- [ ] results/ directory for script outputs
- [ ] README.md with reproducibility instructions
```

### Inline Comments

Insert detailed HTML comments at problematic locations following the comment structure defined above.


## Examples

For detailed comment examples, see [examples.md](examples.md) in this skill directory.

## Common Patterns

### Pattern 1: Checking for Bogus Data Markers

Search for all instances of:
- `⚠️ [BOGUS`
- `⚠️ TABLE CONTAINS BOGUS`
- `⚠️ FIGURE PLACEHOLDER`
- `REPLACE WITH`
- `⚠️ [BOGUS STATISTICS`
- Placeholder patterns: `X%`, `Y times`, `Z ms` (when used as variables)

### Pattern 2: Verifying Script Links

For each table/figure, check:
1. Is there a script link in any of these formats:
   - `[Reproduction script: path/to/script.py]`
   - `[Generated by: path/to/script.py]`
   - `Script: path/to/script.py`
   - Link in table caption
   
2. Is the path specific and correct?

### Pattern 3: Running Scripts Safely

When running reproduction scripts:
1. Use isolated environment
2. Check dependencies first
3. Set timeout for long-running scripts
4. Capture stdout and stderr
5. Handle errors gracefully

### Pattern 4: Comparing Results

When comparing script output to reported data:
1. Parse both into structured format
2. Compare each numeric value
3. Allow tolerance: 0.01 for percentages
4. Check structure matches (rows, columns)
5. Report specific mismatches

## Important Notes

1. **All comments are AI-generated**: Every comment inserted by this skill is generated by AI analysis and must be clearly marked with "AI Comments:". These are NOT human reviewer feedback and should not be treated as such.

2. **Zero tolerance for bogus data**: Any placeholder data is a critical issue that blocks submission.

3. **Reproducibility is essential**: Modern venues require reproducibility. Missing scripts are major issues.

4. **Scripts must match exactly**: Script output should match paper data precisely (within tolerance).

5. **Test in clean environment**: Scripts should work in a fresh environment, not just author's machine.

6. **Document everything**: Scripts need documentation, dependencies, parameters.

7. **Random seeds matter**: For stochastic methods, seeds must be specified and used.

8. **Data files needed**: If scripts need data files, those must be provided too.

9. **Consistency is critical**: Same metric should have same value everywhere (unless different experiments).

10. **Authors must verify**: AI can detect issues but authors must fix and verify.

## Detection Checklist

Use this checklist during analysis:

### Bogus Data Detection
- [ ] No ⚠️ BOGUS markers in paper
- [ ] No "REPLACE WITH" instructions
- [ ] No placeholder variables (X%, Y times)
- [ ] All numbers look real and specific
- [ ] No synthetic data warnings

### Script Link Verification
- [ ] All tables have script links
- [ ] All figures have script links
- [ ] Script paths are correct
- [ ] Script links are in proper format

### Script Existence
- [ ] All linked scripts exist
- [ ] scripts/ directory exists
- [ ] README for scripts exists
- [ ] Requirements/dependencies specified

### Script Execution
- [ ] All scripts run successfully
- [ ] No import errors
- [ ] No runtime errors
- [ ] No missing data files

### Output Matching
- [ ] Script outputs match reported tables
- [ ] Script outputs match reported figures
- [ ] Numbers match within tolerance
- [ ] Structure/format matches

### Data Consistency
- [ ] Same metric has same value everywhere
- [ ] Totals match sum of parts
- [ ] Percentages sum correctly
- [ ] No cross-table contradictions

### Reproducibility Information
- [ ] Random seeds specified
- [ ] Data sources documented
- [ ] Parameters documented
- [ ] Environment requirements documented
- [ ] Dependencies listed

### Repository Structure
- [ ] scripts/ directory present
- [ ] data/ directory present
- [ ] results/ directory present
- [ ] README with reproducibility instructions
- [ ] requirements.txt or environment.yml
